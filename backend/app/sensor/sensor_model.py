from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SensorBase(BaseModel):
    """Base model với các trường chung của một sensor."""
    name: str = Field(..., description="Sensor name")
    type: str = Field(..., description="Type")
    zoneId: str = Field(..., description="ID zone")
    deviceId: str = Field(..., description="ID device")
    measures: List[str] = Field(..., description="List of Measures (ví dụ: ['temperature', 'airHumidity'])")

class SensorCreate(SensorBase):
    """Model để tạo một sensor mới."""
    pass

class SensorUpdate(BaseModel):
    """Model để cập nhật thông tin sensor, tất cả các trường đều không bắt buộc."""
    name: Optional[str] = Field(None, description="New sensor name")
    type: Optional[str] = Field(None, description="New type")
    zoneId: Optional[str] = Field(None, description="New ID zone")
    deviceId: Optional[str] = Field(None, description="New ID device")
    measures: Optional[List[str]] = Field(None, description="New list of Measures")

class SensorResponse(SensorBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server tạo."""
    id: str = Field(..., description="ID sensor")
    createdAt: datetime = Field(..., description="Time created")
    updatedAt: datetime = Field(..., description="Time updated")

    class Config:
        from_attributes = True

class SensorInDB(SensorResponse):
    """Model đầy đủ của sensor trong DB."""
    pass