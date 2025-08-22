from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional

# Đổi tên import để phù hợp với module mới
from app.readings_actuator_history.reading_actuator_history_model import ReadingActuatorHistoryCreate, ReadingActuatorHistoryResponse
from app.readings_actuator_history.reading_actuator_history_service import ReadingActuatorHistoryService
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Cập nhật prefix và tags
router = APIRouter(prefix="/readings_actuator_history", tags=["readings actuator history"])
actuator_history_service = ReadingActuatorHistoryService()

@router.post("/", response_model=ReadingActuatorHistoryResponse, status_code=status.HTTP_201_CREATED)
async def create_actuator_history(actuator_data: ReadingActuatorHistoryCreate):
    """
    Tạo một bản ghi lịch sử mới cho hoạt động của một actuator.
    """
    created_log = await actuator_history_service.create_actuator_log(actuator_data.dict())
    if not created_log:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save actuator history record")
    
    return ReadingActuatorHistoryResponse(**created_log)

@router.get("/", response_model=List[ReadingActuatorHistoryResponse])
async def get_actuator_history(
    zone_id: str = Query(..., description="ID của khu vực cần truy vấn lịch sử"),
    actuator_id: Optional[str] = Query(None, description="Lọc theo ID của actuator cụ thể"),
    type: Optional[str] = Query(None, description="Lọc theo loại actuator (ví dụ: PUMP)"),
):
    """
    Truy vấn lịch sử hoạt động của các actuator.
    """
    logs = await actuator_history_service.get_actuator_logs(
        zone_id=zone_id,
        actuator_id=actuator_id,
        type=type,
    )
    return [ReadingActuatorHistoryResponse(**log) for log in logs]

