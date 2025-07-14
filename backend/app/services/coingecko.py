import aiohttp

COINGECKO_API_URL = "https://api.coingecko.com/api/v3/simple/price"

# Map your token symbols to CoinGecko IDs
TOKEN_ID_MAP = {
    "ETH": "ethereum",
    "USDC": "usd-coin",
    "LINK": "chainlink"
}

async def fetch_token_prices(symbols: list[str]) -> dict:
    ids = ",".join(TOKEN_ID_MAP[symbol] for symbol in symbols if symbol in TOKEN_ID_MAP)

    params = {
        "ids": ids,
        "vs_currencies": "usd"
    }

    async with aiohttp.ClientSession() as session:
        async with session.get(COINGECKO_API_URL, params=params) as response:
            data = await response.json()
            #we will convert this to symbol-based dictionary
            return {
                symbol: data.get(TOKEN_ID_MAP[symbol], {}).get("usd", 0.0)
                for symbol in symbols
            }
