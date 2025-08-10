from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict

from app.crop_profile.crop_profile_model import CropProfileCreate, CropProfileUpdate, CropProfileResponse
from app.crop_profile.crop_profile_service import CropProfileService
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Sử dụng kebab-case cho URL prefixes là một thông lệ tốt
router = APIRouter(prefix="/crop-profiles", tags=["crop profiles"])
crop_profile_service = CropProfileService()

async def get_profile_or_404(profile_id: str) -> Dict:
    """Dependency để lấy hồ sơ hoặc báo lỗi 404."""
    profile = await crop_profile_service.get_crop_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Crop profile with ID {profile_id} not found")
    return profile

@router.post("/", response_model=CropProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_crop_profile(profile_data: CropProfileCreate):
    """
    Tạo một hồ sơ cây trồng mới.
    """
    # by_alias=True để đảm bảo các key như 'Co2', 'pH' được gửi đúng đến service
    created_profile = await crop_profile_service.create_crop_profile(profile_data.dict(by_alias=True))
    if not created_profile:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create crop profile")
    
    return CropProfileResponse(**created_profile)

@router.get("/", response_model=List[CropProfileResponse])
async def get_all_crop_profiles():
    """
    Lấy danh sách tất cả các hồ sơ cây trồng có sẵn.
    """
    profiles = await crop_profile_service.get_all_crop_profiles()
    return [CropProfileResponse(**profile) for profile in profiles]

@router.get("/{profile_id}", response_model=CropProfileResponse)
async def get_crop_profile(profile: dict = Depends(get_profile_or_404)):
    """
    Lấy thông tin chi tiết của một hồ sơ cây trồng bằng ID.
    """
    return CropProfileResponse(**profile)

@router.put("/{profile_id}", response_model=CropProfileResponse)
async def update_crop_profile(profile_data: CropProfileUpdate, profile: dict = Depends(get_profile_or_404)):
    """
    Cập nhật thông tin của một hồ sơ cây trồng.
    """
    profile_id = profile['id']
    update_dict = profile_data.dict(exclude_unset=True, by_alias=True)

    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")

    success = await crop_profile_service.update_crop_profile(profile_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update crop profile")

    updated_profile = await crop_profile_service.get_crop_profile(profile_id)
    return CropProfileResponse(**updated_profile)

@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crop_profile(profile: dict = Depends(get_profile_or_404)):
    """
    Xóa một hồ sơ cây trồng.
    """
    profile_id = profile['id']
    success = await crop_profile_service.delete_crop_profile(profile_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete crop profile")
    return None