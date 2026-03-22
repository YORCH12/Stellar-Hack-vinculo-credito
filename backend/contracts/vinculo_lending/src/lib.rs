//! VinculoLending — préstamos según tier del SBT (`vinculo_sbt`).
//!
//! Vive en `backend/contracts/vinculo_lending/` junto a `vinculo_sbt` y `staking_pool`.
//! Consulta on-chain el nivel con `VinculoSBTClient::get_tier` (alineado al `vinculo_sbt` actual).
//!
//! Modo demo (hackathon): 1 “mes” de plazo = 60 segundos de ledger, igual que `staking_pool`.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};
use vinculo_sbt::VinculoSBTClient;

// ─── Storage ─────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Token,
    Sbt,
    Loan(Address),
}

#[contracttype]
#[derive(Clone, Default)]
pub struct Loan {
    /// Principal desembolsado (sin intereses).
    pub principal: i128,
    /// Principal + intereses pendientes de pago.
    pub total_owed: i128,
    pub due_timestamp: u64,
    pub months: u64,
    pub apy_bps: u64,
}

#[contract]
pub struct VinculoLending;

#[contractimpl]
impl VinculoLending {
    /// Guarda dirección del token (SAC / Soroban token) y del contrato `VinculoSBT`.
    pub fn init_lending(env: Env, token: Address, sbt: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Sbt, &sbt);
    }

    /// Aporta liquidez al pool de préstamos (el `from` transfiere al contrato).
    pub fn fund_pool(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be > 0");

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("init not called");
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&from, &env.current_contract_address(), &amount);
    }

    /// Solicita préstamo: lee tier en `vinculo_sbt`, valida tope y liquidez, transfiere al usuario.
    pub fn request_loan(env: Env, user: Address, amount: i128, months: u64) {
        // 1. El usuario debe firmar la transacción
        user.require_auth();

        // Validaciones sin panic! — errores descriptivos
        if amount <= 0 {
            panic!("amount must be > 0");
        }
        if months != 1 && months != 3 && months != 6 && months != 12 {
            panic!("invalid term: must be 1, 3, 6 or 12 months");
        }

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .unwrap_or_else(|| panic!("lending not initialized: token missing"));
        let sbt_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Sbt)
            .unwrap_or_else(|| panic!("lending not initialized: sbt missing"));

        // 2. Consultamos la reputación (SBT) — match seguro, NO panic en tier 4
        let sbt_client = VinculoSBTClient::new(&env, &sbt_addr);
        let tier = sbt_client.get_tier(&user);

        // ✅ Cobertura EXPLÍCITA de todos los tiers incluido 4 (Platino)
        let max = match tier {
            1 => 300_000_000_i128,    // Plata    — 30 XLM  (300 * 10^7 stroops)
            2 => 600_000_000_i128,    // Oro      — 60 XLM
            3 => 1_500_000_000_i128,  // Diamante — 150 XLM
            4 => 5_000_000_000_i128,  // Platino  — 500 XLM
            _ => panic!("no valid SBT tier for credit: tier = {}", tier),
        };

        // 3. Sin préstamo activo previo
        let existing: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(user.clone()))
            .unwrap_or_default();
        if existing.total_owed > 0 {
            panic!("active loan already exists");
        }

        // 4. Validamos monto contra límite del tier
        if amount > max {
            panic!("amount {} exceeds tier {} limit {}", amount, tier, max);
        }

        // 5. Verificamos liquidez del pool
        let token_client = token::Client::new(&env, &token_addr);
        let this = env.current_contract_address();
        let pool_balance = token_client.balance(&this);
        if pool_balance < amount {
            panic!("insufficient pool liquidity: pool={} requested={}", pool_balance, amount);
        }

        // 6. Interés fijo del 5%
        let interest = (amount * 5) / 100;
        let total_owed = amount + interest;
        let apy_bps = apy_bps_for_tier(tier);

        // 7. Transferencia segura — si falla, la tx revierte con error legible
        token_client.transfer(&this, &user, &amount);

        // 8. Guardamos el préstamo
        let duration_secs = months * 60;
        let due = env.ledger().timestamp() + duration_secs;
        let loan = Loan {
            principal: amount,
            total_owed,
            due_timestamp: due,
            months,
            apy_bps,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Loan(user.clone()), &loan);
    }

    /// Abona al préstamo (total o parcial). El excedente no se acepta.
    pub fn repay(env: Env, user: Address, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "amount must be > 0");

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("init not called");

        let mut loan: Loan = env
            .storage()
            .persistent()
            .get(&DataKey::Loan(user.clone()))
            .unwrap_or_default();
        assert!(loan.total_owed > 0, "no active loan");

        let pay = amount.min(loan.total_owed);
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&user, &env.current_contract_address(), &pay);

        loan.total_owed -= pay;
        if loan.total_owed == 0 {
            loan = Loan::default();
        }
        env.storage()
            .persistent()
            .set(&DataKey::Loan(user.clone()), &loan);
    }

    pub fn get_loan(env: Env, user: Address) -> Loan {
        env.storage()
            .persistent()
            .get(&DataKey::Loan(user))
            .unwrap_or_default()
    }

    /// Saldo del token en custodia del contrato (liquidez disponible para desembolsos).
    pub fn get_pool_balance(env: Env) -> i128 {
        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .expect("init not called");
        let token_client = token::Client::new(&env, &token_addr);
        token_client.balance(&env.current_contract_address())
    }
}

// 1 XLM = 10_000_000 stroops
// Esta función ya no se usa directamente (el match vive en request_loan)
// Se mantiene por compatibilidad con tests externos.
fn max_principal_for_tier(tier: u32) -> i128 {
    match tier {
        1 => 300_000_000_i128,    // Plata    — 30 XLM
        2 => 600_000_000_i128,    // Oro      — 60 XLM
        3 => 1_500_000_000_i128,  // Diamante — 150 XLM
        4 => 5_000_000_000_i128,  // Platino  — 500 XLM
        _ => 0,
    }
}

/// APY anual expresado en “puntos base” sobre 10000 (ej. 1200 = 12 % anual).
/// Interés sobre el plazo: `(principal * apy_bps * months) / 1200` (misma convención que staking).
fn apy_bps_for_tier(tier: u32) -> u64 {
    match tier {
        1 => 1_200, // 12%
        2 => 800,   // 8%
        3 => 500,   // 5%
        4 => 400,   // 4%
        _ => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn request_and_repay_loan() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(admin.clone());
        let sbt_id = env.register_contract(None, vinculo_sbt::VinculoSBT);
        let sbt = VinculoSBTClient::new(&env, &sbt_id);
        sbt.init(&admin);
        sbt.mint(&admin, &user, &2);

        let lending_id = env.register_contract(None, VinculoLending);
        let lending = VinculoLendingClient::new(&env, &lending_id);
        lending.init(&token_id, &sbt_id);

        let token = token::Client::new(&env, &token_id);
        token.mint(&lending_id, &10_000);

        // Pedimos 600 porque es el máximo de Nivel 2 (Oro)
        lending.request_loan(&user, &600, &3);
        let loan = lending.get_loan(&user);
        assert!(loan.total_owed > 600);
        assert_eq!(loan.principal, 600);

        token.mint(&user, &loan.total_owed);
        lending.repay(&user, &loan.total_owed);
        assert_eq!(lending.get_loan(&user).total_owed, 0);
    }
}