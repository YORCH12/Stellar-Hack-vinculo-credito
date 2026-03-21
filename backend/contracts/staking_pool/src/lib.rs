#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

// Definimos las claves para guardar datos en el almacenamiento del contrato
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Token,             // Guardará la dirección del token XLM
    Balance(Address),  // Saldo disponible de un usuario
    Stake(Address),    // Información del staking de un usuario
}

// Estructura para guardar cuánto tiene stakeado un usuario y cuándo se libera
#[contracttype]
#[derive(Clone, Default)]
pub struct StakeInfo {
    pub amount: i128,
    pub unlock_time: u64,
}

#[contract]
pub struct StakingContract;

#[contractimpl]
impl StakingContract {
    // 1. Inicializa el contrato con el contrato del token (XLM)
    pub fn init(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
    }

    // 2. Recibir XLM (Depósito)
    pub fn deposit(env: Env, user: Address, amount: i128) {
        user.require_auth(); // Verifica que el usuario firmó la transacción
        assert!(amount > 0, "El monto debe ser mayor a 0");

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token_addr);
        
        // Transfiere de la billetera del usuario al contrato
        client.transfer(&user, &env.current_contract_address(), &amount);

        // Actualiza el saldo interno disponible
        let mut balance: i128 = env.storage().persistent().get(&DataKey::Balance(user.clone())).unwrap_or(0);
        balance += amount;
        env.storage().persistent().set(&DataKey::Balance(user.clone()), &balance);
    }

    // 3. Enviar XLM (Retiro)
    pub fn withdraw(env: Env, user: Address, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "El monto debe ser mayor a 0");

        let mut balance: i128 = env.storage().persistent().get(&DataKey::Balance(user.clone())).unwrap_or(0);
        assert!(balance >= amount, "Saldo disponible insuficiente");

        // Descuenta el saldo
        balance -= amount;
        env.storage().persistent().set(&DataKey::Balance(user.clone()), &balance);

        // Transfiere del contrato a la billetera del usuario
        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &user, &amount);
    }

    // 4. Hacer Staking
    pub fn stake(env: Env, user: Address, amount: i128, months: u64) {
        user.require_auth();
        assert!(amount > 0, "El monto debe ser mayor a 0");
        assert!(months == 1 || months == 3 || months == 6 || months == 12, "Duracion invalida. Opciones: 1, 3, 6, 12");

        let mut stake_info: StakeInfo = env.storage().persistent().get(&DataKey::Stake(user.clone())).unwrap_or_default();
        assert!(stake_info.amount == 0, "Ya tienes un stake activo. Haz unstake primero.");

        let mut balance: i128 = env.storage().persistent().get(&DataKey::Balance(user.clone())).unwrap_or(0);
        assert!(balance >= amount, "Saldo disponible insuficiente para stakear");

        // Mover fondos de disponible a stakeado
        balance -= amount;
        env.storage().persistent().set(&DataKey::Balance(user.clone()), &balance);

        // Calcular tiempo de desbloqueo (1 mes = 30 dias = 2,592,000 segundos)
        let duration_secs = months * 2_592_000;
        let current_time = env.ledger().timestamp(); // Tiempo actual de la blockchain
        
        stake_info.amount = amount;
        stake_info.unlock_time = current_time + duration_secs;
        env.storage().persistent().set(&DataKey::Stake(user.clone()), &stake_info);
    }

    // 5. Retirar del Staking (Unstake)
    pub fn unstake(env: Env, user: Address) {
        user.require_auth();
        
        let mut stake_info: StakeInfo = env.storage().persistent().get(&DataKey::Stake(user.clone())).unwrap_or_default();
        assert!(stake_info.amount > 0, "No tienes fondos en stake");

        let current_time = env.ledger().timestamp();
        assert!(current_time >= stake_info.unlock_time, "El periodo de staking aun no termina");

        // Regresar fondos al saldo disponible
        let amount_to_return = stake_info.amount;
        stake_info.amount = 0;
        stake_info.unlock_time = 0;
        env.storage().persistent().set(&DataKey::Stake(user.clone()), &stake_info);

        let mut balance: i128 = env.storage().persistent().get(&DataKey::Balance(user.clone())).unwrap_or(0);
        balance += amount_to_return;
        env.storage().persistent().set(&DataKey::Balance(user.clone()), &balance);
    }

    // 6. Consultar saldo disponible
    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(user)).unwrap_or(0)
    }

    // 7. Consultar información del staking (monto y tiempo)
    pub fn get_stake(env: Env, user: Address) -> StakeInfo {
        env.storage().persistent().get(&DataKey::Stake(user)).unwrap_or_default()
    }
}