
from app.config import get_env
import aiohttp

ERC20_TOKENS = {
    "USDC": {
        "contract": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "decimals": 6
    },
    "DAI": {
        "contract": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "decimals": 18
    },
    "LINK": {
        "contract": "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        "decimals": 18
    }
}

ETHERSCAN_API_KEY = get_env("ETHERSCAN_API_KEY")
ETHERSCAN_BASE_URL = "https://api.etherscan.io/api"

async def get_eth_balance(address: str, session) -> float:
    url = f"{ETHERSCAN_BASE_URL}?module=account&action=balance&address={address}&tag=latest&apikey={ETHERSCAN_API_KEY}"
    
    async with session.get(url) as response:
        data = await response.json()
        if data.get("status") == "1":
            wei_balance = int(data["result"])
            return wei_balance / 1e18
        else:
            raise Exception(f"Etherscan error: {data.get('message')}")


async def get_erc20_balance(address: str, contract_address: str, decimals: int, session:aiohttp.ClientSession) -> float:
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



