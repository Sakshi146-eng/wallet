from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from app.config import get_env
from app.constants import DEFAULT_PROMPT

# when async is used for  later:
# from langchain.chat_models import ChatGroq
# from langchain.chains import LLMChain

groq_api_key = get_env("GROQ_API_KEY")

llm = ChatGroq(
    api_key=groq_api_key,
    model="llama3-70b-8192"  
)

prompt_template = PromptTemplate.from_template(DEFAULT_PROMPT)

#these are the function for agent response
async def run_agent(user_prompt: str, wallet_address: str) -> str:
    final_prompt = prompt_template.format(
        wallet_address=wallet_address,
        user_prompt=user_prompt
    )
    print(f"[Agent] Running prompt:\n{final_prompt}")
    response = llm.predict(final_prompt)
    return response
