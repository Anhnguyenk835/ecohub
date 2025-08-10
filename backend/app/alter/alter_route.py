from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional, Dict

from app.alter.alter_model import AlterCreate, AlterUpdate, AlterResponse, AlterStatus, AlterSeverity
from app.alter.alter_service import AlterService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/alters", tags=["alerts"])
alter_service = AlterService()

async def get_alter_or_404(alter_id: str) -> Dict:
    """Dependency để lấy cảnh báo hoặc báo lỗi 404."""
    alter = await alter_service.get_alter(alter_id)
    if not alter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alter with ID {alter_id} not found")
    return alter

@router.post("/", response_model=AlterResponse, status_code=status.HTTP_201_CREATED, summary="Create new alter")
async def create_alter(alter_data: AlterCreate):
    """
    Endpoint này thường được gọi bởi các dịch vụ backend hoặc các quy trình tự động
    khi phát hiện một sự kiện bất thường (ví dụ: nhiệt độ vượt ngưỡng).
    """
    created_alter = await alter_service.create_alter(alter_data.dict())
    if not created_alter:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create alter")
    
    return AlterResponse(**created_alter)

@router.get("/", response_model=List[AlterResponse], summary="Get alters")
async def get_all_alters(
    zone_id: Optional[str] = Query(None, description="Lọc cảnh báo theo ID của khu vực"),
    status: Optional[AlterStatus] = Query(None, description="Lọc theo trạng thái (new, acknowledged, resolved)"),
    severity: Optional[AlterSeverity] = Query(None, description="Lọc theo mức độ nghiêm trọng")
):
    """
    Lấy danh sách các cảnh báo. Người dùng có thể lọc theo nhiều tiêu chí.
    """
    alters = await alter_service.get_all_alters(zone_id=zone_id, status=status, severity=severity)
    return [AlterResponse(**alter) for alter in alters]

@router.get("/{alter_id}", response_model=AlterResponse, summary="Get detail alter")
async def get_alter(alter: dict = Depends(get_alter_or_404)):
    """
    Lấy thông tin chi tiết của một cảnh báo cụ thể.
    """
    return AlterResponse(**alter)

@router.put("/{alter_id}", response_model=AlterResponse, summary="Update alter")
async def update_alter(alter_data: AlterUpdate, alter: dict = Depends(get_alter_or_404)):
    """
    Người dùng cập nhật trạng thái của một cảnh báo, ví dụ từ 'new' sang 'acknowledged'.
    """
    alter_id = alter['id']
    update_dict = alter_data.dict() # Chỉ chứa trường status

    success = await alter_service.update_alter(alter_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update alter")

    updated_alter = await alter_service.get_alter(alter_id)
    return AlterResponse(**updated_alter)