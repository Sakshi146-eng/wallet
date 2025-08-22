from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone, timedelta
import logging

# Import your existing database connection - FIXED PATH
from app.db.mongo import db, users

from app.models.user import UserSignUp, UserSignIn, Token, UserResponse
from app.utils.security import verify_password, get_password_hash, create_access_token

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/signup", response_model=Token)
async def sign_up(user_data: UserSignUp):
    """Sign up a new user"""
    try:
        # Check if user already exists
        existing_user = await users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password and create user document
        hashed_password = get_password_hash(user_data.password)
        current_time = datetime.now(timezone.utc)
        
        user_doc = {
            "email": user_data.email,
            "hashed_password": hashed_password,
            "wallet_addresses": [user_data.wallet_address] if user_data.wallet_address else [],
            "created_at": current_time,
            "updated_at": current_time,
            "last_login": current_time,
            "is_active": True
        }
        
        # Save user
        result = await users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        
        # Create token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": user_data.email}, 
            expires_delta=access_token_expires
        )
        
        user_response = UserResponse(**user_doc)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.post("/signin", response_model=Token)
async def sign_in(login_data: UserSignIn):
    """Sign in user"""
    try:
        # Find user
        user = await users.find_one({"email": login_data.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated"
            )
        
        # Verify password
        if not verify_password(login_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update last login
        await users.update_one(
            {"email": login_data.email},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        # Create token
        access_token_expires = timedelta(minutes=30)
        access_token = create_access_token(
            data={"sub": user["email"]}, 
            expires_delta=access_token_expires
        )
        
        user_response = UserResponse(**user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signin error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )