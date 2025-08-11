from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user profile fields (no password)."""
    uid: str = Field(..., description="Firebase UID")
    email: EmailStr = Field(..., description="User email")
    displayName: Optional[str] = Field(None, description="User display name")
    emailVerified: Optional[bool] = Field(False, description="Whether user's email is verified")


class UserUpdate(BaseModel):
    """Profile update fields (no password)."""
    displayName: Optional[str] = Field(None, description="New display name")


class UserResponse(UserBase):
    """Response model for user profile."""
    createdAt: datetime = Field(..., description="Time user was created")
    updatedAt: datetime = Field(..., description="Time user was updated")

    class Config:
        from_attributes = True