from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum

class RepetitionType(str, Enum):
    """Enum for schedule repetition types."""
    once = "once"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

class DeviceType(str, Enum):
    """Enum for device types."""
    pump = "pump"
    fan = "fan"
    heater = "heater"
    light = "light"

class ActionType(str, Enum):
    """Enum for device actions."""
    activate = "activate"
    deactivate = "deactivate"

class ScheduleBase(BaseModel):
    """Base model for schedule with common fields."""
    zoneid: str = Field(..., description="ID of the zone")
    name: str = Field(..., description="Schedule name")
    deviceId: str = Field(..., description="ID of the device to control")
    deviceType: DeviceType = Field(..., description="Type of device")
    action: ActionType = Field(..., description="Action to perform")
    time: str = Field(..., description="Time in HH:MM format")
    repetition: RepetitionType = Field(..., description="Repetition type")
    isActive: bool = Field(True, description="Whether the schedule is active")

class ScheduleCreate(ScheduleBase):
    """Model for creating a new schedule."""
    date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format for once schedules")
    daysOfWeek: Optional[List[int]] = Field(None, description="Days of week (0-6 for Sunday-Saturday) for weekly schedules")
    dayOfMonth: Optional[int] = Field(None, description="Day of month (1-31) for monthly schedules")

class ScheduleUpdate(BaseModel):
    """Model for updating an existing schedule."""
    name: Optional[str] = Field(None, description="New schedule name")
    deviceId: Optional[str] = Field(None, description="New device ID")
    deviceType: Optional[DeviceType] = Field(None, description="New device type")
    action: Optional[ActionType] = Field(None, description="New action")
    time: Optional[str] = Field(None, description="New time in HH:MM format")
    repetition: Optional[RepetitionType] = Field(None, description="New repetition type")
    date: Optional[str] = Field(None, description="New date for once schedules")
    daysOfWeek: Optional[List[int]] = Field(None, description="New days of week for weekly schedules")
    dayOfMonth: Optional[int] = Field(None, description="New day of month for monthly schedules")
    isActive: Optional[bool] = Field(None, description="New active status")

class ScheduleResponse(ScheduleBase):
    """Model for schedule response data."""
    id: str = Field(..., description="Schedule ID")
    date: Optional[str] = Field(None, description="Date for once schedules")
    daysOfWeek: Optional[List[int]] = Field(None, description="Days of week for weekly schedules")
    dayOfMonth: Optional[int] = Field(None, description="Day of month for monthly schedules")
    createdAt: datetime = Field(..., description="Creation timestamp")
    updatedAt: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True

class ScheduleInDB(ScheduleResponse):
    """Complete schedule model for database operations."""
    pass
