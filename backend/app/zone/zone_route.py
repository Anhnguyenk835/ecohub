from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict

from app.zone.zone_model import ZoneCreate, ZoneUpdate, ZoneResponse
from app.zone.zone_service import ZoneService
from app.utils.logger import get_logger

from app.zone_status.zone_status_route import router as zone_status_router

# Giả sử bạn có một dependency để lấy user hiện tại, nếu không có, owner_id phải được truyền vào.
# from app.auth.dependencies import get_current_user 

logger = get_logger(__name__)

router = APIRouter(prefix="/zones", tags=["zones"])
zone_service = ZoneService()

router.include_router(zone_status_router)

# Dependency để lấy zone hoặc báo lỗi 404
async def get_zone_or_404(zone_id: str) -> Dict:
    zone = await zone_service.get_zone(zone_id)
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Zone with ID {zone_id} not found")
    # TODO: Thêm kiểm tra quyền sở hữu ở đây
    # ví dụ: if zone['owner'] != current_user['id']: raise HTTPException(...)
    return zone

@router.post("/", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(zone_data: ZoneCreate):
    """
    Tạo một khu vực (zone) mới.
    - **owner**: ID của người dùng sở hữu.
    """
    # Trong một ứng dụng thực tế, 'owner' ID nên được lấy từ token xác thực
    # thay vì tin tưởng vào dữ liệu từ client.
    # zone_data.owner = current_user['id']
    
    created_zone = await zone_service.create_zone(zone_data.dict(by_alias=True))
    if not created_zone:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create zone")
    
    return ZoneResponse(**created_zone)

@router.get("/", response_model=List[ZoneResponse])
async def get_all_zones_for_owner(owner_id: str = Query(..., description="ID của người dùng để lọc các khu vực")):
    """
    Lấy danh sách tất cả các khu vực thuộc về một người dùng.
    """
    # Tương tự, owner_id nên được lấy từ user đã xác thực.
    # zones = await zone_service.get_zones_by_owner(current_user['id'])
    zones = await zone_service.get_zones_by_owner(owner_id)
    return [ZoneResponse(**zone) for zone in zones]

@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(zone: dict = Depends(get_zone_or_404)):
    """
    Lấy thông tin chi tiết của một khu vực bằng ID.
    """
    return ZoneResponse(**zone)

@router.put("/{zone_id}", response_model=ZoneResponse)
async def update_zone(zone_data: ZoneUpdate, zone: dict = Depends(get_zone_or_404)):
    """
    Cập nhật thông tin của một khu vực.
    """
    zone_id = zone['id']
    update_dict = zone_data.dict(exclude_unset=True, by_alias=True)

    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")

    success = await zone_service.update_zone(zone_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update zone")

    # Lấy lại thông tin mới nhất để trả về
    updated_zone = await zone_service.get_zone(zone_id)
    return ZoneResponse(**updated_zone)

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(zone: dict = Depends(get_zone_or_404)):
    """
    Xóa một khu vực.
    """
    zone_id = zone['id']
    success = await zone_service.delete_zone(zone_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete zone")
    return None 