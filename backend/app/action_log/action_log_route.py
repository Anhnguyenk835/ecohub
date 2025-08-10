from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime

from app.action_log.action_log_model import ActionLogCreate, ActionLogResponse
from app.action_log.action_log_service import ActionLogService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/action-logs", tags=["action logs"])
action_log_service = ActionLogService()

@router.post("/", response_model=ActionLogResponse, status_code=status.HTTP_201_CREATED)
async def create_action_log(log_data: ActionLogCreate):
    """
    Tạo một bản ghi nhật ký hành động mới.
    Endpoint này nên được gọi sau mỗi hành động quan trọng của người dùng.
    """
    # Trong thực tế, userId nên được lấy từ token của người dùng đã đăng nhập
    # thay vì tin tưởng vào dữ liệu từ client.
    # log_data.userId = current_user['id']
    
    created_log = await action_log_service.create_action_log(log_data.dict())
    if not created_log:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save action log")
    
    return ActionLogResponse(**created_log)

@router.get("/", response_model=List[ActionLogResponse])
async def get_action_logs(
    zone_id: Optional[str] = Query(None, description="Lọc nhật ký theo ID của khu vực"),
    user_id: Optional[str] = Query(None, description="Lọc nhật ký theo ID của người dùng"),
    start_date: Optional[datetime] = Query(None, description="Thời gian bắt đầu (ISO 8601 format)"),
    end_date: Optional[datetime] = Query(None, description="Thời gian kết thúc (ISO 8601 format)"),
    limit: int = Query(100, description="Số lượng bản ghi tối đa trả về", le=1000)
):
    """
    Truy vấn lịch sử hành động của người dùng.
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_date không được lớn hơn end_date")
        
    logs = await action_log_service.get_action_logs(
        zone_id=zone_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )
    return [ActionLogResponse(**log) for log in logs]