from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, List
from datetime import datetime

class IdealThresholdSetting(BaseModel):
    """Model cho một ngưỡng lý tưởng (chỉ có min/max)."""
    min: float = Field(..., description="Lower threshold")
    max: float = Field(..., description="Upper threshold")

class IdealThresholds(BaseModel):
    """Model cho tất cả các ngưỡng lý tưởng trong một hồ sơ cây trồng."""
    temperature: Optional[IdealThresholdSetting] = Field(None, description="Temperature threshold (°C)")
    airHumidity: Optional[IdealThresholdSetting] = Field(None, description="Humidity threshold (%)")
    soilMoisture: Optional[IdealThresholdSetting] = Field(None, description="Soil Moisture threshold (%)")
    lightIntensity: Optional[IdealThresholdSetting] = Field(None, description="Light Intensity threshold (lux)")
    ph: Optional[IdealThresholdSetting] = Field(None, alias="pH", description="pH threshold")
    co2: Optional[IdealThresholdSetting] = Field(None, validation_alias=AliasChoices('co2', 'Co2'), description="Co2 threshold (ppm)")

    class Config:
        populate_by_name = True

class CropProfileBase(BaseModel):
    """Base model với các trường chung của một hồ sơ cây trồng."""
    name: str = Field(..., description="Crop profile name")
    idealThresholds: IdealThresholds = Field(..., description="Thresholds")

class CropProfileCreate(CropProfileBase):
    """Model để tạo một hồ sơ cây trồng mới."""
    pass

class CropProfileUpdate(BaseModel):
    """Model để cập nhật thông tin hồ sơ, tất cả các trường đều không bắt buộc."""
    name: Optional[str] = Field(None, description="New crop profile name")
    idealThresholds: Optional[IdealThresholds] = Field(None, description="New thresholds")

class CropProfileResponse(CropProfileBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server tạo."""
    id: str = Field(..., description="ID crop profile")
    createdAt: datetime = Field(..., description="Time created")
    updatedAt: datetime = Field(..., description="Time updated")

    class Config:
        from_attributes = True

class CropProfileInDB(CropProfileResponse):
    """Model đầy đủ của hồ sơ cây trồng trong DB."""
    pass