from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class DeviceService:
    """Service class for managing device operations in Firestore."""
    
    def __init__(self, collection_name: str = "devices"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_device(self, device_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một device mới trong Firestore."""
        try:
            now = datetime.utcnow()
            device_data['createdAt'] = now
            device_data['updatedAt'] = now
            # Khởi tạo trạng thái ban đầu cho thiết bị
            device_data['status'] = 'Offline'
            device_data['lastSeen'] = now
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, device_data)
            
            logger.info(f"Device created successfully with ID: {doc_ref.id}")
            
            created_data = device_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating device: {str(e)}")
            return None

    async def get_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin device bằng ID."""
        try:
            doc_ref = self.collection.document(device_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                device_data = doc.to_dict()
                device_data['id'] = doc.id
                return device_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving device {device_id}: {str(e)}")
            return None

    async def get_all_devices(self, zone_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lấy tất cả các device, có thể lọc theo zoneId."""
        devices = []
        try:
            query = self.collection
            if zone_id:
                query = query.where('zoneId', '==', zone_id)
            
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                device_data = doc.to_dict()
                device_data['id'] = doc.id
                devices.append(device_data)
            return devices
        except Exception as e:
            logger.error(f"Error finding devices (zone_id={zone_id}): {str(e)}")
            return []

    async def update_device(self, device_id: str, device_data: Dict[str, Any]) -> bool:
        """Cập nhật thông tin device."""
        try:
            device_data['updatedAt'] = datetime.utcnow()
            
            doc_ref = self.collection.document(device_id)
            await run_in_threadpool(doc_ref.update, device_data)
            
            logger.info(f"Device updated successfully: {device_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating device {device_id}: {str(e)}")
            return False

    async def delete_device(self, device_id: str) -> bool:
        """Xóa một device."""
        try:
            doc_ref = self.collection.document(device_id)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"Device deleted successfully: {device_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting device {device_id}: {str(e)}")
            return False