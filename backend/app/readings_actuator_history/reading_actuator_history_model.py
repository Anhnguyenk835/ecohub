from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReadingActuatorHistoryBase(BaseModel):

    actuatorId: str = Field(..., description="ID của actuator")
    zoneId: str = Field(..., description="ID của khu vực")
    type: str = Field(..., description="Loại actuator (ví dụ: PUMP, FAN)")
    state: str = Field(..., description="Trạng thái của actuator (ví dụ: 'ON', 'OFF', 'AUTO')")

class ReadingActuatorHistoryCreate(ReadingActuatorHistoryBase):

    pass

class ReadingActuatorHistoryResponse(ReadingActuatorHistoryBase):
    id: str = Field(..., description="ID của bản ghi lịch sử")
    readAt: datetime = Field(..., description="Thời điểm ghi nhận trạng thái")

    class Config:
        from_attributes = True

class ReadingActuatorHistoryInDB(ReadingActuatorHistoryResponse):

    pass
