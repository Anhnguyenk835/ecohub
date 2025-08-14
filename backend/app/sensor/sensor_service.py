from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class SensorService:
    """Service class for managing sensor operations in Firestore."""
    
    def __init__(self, collection_name: str = "sensors"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)
    
    async def create_sensor(self, sensor_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một sensor mới trong Firestore."""
        try:
            now = datetime.utcnow()
            sensor_data['createdAt'] = now
            sensor_data['updatedAt'] = now
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, sensor_data)
            
            logger.info(f"Sensor created successfully with ID: {doc_ref.id}")
            
            created_data = sensor_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating sensor: {str(e)}")
            return None

    async def get_sensor(self, sensor_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin sensor bằng ID."""
        try:
            doc_ref = self.collection.document(sensor_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                sensor_data = doc.to_dict()
                sensor_data['id'] = doc.id
                return sensor_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving sensor {sensor_id}: {str(e)}")
            return None

    async def get_all_sensors(self, zone_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lấy tất cả các sensor, có thể lọc theo zoneId."""
        sensors = []
        try:
            query = self.collection
            if zone_id:
                query = query.where('zoneId', '==', zone_id)
            
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                sensor_data = doc.to_dict()
                sensor_data['id'] = doc.id
                sensors.append(sensor_data)
            return sensors
        except Exception as e:
            logger.error(f"Error finding sensors (zone_id={zone_id}): {str(e)}")
            return []

    async def update_sensor(self, sensor_id: str, sensor_data: Dict[str, Any]) -> bool:
        """Cập nhật thông tin sensor."""
        try:
            sensor_data['updatedAt'] = datetime.utcnow()
            
            doc_ref = self.collection.document(sensor_id)
            await run_in_threadpool(doc_ref.update, sensor_data)
            
            logger.info(f"Sensor updated successfully: {sensor_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating sensor {sensor_id}: {str(e)}")
            return False

    async def delete_sensor(self, sensor_id: str) -> bool:
        """Xóa một sensor."""
        try:
            doc_ref = self.collection.document(sensor_id)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"Sensor deleted successfully: {sensor_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting sensor {sensor_id}: {str(e)}")
            return False
        
    async def delete_sensors_by_zone(self, zone_id: str) -> bool:
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
            
            logger.info(f"Deleted {count} sensors for zone {zone_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting sensors for zone {zone_id}: {e}", exc_info=True)
            return False