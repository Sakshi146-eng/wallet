import asyncio
from typing import Dict, Any
from web3 import Web3
from eth_account import Account
import json
import time

from app.config import get_env

# Configuration
NETWORK = get_env("NETWORK", "sepolia")
CHAIN_ID = int(get_env("CHAIN_ID", "11155111"))  # Sepolia
RPC_URL = get_env("RPC_URL")
PRIVATE_KEY = get_env("PRIVATE_KEY")

# Contract addresses on Sepolia testnet
SEPOLIA_CONTRACTS = {
    "USDC": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",  # Sepolia USDC
    "LINK": "0x779877A7B0D9E8603169DdbD7836e478b4624789",  # Sepolia LINK
    "WETH": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",  # Sepolia WETH
}

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Load account from private key
account = Account.from_key(PRIVATE_KEY) if PRIVATE_KEY else None

# ERC20 ABI (basic functions we need)
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    }
]


async def execute_rebalance_transaction(
    wallet_address: str, 
    trades: Dict[str, Any], 
    target_allocation: Dict[str, float]
) -> Dict[str, str]:
    """
    Execute portfolio rebalancing transactions on Sepolia testnet.
    
    This is a SIMULATION function for testnet demonstration.
    In production, this would integrate with DEX protocols like Uniswap.
    
    Args:
        wallet_address: Target wallet address
        trades: Dictionary of trades to execute
        target_allocation: Target allocation percentages
    
    Returns:
        Dictionary with transaction hash and gas information
    """
    try:
        if not account:
            raise Exception("Private key not configured")
        
        if not w3.is_connected():
            raise Exception("Failed to connect to Ethereum network")

        print(f"[INFO] Executing rebalance for wallet: {wallet_address}")
        print(f"[INFO] Target allocation: {target_allocation}")
        print(f"[INFO] Trades to execute: {trades}")

        # Get current nonce
        nonce = w3.eth.get_transaction_count(account.address)
        
        # For testnet simulation, we'll send a simple ETH transaction with data
        # that represents the rebalancing operation
        
        # Create transaction data encoding the rebalancing info
        rebalance_data = {
            "target_allocation": target_allocation,
            "trades": trades,
            "timestamp": int(time.time()),
            "wallet": wallet_address
        }
        
        # Convert to hex data for transaction
        data_string = json.dumps(rebalance_data)
        data_hex = "0x" + data_string.encode('utf-8').hex()
        
        # Get current gas price
        gas_price = w3.eth.gas_price
        
        # Create transaction (sending minimal ETH to self with rebalance data)
        transaction = {
            'to': account.address,  # Send to self for simulation
            'value': w3.to_wei(0.001, 'ether'),  # Minimal ETH amount
            'gas': 21000 + len(data_hex) * 16,  # Base gas + data gas
            'gasPrice': gas_price,
            'nonce': nonce,
            'data': data_hex,
            'chainId': CHAIN_ID
        }
        
        # Sign transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_hash_hex = tx_hash.hex()
        
        print(f"[SUCCESS] Rebalance transaction sent: {tx_hash_hex}")
        
        return {
            "tx_hash": tx_hash_hex,
            "gas_used": str(transaction['gas']),
            "gas_price": str(gas_price),
            "network": NETWORK,
            "status": "pending"
        }
        
    except Exception as e:
        print(f"[ERROR] Failed to execute rebalance transaction: {str(e)}")
        raise Exception(f"Transaction execution failed: {str(e)}")


async def get_transaction_status(tx_hash: str) -> str:
    """
    Check the status of a transaction on the blockchain.
    
    Args:
        tx_hash: Transaction hash to check
    
    Returns:
        Transaction status: 'pending', 'confirmed', or 'failed'
    """
    try:
        if not w3.is_connected():
            return "unknown"
        
        # Get transaction receipt
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            
            if receipt.status == 1:
                return "confirmed"
            else:
                return "failed"
                
        except Exception:
            # Transaction not yet mined
            try:
                # Check if transaction exists in mempool
                tx = w3.eth.get_transaction(tx_hash)
                if tx:
                    return "pending"
                else:
                    return "not_found"
            except Exception:
                return "not_found"
                
    except Exception as e:
        print(f"[ERROR] Failed to check transaction status: {str(e)}")
        return "unknown"


async def estimate_gas_fees(trades: Dict[str, Any]) -> str:
    """
    Estimate gas fees for the rebalancing transactions.
    
    Args:
        trades: Dictionary of trades to execute
    
    Returns:
        Estimated gas fees in ETH as string
    """
    try:
        if not w3.is_connected():
            return "0.001"  # Default estimate
        
        # Get current gas price
        gas_price = w3.eth.gas_price
        
        # Estimate gas needed based on number of trades
        base_gas = 21000  # Basic transaction
        trade_count = len(trades)
        
        # Each trade operation adds approximately 50,000 gas
        estimated_gas = base_gas + (trade_count * 50000)
        
        # Calculate total fee in ETH
        total_fee_wei = estimated_gas * gas_price
        total_fee_eth = w3.from_wei(total_fee_wei, 'ether')
        
        return f"{total_fee_eth:.6f}"
        
    except Exception as e:
        print(f"[ERROR] Failed to estimate gas fees: {str(e)}")
        return "0.001"  # Fallback estimate


async def get_token_balance_web3(token_address: str, wallet_address: str) -> float:
    """
    Get ERC20 token balance using Web3.
    
    Args:
        token_address: Contract address of the token
        wallet_address: Wallet address to check
    
    Returns:
        Token balance as float
    """
    try:
        if not w3.is_connected():
            raise Exception("Web3 not connected")
        
        # Create contract instance
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(token_address),
            abi=ERC20_ABI
        )
        
        # Get balance
        balance = contract.functions.balanceOf(
            Web3.to_checksum_address(wallet_address)
        ).call()
        
        # Get decimals
        decimals = contract.functions.decimals().call()
        
        # Convert to human readable format
        return balance / (10 ** decimals)
        
    except Exception as e:
        print(f"[ERROR] Failed to get token balance: {str(e)}")
        return 0.0


async def get_eth_balance_web3(wallet_address: str) -> float:
    """
    Get ETH balance using Web3.
    
    Args:
        wallet_address: Wallet address to check
    
    Returns:
        ETH balance as float
    """
    try:
        if not w3.is_connected():
            raise Exception("Web3 not connected")
        
        balance_wei = w3.eth.get_balance(Web3.to_checksum_address(wallet_address))
        balance_eth = w3.from_wei(balance_wei, 'ether')
        
        return float(balance_eth)
        
    except Exception as e:
        print(f"[ERROR] Failed to get ETH balance: {str(e)}")
        return 0.0


def validate_web3_connection() -> bool:
    """
    Validate Web3 connection and configuration.
    
    Returns:
        True if connection is valid, False otherwise
    """
    try:
        if not w3.is_connected():
            print("[ERROR] Web3 not connected to network")
            return False
        
        if not account:
            print("[ERROR] Account not configured")
            return False
        
        # Check network
        chain_id = w3.eth.chain_id
        if chain_id != CHAIN_ID:
            print(f"[WARNING] Chain ID mismatch. Expected: {CHAIN_ID}, Got: {chain_id}")
        
        print(f"[INFO] Web3 connected to {NETWORK} (Chain ID: {chain_id})")
        print(f"[INFO] Account address: {account.address}")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Web3 validation failed: {str(e)}")
        return False


# Initialize connection on import
if __name__ == "__main__":
    # Test connection
    is_valid = validate_web3_connection()
    print(f"Web3 connection valid: {is_valid}")
else:
    # Validate connection when module is imported
    validate_web3_connection()