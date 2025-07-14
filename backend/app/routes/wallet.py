from fastapi import APIRouter
from app.models.response_schemas import WalletInfoResponse

router = APIRouter()

@router.get("/info", response_model=WalletInfoResponse)
async def get_wallet_info(address: str):
    #place holder for later
    
    return {
        "address": address,
        "balances": {
            "ETH": 1.234,
            "USDC": 520.0,
            "DAI": 134.5
        },
        "network": "Ethereum Mainnet"
    }
