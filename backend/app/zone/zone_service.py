from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

from app.zone_status.zone_status_service import ZoneStatusService 

logger = get_logger(__name__)

class ZoneService:
    """Service class for managing zone operations in Firestore."""
    
    def __init__(self, collection_name: str = "zones"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

        self.zone_status_service = ZoneStatusService()

    async def create_zone(self, zone_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một zone mới trong Firestore."""
        try:
            # Thêm timestamps
            now = datetime.utcnow()
            zone_data['createdAt'] = now
            zone_data['updatedAt'] = now
            
            # Thêm document vào Firestore
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, zone_data)
            
            logger.info(f"Zone created successfully with ID: {doc_ref.id}")
            
            initial_status = await self.zone_status_service.create_initial_zone_status(doc_ref.id)

            # Trả về dữ liệu đã tạo để không cần query lại
            created_data = zone_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating zone: {str(e)}")
            return None

    async def get_zone(self, zone_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin zone bằng ID."""
        try:
            doc_ref = self.collection.document(zone_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                zone_data = doc.to_dict()
                zone_data['id'] = doc.id
                return zone_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving zone {zone_id}: {str(e)}")
            return None

    async def get_zones_by_owner(self, owner_id: str) -> List[Dict[str, Any]]:
        """Lấy tất cả các zone thuộc về một owner."""
        zones = []
        try:
            query = self.collection.where('owner', '==', owner_id)
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                zone_data = doc.to_dict()
                zone_data['id'] = doc.id
                zones.append(zone_data)
            return zones
        except Exception as e:
            logger.error(f"Error finding zones for owner {owner_id}: {str(e)}")
            return []

    async def update_zone(self, zone_id: str, zone_data: Dict[str, Any]) -> bool:
        """Cập nhật thông tin zone."""
        try:
            zone_data['updatedAt'] = datetime.utcnow()
            
            doc_ref = self.collection.document(zone_id)
            await run_in_threadpool(doc_ref.update, zone_data)
            
            logger.info(f"Zone updated successfully: {zone_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating zone {zone_id}: {str(e)}")
            return False

    async def delete_zone(self, zone_id: str) -> bool:
        """Xóa một zone."""
        try:
            doc_ref = self.collection.document(zone_id)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"Zone deleted successfully: {zone_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting zone {zone_id}: {str(e)}")
            return False