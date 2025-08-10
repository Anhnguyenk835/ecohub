from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Optional

from app.sensor.sensor_model import SensorCreate, SensorUpdate, SensorResponse
from app.sensor.sensor_service import SensorService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/sensors", tags=["sensors"])
sensor_service = SensorService()

async def get_sensor_or_404(sensor_id: str) -> Dict:
    """Dependency để lấy sensor hoặc báo lỗi 404."""
    sensor = await sensor_service.get_sensor(sensor_id)
    if not sensor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Sensor with ID {sensor_id} not found")
    return sensor

@router.post("/", response_model=SensorResponse, status_code=status.HTTP_201_CREATED)
async def create_sensor(sensor_data: SensorCreate):
    """
    Tạo một cảm biến mới.
    """
    created_sensor = await sensor_service.create_sensor(sensor_data.dict())
    if not created_sensor:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create sensor")
    
    return SensorResponse(**created_sensor)

@router.get("/", response_model=List[SensorResponse])
async def get_all_sensors(zone_id: Optional[str] = Query(None, description="Lọc các cảm biến theo ID của khu vực (zone)")):
    """
    Lấy danh sách tất cả các cảm biến. Có thể lọc theo zoneId.
    """
    sensors = await sensor_service.get_all_sensors(zone_id)
    return [SensorResponse(**sensor) for sensor in sensors]

@router.get("/{sensor_id}", response_model=SensorResponse)
async def get_sensor(sensor: dict = Depends(get_sensor_or_404)):
    """
    Lấy thông tin chi tiết của một cảm biến bằng ID.
    """
    return SensorResponse(**sensor)

@router.put("/{sensor_id}", response_model=SensorResponse)
async def update_sensor(sensor_data: SensorUpdate, sensor: dict = Depends(get_sensor_or_404)):
    """
    Cập nhật thông tin của một cảm biến.
    """
    sensor_id = sensor['id']
    update_dict = sensor_data.dict(exclude_unset=True)

    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")

    success = await sensor_service.update_sensor(sensor_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update sensor")

    updated_sensor = await sensor_service.get_sensor(sensor_id)
    return SensorResponse(**updated_sensor)

@router.delete("/{sensor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sensor(sensor: dict = Depends(get_sensor_or_404)):
    """
    Xóa một cảm biến.
    """
    sensor_id = sensor['id']
    success = await sensor_service.delete_sensor(sensor_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete sensor")
    return None