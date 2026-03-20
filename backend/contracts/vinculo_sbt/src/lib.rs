//! VinculoSBT — Soulbound Token de Reputación en Soroban (Stellar)
//!
//! Un Soulbound Token (SBT) es un NFT intransferible. Este contrato
//! asigna un "nivel" (tier) de reputación a cada usuario:
//!   Tier 1 = Bronce  |  Tier 2 = Plata  |  Tier 3 = Oro
//!
//! Solo el administrador autorizado puede emitir o actualizar insignias.
//! No existe función de transferencia: los tokens son inherentemente intransferibles.

#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};

// ─── Clave de almacenamiento del admin ────────────────────────────────────────

/// Clave fija para guardar la Address del administrador en instance storage.
/// `symbol_short!` genera un Symbol de hasta 9 caracteres en tiempo de compilación.
const ADMIN_KEY: Symbol = symbol_short!("admin");

// ─── Definición del contrato ──────────────────────────────────────────────────

#[contract]
pub struct VinculoSBT;

#[contractimpl]
impl VinculoSBT {
    // ── Inicialización ─────────────────────────────────────────────────────────

    /// Inicializa el contrato registrando al administrador.
    ///
    /// Debe llamarse una sola vez después del deploy. El `admin` es la
    /// Address de nuestro backend; solo él podrá emitir insignias.
    pub fn initialize(env: Env, admin: Address) {
        // Instance storage: persiste mientras exista la instancia del contrato.
        env.storage().instance().set(&ADMIN_KEY, &admin);
    }

    // ── Emisión de insignia ────────────────────────────────────────────────────

    /// Emite o actualiza la insignia de reputación de un usuario (Soulbound).
    ///
    /// * `admin` — debe coincidir con el admin registrado y firmar la tx.
    /// * `user`  — destinatario del badge (es intransferible por diseño del contrato).
    /// * `tier`  — 1 (Bronce), 2 (Plata) o 3 (Oro).
    ///
    /// Al ser Soulbound, este contrato nunca expone función de transferencia.
    pub fn mint_badge(env: Env, admin: Address, user: Address, tier: u32) {
        // 1. Exigir que el `admin` haya firmado criptográficamente la transacción.
        //    Soroban valida la firma antes de ejecutar cualquier lógica posterior.
        admin.require_auth();

        // 2. Verificar que quien llama coincide con el admin registrado en deploy.
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Contract not initialized: call initialize() first");

        if admin != stored_admin {
            panic!("Unauthorized: caller is not the registered admin");
        }

        // 3. Validar que el tier sea un valor reconocido (1, 2 o 3).
        if !(1..=3).contains(&tier) {
            panic!("Invalid tier: must be 1 (Bronze), 2 (Silver), or 3 (Gold)");
        }

        // 4. Guardar el tier del usuario en persistent storage.
        //    La Address del usuario actúa directamente como clave única en el mapa.
        //    Persistent storage sobrevive al TTL extendido: ideal para reputación a largo plazo.
        env.storage().persistent().set(&user, &tier);
    }

    // ── Consulta de insignia ───────────────────────────────────────────────────

    /// Devuelve el tier de reputación actual del usuario.
    ///
    /// Retorna `0` si el usuario no tiene ningún badge asignado todavía,
    /// lo que permite lógica condicional exterior sin necesidad de Option.
    pub fn get_badge(env: Env, user: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&user)
            .unwrap_or(0) // 0 = sin badge → no confundir con Bronce (1)
    }
}

// ─── Tests unitarios ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    /// Flujo feliz: initialize → get_badge (sin badge) → mint_badge → get_badge → actualizar tier.
    #[test]
    fn test_initialize_and_mint_badge() {
        let env = Env::default();
        env.mock_all_auths(); // simula firmas válidas en el entorno de test

        let contract_id = env.register_contract(None, VinculoSBT);
        let client = VinculoSBTClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        // Inicializar contrato con el admin
        client.initialize(&admin);

        // Sin badge asignado → debe devolver 0
        assert_eq!(client.get_badge(&user), 0);

        // Emitir badge Oro (tier 3)
        client.mint_badge(&admin, &user, &3);
        assert_eq!(client.get_badge(&user), 3);

        // Actualizar a Bronce (tier 1): el admin puede reasignar el tier
        client.mint_badge(&admin, &user, &1);
        assert_eq!(client.get_badge(&user), 1);
    }

    /// El tier 0 y el tier 99 deben causar panic con "Invalid tier".
    #[test]
    #[should_panic(expected = "Invalid tier")]
    fn test_invalid_tier_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VinculoSBT);
        let client = VinculoSBTClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        client.initialize(&admin);
        client.mint_badge(&admin, &user, &99); // tier inválido → panic
    }

    /// Dos usuarios distintos tienen tiers independientes.
    #[test]
    fn test_multiple_users_independent_tiers() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VinculoSBT);
        let client = VinculoSBTClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user_a = Address::generate(&env);
        let user_b = Address::generate(&env);

        client.initialize(&admin);
        client.mint_badge(&admin, &user_a, &2); // Plata
        client.mint_badge(&admin, &user_b, &3); // Oro

        assert_eq!(client.get_badge(&user_a), 2);
        assert_eq!(client.get_badge(&user_b), 3);
    }
}
