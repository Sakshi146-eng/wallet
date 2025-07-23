from pydantic import BaseModel
from typing import Dict, Optional,Union,Any


class WalletInfoResponse(BaseModel):
    address: str
    balances: Dict[str, float]
    network: str

class AgentResponse(BaseModel):
    response: Union[str, Dict[str, Any]]  #to make sure we return live when in online and actual llm response is added later i can use langchain or ollama for locally processing the user prompts



class TxAction(BaseModel):
    type: str  
    from_token: Optional[str]
    to_token: Optional[str]
    amount: Optional[float]


class TxSuggestionResponse(BaseModel):
    suggestion: str
    estimated_gas: float
    action: TxAction
