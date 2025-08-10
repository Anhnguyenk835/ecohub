from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DeviceBase(BaseModel):
    """Base model với các trường chung của một device."""
    name: str = Field(..., description="Device name")
    zoneId: str = Field(..., description="ID zone")

class DeviceCreate(DeviceBase):
    """Model để đăng ký một thiết bị mới vào hệ thống."""
    pass

class DeviceUpdate(BaseModel):
    """Model để cập nhật thông tin thiết bị. Chỉ các trường người dùng có thể thay đổi."""
    name: Optional[str] = Field(None, description="New device name")
    zoneId: Optional[str] = Field(None, description="New ID zone")

class DeviceResponse(DeviceBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server và thiết bị tự cập nhật."""
    id: str = Field(..., description="ID device")
    status: str = Field(..., description="Status device")
    lastSeen: datetime = Field(..., description="Last active time")
    createdAt: datetime = Field(..., description="Time created")
    updatedAt: datetime = Field(..., description="Time updated")

    class Config:
        from_attributes = True

class DeviceInDB(DeviceResponse):
    """Model đầy đủ của device trong DB."""
    pass