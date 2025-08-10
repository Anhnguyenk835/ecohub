from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from enum import Enum

class CommandAction(str, Enum):
    SET_STATE = "SET_STATE"
    RESTART_DEVICE = "RESTART_DEVICE"
    UPDATE_FIRMWARE = "UPDATE_FIRMWARE"
    # Thêm các action khác ở đây

class CommandStatus(str, Enum):
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"

class CommandBase(BaseModel):
    """Base model cho các trường mà người dùng cần cung cấp khi tạo command."""
    deviceId: str = Field(..., description="ID device")
    action: CommandAction = Field(..., description="Action name")
    actuator: Optional[str] = Field(None, description="ID device")
    payload: Optional[Any] = Field(None, description="Payload value")
    requestedBy: str = Field(..., description="ID requested")

class CommandCreate(CommandBase):
    """Model để tạo một command mới."""
    pass

class CommandUpdate(BaseModel):
    """Model mà thiết bị sử dụng để cập nhật trạng thái của command."""
    status: CommandStatus = Field(..., description="Status command")
    # Thiết bị có thể gửi thêm thông tin lỗi nếu thất bại
    error_message: Optional[str] = Field(None, description="Error message")

class CommandResponse(CommandBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server/device tạo."""
    id: str = Field(..., description="ID command")
    status: CommandStatus = Field(..., description="Status command")
    createdAt: datetime = Field(..., description="Time created")
    executedAt: Optional[datetime] = Field(None, description="Time excuted")
    
    class Config:
        from_attributes = True

class CommandInDB(CommandResponse):
    """Model đầy đủ của command trong DB."""
    error_message: Optional[str] = Field(None, description="Error message")