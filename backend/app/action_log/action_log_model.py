from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ActionLogBase(BaseModel):
    """Base model cho các trường của một nhật ký hành động."""
    userId: str = Field(..., description="ID user")
    zoneId: str = Field(..., description="ID zone")
    action: str = Field(..., description="Action")

class ActionLogCreate(ActionLogBase):
    """Model để tạo một bản ghi nhật ký mới."""
    pass

class ActionLogResponse(ActionLogBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server tạo."""
    id: str = Field(..., description="ID action log")
    logAt: datetime = Field(..., description="Time logged")

    class Config:
        from_attributes = True

class ActionLogInDB(ActionLogResponse):
    """Model đầy đủ của một bản ghi nhật ký trong DB."""
    pass