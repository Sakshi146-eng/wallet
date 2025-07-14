
#this is for transaction suggestion or confirmation 
from fastapi import APIRouter
from app.models.request_schemas import TxSuggestionRequest
from app.models.response_schemas import TxSuggestionResponse

router = APIRouter()

@router.post("/suggest", response_model=TxSuggestionResponse)
async def suggest_transaction(req: TxSuggestionRequest):
    # Placeholder 
    return {
        "suggestion": "Swap 50% of ETH to USDC due to high volatility.",
        "estimated_gas": 0.0021,
        "action": {
            "type": "swap",
            "from_token": "ETH",
            "to_token": "USDC",
            "amount": 0.5
        }
    }
