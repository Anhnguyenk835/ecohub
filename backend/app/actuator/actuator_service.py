from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ActuatorService:
    """Service class for managing actuator operations in Firestore."""
    
    def __init__(self, collection_name: str = "actuators"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_actuator(self, actuator_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một actuator mới trong Firestore."""
        try:
            now = datetime.utcnow()
            actuator_data['createdAt'] = now
            actuator_data['updatedAt'] = now
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, actuator_data)
            
            logger.info(f"Actuator created successfully with ID: {doc_ref.id}")
            
            created_data = actuator_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating actuator: {str(e)}")
            return None

    async def get_actuator(self, actuator_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin actuator bằng ID."""
        try:
            doc_ref = self.collection.document(actuator_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                actuator_data = doc.to_dict()
                actuator_data['id'] = doc.id
                return actuator_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving actuator {actuator_id}: {str(e)}")
            return None

    async def get_all_actuators(self, zone_id: Optional[str] = None, device_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lấy tất cả các actuator, có thể lọc theo zoneId hoặc deviceId."""
        actuators = []
        try:
            query = self.collection
            if zone_id:
                query = query.where('zoneId', '==', zone_id)
            if device_id:
                query = query.where('deviceId', '==', device_id)
            
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                actuator_data = doc.to_dict()
                actuator_data['id'] = doc.id
                actuators.append(actuator_data)
            return actuators
        except Exception as e:
            logger.error(f"Error finding actuators: {str(e)}")
            return []

    async def update_actuator(self, actuator_id: str, actuator_data: Dict[str, Any]) -> bool:
        """Cập nhật thông tin actuator."""
        try:
            actuator_data['updatedAt'] = datetime.utcnow()
            
            doc_ref = self.collection.document(actuator_id)
            await run_in_threadpool(doc_ref.update, actuator_data)
            
            logger.info(f"Actuator updated successfully: {actuator_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating actuator {actuator_id}: {str(e)}")
            return False

    async def delete_actuator(self, actuator_id: str) -> bool:
        """Xóa một actuator."""
        try:
            doc_ref = self.collection.document(actuator_id)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"Actuator deleted successfully: {actuator_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting actuator {actuator_id}: {str(e)}")
            return False
        
    async def delete_actuators_by_zone(self, zone_id: str) -> bool:
        try:
            query = self.collection.where('zoneId', '==', zone_id)
            docs = await run_in_threadpool(query.stream)
            
            batch = db.batch()
            count = 0
            for doc in docs:
                batch.delete(doc.reference)
                count += 1
            
            if count > 0:
                await run_in_threadpool(batch.commit)
            
            logger.info(f"Deleted {count} actuators for zone {zone_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting actuators for zone {zone_id}: {e}", exc_info=True)
            return False