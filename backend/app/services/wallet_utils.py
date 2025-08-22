# app/services/wallet_utils.py
from app.config import get_env
import aiohttp

# Sepolia ERC-20 token contracts
ERC20_TOKENS = {
    "USDC": {
        "contract": "0x14A3Fb98C14759169f998155ba4c31d1393D6D7c",  # my created/mined test usdc
        "decimals": 6
    },
    "LINK": {
        "contract": "0x779877A7B0D9E8603169DdbD7836e478b4624789",  # Sepolia LINK
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
    url = f"{ETHERSCAN_BASE_URL}?module=account&action=tokenbalance&contractaddress={contract_address}&address={address}&tag=latest&apikey={ETHERSCAN_API_KEY}"
    
    async with session.get(url) as response:
        data = await response.json()
        if data.get("status") == "1":
            raw_balance = int(data["result"])
            return raw_balance / (10 ** decimals)
        else:
            return 0.0

async def get_all_token_balances(address: str, session) -> dict:
    balances = {}
    for token, info in ERC20_TOKENS.items():
        amount = await get_erc20_balance(address, info["contract"], info["decimals"], session)
        if amount > 0:
            balances[token] = amount
    return balances
