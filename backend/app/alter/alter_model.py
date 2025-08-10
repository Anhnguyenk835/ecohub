from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class AlterSeverity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlterStatus(str, Enum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

class AlterBase(BaseModel):
    """Base model cho các trường của một cảnh báo."""
    zoneId: str = Field(..., description="ID zone")
    message: str = Field(..., description="Alter message")
    severity: AlterSeverity = Field(..., description="Severity of Alter")
    type: List[str] = Field(..., description="Type")

class AlterCreate(AlterBase):
    """Model để hệ thống tạo một cảnh báo mới."""
    pass

class AlterUpdate(BaseModel):
    """Model để người dùng cập nhật trạng thái của một cảnh báo."""
    status: AlterStatus = Field(..., description="New status of Alter")

class AlterResponse(AlterBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server tạo."""
    id: str = Field(..., description="ID alter")
    status: AlterStatus = Field(..., description="Current status of Alter")
    at: datetime = Field(..., description="Time")

    class Config:
        from_attributes = True

class AlterInDB(AlterResponse):
    """Model đầy đủ của một cảnh báo trong DB."""
    pass