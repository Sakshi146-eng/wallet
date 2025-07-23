from langchain_groq import ChatGroq
import aiohttp
from app.config import get_env
from langchain_core.messages import AIMessage 

groq_api_key = get_env("GROQ_API_KEY")

llm = ChatGroq(
    api_key=groq_api_key,
    model="llama3-70b-8192"  
)

prompt_template = """Your name is Walli-a crypto co-agent. You analyze wallet {wallet_address} activity and answer the user's request below.

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

from datetime import datetime,timezone

from app.db.mongo import agent_logs

async def run_agent(user_prompt: str, wallet_address: str) -> str:
    print("[AGENT] Invoked")
    try:
        async with aiohttp.ClientSession() as session:
            try:
                # Try live balance fetch
                print("[AGENT] Fetching balances from live sources")
                eth_balance = await get_eth_balance(wallet_address, session)

                usdc = await get_erc20_balance(
                    address=wallet_address,
                    contract_address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 
                    decimals=6,
                    session=session
                )

                link = await get_erc20_balance(
                    address=wallet_address,
                    contract_address="0x514910771af9ca656af840dff83e8264ecf986ca",  
                    decimals=18,
                    session=session
                )

                token_balances = {
                    "USDC": usdc,
                    "LINK": link
                }

                usd_values = await fetch_token_prices(["ETH", "USDC", "LINK"])

            except Exception as e:
                print(f"[AGENT] Live balance fetch failed: {e}")
                #Fallback to mongo db 
                last_log = await agent_logs.find_one(
                    {"wallet_address": wallet_address},
                    sort=[("timestamp", -1)]
                )

                if not last_log:
                    raise Exception("No cached balance found in MongoDB.")

                print("[AGENT] Using fallback from MongoDB")
                eth_balance = last_log.get("eth_balance", 0.0)
                usd_values = last_log.get("usd_values", {})
                token_balances = {
                    "USDC": usd_values.get("USDC", 0.0),
                    "LINK": usd_values.get("LINK", 0.0)
                }

            #Build prompt
            prompt = prompt_template.format(
                wallet_address=wallet_address,
                user_prompt=user_prompt,
                eth_balance=eth_balance,
                token_balances="\n".join([f"{k}: {v:.2f}" for k, v in token_balances.items()])
            )

            print("[AGENT] Sending prompt to Groq...")
            result = await llm.ainvoke(prompt)
            print("Groq response:", result)

            response_text = result.content if isinstance(result, AIMessage) else str(result)

            #Log agent interaction
            await log_agent_interaction({
                "wallet_address": wallet_address,
                "user_prompt": user_prompt,
                "agent_response": response_text,
                "eth_balance": eth_balance,
                "usd_values": usd_values,
                "timestamp": datetime.now(timezone.utc)
            })

            return response_text

    except Exception as e:
        print(f"[AGENT ERROR] {e}")
        return None  # triggers fallback intent parser




    

