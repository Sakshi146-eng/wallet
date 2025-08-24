from fastapi import APIRouter
from app.models.response_schemas import WalletInfoResponse
from app.services.wallet_utils import get_eth_balance,get_erc20_balance


import aiohttp

router = APIRouter()
from app.services.coingecko import fetch_token_prices

@router.get("/wallet/info")
async def get_wallet_info(address: str):
    async with aiohttp.ClientSession() as session:
        #Fetch live ETH + ERC-20 token balances
            
        balances = {
    "ETH": await get_eth_balance(address, session),
    "USDC": await get_erc20_balance(
        address,
        contract_address="0x14A3Fb98C14759169f998155ba4c31d1393D6D7c", # own
        decimals=6,
        session=session
    ),
    "LINK": await get_erc20_balance(
        address,
        contract_address="0x779877A7B0D9E8603169DdbD7836e478b4624789", # Sepolia LINK
        decimals=18,
        session=session
    ),
}


        # now we will get live usd price for the coin
        prices = await fetch_token_prices(list(balances.keys()))

        usd_value = {
            symbol: round(balances[symbol] * prices[symbol], 2)
            for symbol in balances
        }
        
        print(f"this is the balances:{balances}")

        return {
            "address": address,
            "balances": balances,
            "usd_value": usd_value,
            "network": "Sepolia testnet"
        }
    