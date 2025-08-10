from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReadingHistoryBase(BaseModel):
    """Base model cho một bản ghi lịch sử đọc cảm biến."""
    sensorId: str = Field(..., description="ID sensor")
    zoneId: str = Field(..., description="ID zone")
    type: str = Field(..., description="Type of Measure")
    value: float = Field(..., description="Value")

class ReadingHistoryCreate(ReadingHistoryBase):
    """Model để tạo một bản ghi lịch sử mới. Thường được gửi từ thiết bị IoT."""
    # Có thể thêm một trường `readAt` ở đây nếu muốn thiết bị tự quyết định thời gian,
    # nhưng an toàn hơn là để server tự tạo.
    pass

class ReadingHistoryResponse(ReadingHistoryBase):
    """Model cho dữ liệu trả về, bao gồm các trường do server tạo."""
    id: str = Field(..., description="ID reading history")
    readAt: datetime = Field(..., description="Time readed")

    class Config:
        from_attributes = True

class ReadingHistoryInDB(ReadingHistoryResponse):
    """Model đầy đủ của bản ghi lịch sử trong DB."""
    pass