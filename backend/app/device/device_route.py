from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Optional

from app.device.device_model import DeviceCreate, DeviceUpdate, DeviceResponse
from app.device.device_service import DeviceService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/devices", tags=["devices"])
device_service = DeviceService()

async def get_device_or_404(device_id: str) -> Dict:
    """Dependency để lấy device hoặc báo lỗi 404."""
    device = await device_service.get_device(device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Device with ID {device_id} not found")
    return device

@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(device_data: DeviceCreate):
    """
    Đăng ký một thiết bị mới vào hệ thống.
    """
    created_device = await device_service.create_device(device_data.dict())
    if not created_device:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create device")
    
    return DeviceResponse(**created_device)

@router.get("/", response_model=List[DeviceResponse])
async def get_all_devices(zone_id: Optional[str] = Query(None, description="Lọc các thiết bị theo ID của khu vực (zone)")):
    """
    Lấy danh sách tất cả các thiết bị. Có thể lọc theo zoneId.
    """
    devices = await device_service.get_all_devices(zone_id)
    return [DeviceResponse(**device) for device in devices]

@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(device: dict = Depends(get_device_or_404)):
    """
    Lấy thông tin chi tiết của một thiết bị bằng ID.
    """
    return DeviceResponse(**device)

@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(device_data: DeviceUpdate, device: dict = Depends(get_device_or_404)):
    """
    Cập nhật thông tin của một thiết bị (ví dụ: đổi tên, gán sang zone khác).
    """
    device_id = device['id']
    update_dict = device_data.dict(exclude_unset=True)

    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")

    success = await device_service.update_device(device_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update device")

    updated_device = await device_service.get_device(device_id)
    return DeviceResponse(**updated_device)

@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(device: dict = Depends(get_device_or_404)):
    """
    Xóa (hủy đăng ký) một thiết bị khỏi hệ thống.
    """
    device_id = device['id']
    success = await device_service.delete_device(device_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete device")
    return None