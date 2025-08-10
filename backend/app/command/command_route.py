from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict

from app.command.command_model import CommandCreate, CommandUpdate, CommandResponse
from app.command.command_service import CommandService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/commands", tags=["commands"])
command_service = CommandService()

async def get_command_or_404(command_id: str) -> Dict:
    """Dependency để lấy command hoặc báo lỗi 404."""
    command = await command_service.get_command(command_id)
    if not command:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Command with ID {command_id} not found")
    return command

# --- Endpoints cho người dùng/backend ---

@router.post("/", response_model=CommandResponse, status_code=status.HTTP_201_CREATED,
             summary="Create new command")
async def create_command(command_data: CommandCreate):
    """
    Người dùng hoặc hệ thống backend tạo một lệnh mới và đưa vào hàng đợi.
    - **requestedBy**: ID của người dùng thực hiện yêu cầu (cần được xác thực).
    """
    # Trong thực tế, requestedBy sẽ được lấy từ token của người dùng đã đăng nhập.
    # command_data.requestedBy = current_user['id']
    
    created_command = await command_service.create_command(command_data.dict())
    if not created_command:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create command")
    
    return CommandResponse(**created_command)

@router.get("/{command_id}", response_model=CommandResponse,
            summary="Get command information")
async def get_command_details(command: dict = Depends(get_command_or_404)):
    """
    Lấy thông tin chi tiết của một lệnh để theo dõi trạng thái.
    """
    return CommandResponse(**command)


# --- Endpoints cho thiết bị (Device) ---

@router.get("/device/{device_id}/pending", response_model=List[CommandResponse],
            summary="Get ID device waited for commands")
async def get_pending_commands(device_id: str, limit: int = Query(5, ge=1, le=10)):
    """
    Endpoint dành cho thiết bị IoT. Thiết bị sẽ gọi endpoint này định kỳ
    để kiểm tra xem có lệnh mới nào đang ở trạng thái 'pending' cho nó không.
    """
    # TODO: Thêm cơ chế xác thực cho thiết bị (ví dụ: API Key, mTLS)
    commands = await command_service.get_pending_commands_for_device(device_id, limit)
    return [CommandResponse(**cmd) for cmd in commands]

@router.put("/{command_id}/status", response_model=CommandResponse,
            summary="Update command")
async def update_command_status_by_device(command_data: CommandUpdate, command: dict = Depends(get_command_or_404)):
    """
    Sau khi thực thi (hoặc cố gắng thực thi) một lệnh, thiết bị sẽ gọi endpoint này
    để cập nhật lại trạng thái (ví dụ: 'completed', 'failed').
    """
    # TODO: Thêm cơ chế xác thực cho thiết bị và kiểm tra xem thiết bị
    # có quyền cập nhật command này không (command['deviceId'] == authenticated_device_id)
    
    command_id = command['id']
    update_dict = command_data.dict(exclude_unset=True)

    success = await command_service.update_command_status(command_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update command status")

    updated_command = await command_service.get_command(command_id)
    return CommandResponse(**updated_command)