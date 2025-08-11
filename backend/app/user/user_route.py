from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict

from app.user.user_model import UserUpdate, UserResponse
from app.user.user_service import UserService
from app.utils.logger import get_logger
from app.services.firebase_auth import get_current_user, get_verified_user

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["users"])
user_service = UserService()

async def get_user_or_404(uid: str) -> Dict:
    user = await user_service.get_user(uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with UID {uid} not found")
    return user

@router.post("/me/sync", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def sync_profile(current = Depends(get_verified_user)):
    """Create or update the profile for the authenticated user (verified email required)."""
    profile = {
        "uid": current["uid"],
        "email": current.get("email"),
        "displayName": current.get("name"),
        "emailVerified": True,
    }
    saved = await user_service.create_or_update_profile(current["uid"], profile)
    return UserResponse(**saved)

@router.get("/me", response_model=UserResponse)
async def get_me(current = Depends(get_verified_user)):
    profile = await user_service.get_user(current["uid"]) 
    if not profile:
        # Auto-create minimal profile if missing
        profile = await user_service.create_or_update_profile(current["uid"], {
            "uid": current["uid"],
            "email": current.get("email"),
            "displayName": current.get("name"),
            "emailVerified": current.get("email_verified", False),
        })
    return UserResponse(**profile)

@router.put("/me", response_model=UserResponse)
async def update_me(user_data: UserUpdate, current = Depends(get_verified_user)):
    update_dict = user_data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")
    success = await user_service.update_user(current["uid"], update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")
    updated = await user_service.get_user(current["uid"])
    return UserResponse(**updated)

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(current = Depends(get_verified_user)):
    success = await user_service.delete_user(current["uid"])
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user")