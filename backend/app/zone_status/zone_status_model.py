from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, Dict
from datetime import datetime

class LastReadings(BaseModel):
    """Model cho các giá trị đọc được gần nhất từ cảm biến."""
    temperature: Optional[float] = Field(None, description="Most recent temperature value (°C)")
    airHumidity: Optional[float] = Field(None, description="Most recent humidity value  (%)")
    soilMoisture: Optional[float] = Field(None, description="Most recent soil moisture value  (%)")
    lightIntensity: Optional[float] = Field(None, description="Most recent light intensity value  (lux)")
    ph: Optional[float] = Field(None, alias="pH", description="Most recent pH value")
    co2: Optional[float] = Field(None, validation_alias=AliasChoices('co2', 'Co2'), description="Most recent Co2 value (ppm)")

    class Config:
        populate_by_name = True

class ZoneStatusBase(BaseModel):
    """Base model cho trạng thái của một khu vực."""
    status: str = Field(..., description="Overall status of Zone (E.g: Good, Warning, Danger)")
    actuatorStates: Dict[str, str] = Field(..., description="Status of Actuators")
    lastReadings: LastReadings = Field(..., description="Most recent values from sensors")
    
    class Config:
        populate_by_name = True 

class ZoneStatusUpdate(BaseModel):
    """Model để cập nhật trạng thái của khu vực. Tất cả các trường là tùy chọn."""
    status: Optional[str] = Field(None, description="New status")
    actuatorStates: Optional[Dict[str, str]] = Field(None, description="New status of Actuators")
    lastReadings: Optional[LastReadings] = Field(None, description="New values from Sensors")

class ZoneStatusResponse(ZoneStatusBase):
    """Model cho dữ liệu trạng thái trả về."""
    # ID của status chính là ID của zone mà nó thuộc về
    id: str = Field(..., description="ID zone")
    lastUpdated: datetime = Field(..., description="Time updated")
    
    class Config:
        from_attributes = True
        populate_by_name = True

class ZoneStatusInDB(ZoneStatusResponse):
    """Model đầy đủ của zone_status trong DB."""
    pass