from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict

from app.zone_status.zone_status_model import ZoneStatusUpdate, ZoneStatusResponse
from app.zone_status.zone_status_service import ZoneStatusService
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Prefix thể hiện status là tài nguyên con của zone
router = APIRouter(prefix="/zones/{zone_id}/status", tags=["zone status"])
zone_status_service = ZoneStatusService()

@router.get("/", response_model=ZoneStatusResponse)
async def get_current_zone_status(zone_id: str):
    """
    Lấy trạng thái hiện tại của một khu vực cụ thể.
    """
    status_data = await zone_status_service.get_zone_status(zone_id)
    if not status_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Status for zone with ID {zone_id} not found"
        )
    return ZoneStatusResponse(**status_data)

@router.put("/", response_model=ZoneStatusResponse)
async def update_current_zone_status(zone_id: str, status_update: ZoneStatusUpdate):
    """
    Cập nhật (hoặc tạo mới nếu chưa có) trạng thái của một khu vực.
    Thường được gọi bởi các thiết bị IoT hoặc các tiến trình nền.
    """
    update_dict = status_update.dict(exclude_unset=True, by_alias=True)
    
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data provided for update"
        )
        
    updated_status = await zone_status_service.update_zone_status(zone_id, update_dict)

    if not updated_status:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not update status for zone {zone_id}"
        )
        
    return ZoneStatusResponse(**updated_status)