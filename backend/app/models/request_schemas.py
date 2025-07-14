from pydantic import BaseModel

class AgentQueryRequest(BaseModel):
    prompt: str
    wallet_address: str


class TxSuggestionRequest(BaseModel):
    wallet_address: str
    risk_level: str = "medium" #either low medium or high
    market_sentiment: str = "neutral"
