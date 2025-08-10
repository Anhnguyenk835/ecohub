from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Optional

from app.actuator.actuator_model import ActuatorCreate, ActuatorUpdate, ActuatorResponse
from app.actuator.actuator_service import ActuatorService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/actuators", tags=["actuators"])
actuator_service = ActuatorService()

async def get_actuator_or_404(actuator_id: str) -> Dict:
    """Dependency để lấy actuator hoặc báo lỗi 404."""
    actuator = await actuator_service.get_actuator(actuator_id)
    if not actuator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Actuator with ID {actuator_id} not found")
    return actuator

@router.post("/", response_model=ActuatorResponse, status_code=status.HTTP_201_CREATED)
async def create_actuator(actuator_data: ActuatorCreate):
    """
    Tạo một thiết bị truyền động (actuator) mới.
    """
    created_actuator = await actuator_service.create_actuator(actuator_data.dict())
    if not created_actuator:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create actuator")
    
    return ActuatorResponse(**created_actuator)

@router.get("/", response_model=List[ActuatorResponse])
async def get_all_actuators(
    zone_id: Optional[str] = Query(None, description="Lọc actuator theo ID của khu vực"),
    device_id: Optional[str] = Query(None, description="Lọc actuator theo ID của thiết bị điều khiển")
):
    """
    Lấy danh sách tất cả các actuator. Có thể lọc theo zoneId hoặc deviceId.
    """
    actuators = await actuator_service.get_all_actuators(zone_id=zone_id, device_id=device_id)
    return [ActuatorResponse(**actuator) for actuator in actuators]

@router.get("/{actuator_id}", response_model=ActuatorResponse)
async def get_actuator(actuator: dict = Depends(get_actuator_or_404)):
    """
    Lấy thông tin chi tiết của một actuator bằng ID.
    """
    return ActuatorResponse(**actuator)

@router.put("/{actuator_id}", response_model=ActuatorResponse)
async def update_actuator(actuator_data: ActuatorUpdate, actuator: dict = Depends(get_actuator_or_404)):
    """
    Cập nhật thông tin của một actuator.
    """
    actuator_id = actuator['id']
    update_dict = actuator_data.dict(exclude_unset=True)

    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")

    success = await actuator_service.update_actuator(actuator_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update actuator")

    updated_actuator = await actuator_service.get_actuator(actuator_id)
    return ActuatorResponse(**updated_actuator)

@router.delete("/{actuator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_actuator(actuator: dict = Depends(get_actuator_or_404)):
    """
    Xóa một actuator.
    """
    actuator_id = actuator['id']
    success = await actuator_service.delete_actuator(actuator_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete actuator")
    return None