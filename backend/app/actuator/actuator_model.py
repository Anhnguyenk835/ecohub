from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ActuatorBase(BaseModel):
    """Base model với các trường chung của một actuator."""
    name: str = Field(..., description="Name actuator")
    type: str = Field(..., description="Type")
    zoneId: str = Field(..., description="ID zone")
    deviceId: str = Field(..., description="ID device")

class ActuatorCreate(ActuatorBase):
    """Model để tạo một actuator mới."""
    pass

class ActuatorUpdate(BaseModel):
    """Model để cập nhật thông tin actuator, tất cả các trường đều không bắt buộc."""
    name: Optional[str] = Field(None, description="New name actuator")
    type: Optional[str] = Field(None, description="New type")
    zoneId: Optional[str] = Field(None, description="New ID zone")
    deviceId: Optional[str] = Field(None, description="New ID device")

class ActuatorResponse(ActuatorBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server tạo."""
    id: str = Field(..., description="ID actuator")
    createdAt: datetime = Field(..., description="Time created")
    updatedAt: datetime = Field(..., description="Time updated")

    class Config:
        from_attributes = True

class ActuatorInDB(ActuatorResponse):
    """Model đầy đủ của actuator trong DB."""
    pass