from langchain_groq import ChatGroq
import aiohttp
from app.config import get_env
from langchain_core.messages import AIMessage 

from app.services.wallet_utils import get_eth_balance

groq_api_key = get_env("GROQ_API_KEY")

llm = ChatGroq(
    api_key=groq_api_key,
    model="llama3-70b-8192"  
)

prompt_template = """You are a crypto co-agent. You analyze wallet {wallet_address} activity and answer the user's request below.

User Input:
{user_prompt}

Wallet ETH balance: {eth_balance:.4f} ETH

Other Token Balances:
{token_balances}

Only respond with actionable DeFi advice based on market logic.
"""


#these are the function for agent response
from app.services.wallet_utils import get_eth_balance,get_all_token_balances,get_erc20_balance
from app.services.coingecko import fetch_token_prices
from app.services.logger import log_agent_interaction

async def run_agent(user_prompt: str, wallet_address: str) -> str:
    try:
        async with aiohttp.ClientSession() as session:
            eth_balance = await get_eth_balance(wallet_address, session)
            token_balances = {
                "USDC": await get_erc20_balance(
                    address=wallet_address,
                    contract_address="0xA0b8...48", decimals=6, session=session
                ),
                "LINK": await get_erc20_balance(
                    address=wallet_address,
                    contract_address="0x5149...ca", decimals=18, session=session
                )
            }

            final_prompt = prompt_template.format(
                wallet_address=wallet_address,
                user_prompt=user_prompt,
                eth_balance=eth_balance,
                token_balances="\n".join([f"{k}: {v:.2f}" for k, v in token_balances.items()])
            )

            result = llm.invoke(final_prompt)
            response_text = result.content if hasattr(result, "content") else str(result)

            # Log to MongoDB
            await log_agent_interaction({
                "wallet_address": wallet_address,
                "user_prompt": user_prompt,
                "agent_response": response_text,
                "eth_balance": eth_balance,
                "usd_values": await fetch_token_prices(["ETH", "USDC", "LINK"]),
            })

            return response_text

    except Exception as e:
        print(f"[AGENT ERROR] {e}")
        return "Agent failed internally."
