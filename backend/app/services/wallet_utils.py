# app/services/wallet_utils.py
from app.config import get_env
import aiohttp
import asyncio  # Added for delay

# Sepolia ERC-20 token contracts  
ERC20_TOKENS = {
    "USDC": {
        "contract": "0x14A3Fb98C14759169f998155ba4c31d1393D6D7c",  #own
        "decimals": 6
    },
    "LINK": {
        "contract": "0x779877A7B0D9E8603169DdbD7836e478b4624789",  # Sepolia LINK faucet token
        "decimals": 18
    }
}

ETHERSCAN_API_KEY = get_env("ETHERSCAN_API_KEY")
ETHERSCAN_BASE_URL = "https://api-sepolia.etherscan.io/api"

async def get_eth_balance(address: str, session) -> float:
    url = f"{ETHERSCAN_BASE_URL}?module=account&action=balance&address={address}&tag=latest&apikey={ETHERSCAN_API_KEY}"
    
    async with session.get(url) as response:
        data = await response.json()
        if data.get("status") == "1":
            wei_balance = int(data["result"])
            return wei_balance / 1e18
        else:
            raise Exception(f"Etherscan error: {data.get('message')}")

async def get_erc20_balance(address: str, contract_address: str, decimals: int, session: aiohttp.ClientSession) -> float:
    # Validate contract address format
    if not contract_address or not contract_address.startswith('0x') or len(contract_address) != 42:
        print(f"Invalid contract address format: {contract_address}")
        return 0.0
    
    url = f"{ETHERSCAN_BASE_URL}?module=account&action=tokenbalance&contractaddress={contract_address}&address={address}&tag=latest&apikey={ETHERSCAN_API_KEY}"
    
    try:
        async with session.get(url) as response:
            data = await response.json()
            print(f"Etherscan response for {contract_address}:", data)
            
            if data.get("status") == "1":
                raw_balance = int(data["result"])
                return raw_balance / (10 ** decimals)
            else:
                print(f"Etherscan error for {contract_address}: {data.get('message', 'Unknown error')}")
                return 0.0
    except Exception as e:
        print(f"Exception getting balance for {contract_address}: {e}")
        return 0.0

async def get_all_token_balances(address: str, session) -> dict:
    balances = {}
    
    print(f"Fetching token balances for {len(ERC20_TOKENS)} tokens...")
    
    for i, (token, info) in enumerate(ERC20_TOKENS.items()):
        # Add delay before each request (except the first one)
        if i > 0:
            print(f"Waiting 3 seconds before fetching {token} balance...")
            await asyncio.sleep(3)
        
        print(f"Fetching {token} balance from contract {info['contract']}...")
        
        # Validate contract address before making the call
        contract = info['contract']
        if not contract or not contract.startswith('0x') or len(contract) != 42:
            print(f"Skipping {token} - invalid contract address: {contract}")
            continue
            
        amount = await get_erc20_balance(address, contract, info["decimals"], session)
        
        if amount > 0:
            balances[token] = amount
            print(f"{token} balance: {amount}")
        else:
            print(f"{token} balance: 0 (or error)")
    
    print(f"Final balances: {balances}")
    return balances