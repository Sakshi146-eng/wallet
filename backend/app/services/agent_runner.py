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
from app.services.wallet_utils import get_eth_balance, get_all_token_balances

async def run_agent(user_prompt: str, wallet_address: str) -> str:
    try:
        async with aiohttp.ClientSession() as session:
            #Fetch live ETH + ERC-20 token balances
            eth_balance = await get_eth_balance(wallet_address, session)
            token_balances = await get_all_token_balances(wallet_address, session)

        #we convert the balance fetched from wallet to readable format
        token_summary = "\n".join(
            [f"- {symbol}: {amount:.2f}" for symbol, amount in token_balances.items()]
        ) or "None"

        # Inject real-time data into the prompt
        final_prompt = prompt_template.format(
            wallet_address=wallet_address,
            user_prompt=user_prompt,
            eth_balance=eth_balance,
            token_balances=token_summary
        )

        print(f"[Agent Prompt]\n{final_prompt}")

        result = llm.invoke(final_prompt)

        # Return clean output
        if isinstance(result, AIMessage):
            return result.content
        return str(result)

    except Exception as e:
        print(f"[AGENT ERROR] {e}")
        return "Agent failed internally."
