from pydantic import BaseModel
from typing import Dict, Optional,Union


class WalletInfoResponse(BaseModel):
    address: str
    balances: Dict[str, float]
    network: str


class AgentResponse(BaseModel):
    response: Union[str, Dict]


class TxAction(BaseModel):
    type: str  
    from_token: Optional[str]
    to_token: Optional[str]
    amount: Optional[float]


class TxSuggestionResponse(BaseModel):
    suggestion: str
    estimated_gas: float
    action: TxAction
