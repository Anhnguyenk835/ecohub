from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    """Base model với các trường chung của user."""
    email: EmailStr = Field(..., description="User email")
    displayName: str = Field(..., description="User display name")

class UserCreate(UserBase):
    """Model để tạo user mới, yêu cầu có mật khẩu."""
    password: str = Field(..., min_length=8, description="User password, minimum 8 characters")

class UserUpdate(BaseModel):
    """Model để cập nhật thông tin user, tất cả các trường đều không bắt buộc."""
    displayName: Optional[str] = Field(None, description="New display name")
    password: Optional[str] = Field(None, min_length=8, description="New password, minimum 8 characters")

class UserResponse(UserBase):
    """Model cho dữ liệu trả về, không bao giờ chứa mật khẩu."""
    id: str = Field(..., description="ID định danh của người dùng")
    createdAt: datetime = Field(..., description="Time user was created")
    updatedAt: datetime = Field(..., description="Time user was updated")

    class Config:
        from_attributes = True

class UserInDB(UserResponse):
    """Model đầy đủ của user trong DB, bao gồm cả mật khẩu đã băm."""
    hashed_password: str