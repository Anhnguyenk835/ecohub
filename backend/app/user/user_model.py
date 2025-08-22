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
    displayName: Optional[str] = Field(None, description="User display name")
    notificationPreferences: Optional[dict] = Field(None, description="User notification preferences")


class UserResponse(BaseModel):
    """User profile response (no sensitive data)."""
    uid: str
    email: str
    displayName: Optional[str] = None
    emailVerified: bool
    notificationPreferences: Optional[dict] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class NotificationPreferences(BaseModel):
    """User notification preferences."""
    email: bool = Field(True, description="Enable email notifications")
    severity: Optional[dict] = Field(None, description="Severity preferences")
    maxPerHour: int = Field(10, description="Maximum notifications per hour")
    maxPerDay: int = Field(50, description="Maximum notifications per day")
    zones: Optional[list] = Field(None, description="Specific zones to receive notifications for")