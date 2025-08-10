from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta

from app.readings_history.reading_history_model import ReadingHistoryCreate, ReadingHistoryResponse
from app.readings_history.reading_history_service import ReadingHistoryService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/readings_history", tags=["readings history"])
reading_service = ReadingHistoryService()

@router.post("/", response_model=ReadingHistoryResponse, status_code=status.HTTP_201_CREATED)
async def create_reading_history(reading_data: ReadingHistoryCreate):
    """
    Tạo một bản ghi lịch sử mới cho một lần đọc của cảm biến.
    Endpoint này thường được gọi bởi các thiết bị IoT.
    """
    created_reading = await reading_service.create_reading(reading_data.dict())
    if not created_reading:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save reading record")
    
    return ReadingHistoryResponse(**created_reading)

@router.get("/", response_model=List[ReadingHistoryResponse])
async def get_readings_history(
    zone_id: str = Query(..., description="ID của khu vực cần truy vấn lịch sử"),
    start_date: datetime = Query(..., description="Thời gian bắt đầu (ISO 8601 format, e.g., 2023-10-27T10:00:00Z)"),
    end_date: datetime = Query(default_factory=datetime.utcnow, description="Thời gian kết thúc (mặc định là bây giờ)"),
    sensor_id: Optional[str] = Query(None, description="Lọc theo ID của cảm biến cụ thể"),
    type: Optional[str] = Query(None, description="Lọc theo loại đại lượng đo (ví dụ: temperature)"),
    limit: int = Query(1000, description="Số lượng bản ghi tối đa trả về", le=5000)
):
    """
    Truy vấn lịch sử các giá trị đọc được từ cảm biến.
    """
    if start_date > end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_date không được lớn hơn end_date")
        
    readings = await reading_service.get_readings(
        zone_id=zone_id,
        start_date=start_date,
        end_date=end_date,
        sensor_id=sensor_id,
        type=type,
        limit=limit
    )
    return [ReadingHistoryResponse(**reading) for reading in readings]