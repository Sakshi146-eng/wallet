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
            "ETH": await get_eth_balance(address,session),
            "USDC": await get_erc20_balance(address, contract_address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals=6,session=session),
            "LINK": await get_erc20_balance(address, contract_address="0x514910771af9ca656af840dff83e8264ecf986ca", decimals=18,session=session),
        }

        # now we will get live usd price for the coin
        prices = await fetch_token_prices(list(balances.keys()))

        usd_value = {
            symbol: round(balances[symbol] * prices[symbol], 2)
            for symbol in balances
        }

        return {
            "address": address,
            "balances": balances,
            "usd_value": usd_value,
            "network": "Ethereum Mainnet"
        }

