from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, List
from datetime import datetime

class ThresholdSetting(BaseModel):
    """Model cho một ngưỡng cài đặt của cảm biến."""
    enabled: bool = Field(..., description="Enable/disable warning for this threshold")
    min: float = Field(..., description="Lower threshold value")
    max: float = Field(..., description="Upper threshold value")

class Thresholds(BaseModel):
    """Model cho tất cả các ngưỡng trong một khu vực."""
    temperature: Optional[ThresholdSetting] = Field(None, description="Temperature threshold (°C)")
    airHumidity: Optional[ThresholdSetting] = Field(None, description="Humidity threshold (%)")
    soilMoisture: Optional[ThresholdSetting] = Field(None, description="Soil Moisture threshold (%)")
    lightIntensity: Optional[ThresholdSetting] = Field(None, description="Light Intensity threshold (lux)")
    ph: Optional[ThresholdSetting] = Field(None, validation_alias=AliasChoices('pH', 'ph'), description="pH threshold")
    co2: Optional[ThresholdSetting] = Field(None, validation_alias=AliasChoices('Co2', 'co2'), description="Co2 threshold (ppm)")

    class Config:
        populate_by_name = True 

class ZoneBase(BaseModel):
    """Base model với các trường chung của một zone."""
    name: str = Field(..., description="Name field")
    location: Optional[str] = Field(None, description="Location field")
    owner: str = Field(..., description="ID of owner")
    cropProfileId: Optional[str] = Field(None, description="ID của applied crop profile")
    thresholds: Thresholds = Field(..., description="Thresholds")

class ZoneCreate(ZoneBase):
    """Model để tạo một zone mới."""
    pass

class ZoneUpdate(BaseModel):
    """Model để cập nhật thông tin zone, tất cả các trường đều không bắt buộc."""
    name: Optional[str] = Field(None, description="New name field")
    location: Optional[str] = Field(None, description="New location field")
    cropProfileId: Optional[str] = Field(None, description="New ID of applied crop proflie")
    thresholds: Optional[Thresholds] = Field(None, description="New thresholds")

class ZoneResponse(ZoneBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server tạo."""
    id: str = Field(..., description="ID zone")
    createdAt: datetime = Field(..., description="Time created")
    updatedAt: datetime = Field(..., description="Time updated")

    class Config:
        from_attributes = True

class ZoneInDB(ZoneResponse):
    """Model đầy đủ của zone trong DB (trong trường hợp này giống hệt Response)."""
    pass