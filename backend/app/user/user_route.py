from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict

from app.user.user_model import UserCreate, UserUpdate, UserResponse
from app.user.user_service import UserService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["users"])
user_service = UserService()

# Dependency để lấy user hoặc báo lỗi 404
async def get_user_or_404(user_id: str) -> Dict:
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with ID {user_id} not found")
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate):
    """Tạo một người dùng mới."""
    # Kiểm tra xem email đã tồn tại chưa
    existing_user = await user_service.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email đã được đăng ký."
        )
    
    created_user = await user_service.create_user(user_data.dict())
    if not created_user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Không thể tạo người dùng")
    
    return UserResponse(**created_user)

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user: dict = Depends(get_user_or_404)):
    """Lấy thông tin người dùng bằng ID."""
    return UserResponse(**user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_data: UserUpdate, user: dict = Depends(get_user_or_404)):
    """Cập nhật thông tin người dùng."""
    user_id = user['id']
    update_dict = user_data.dict(exclude_unset=True)

    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không có dữ liệu để cập nhật")

    success = await user_service.update_user(user_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Không thể cập nhật người dùng")

    # Lấy lại thông tin mới nhất để trả về
    updated_user = await user_service.get_user(user_id)
    return UserResponse(**updated_user)

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user: dict = Depends(get_user_or_404)):
    """Xóa một người dùng."""
    user_id = user['id']
    success = await user_service.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Không thể xóa người dùng")