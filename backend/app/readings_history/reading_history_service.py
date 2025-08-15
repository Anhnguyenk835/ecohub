from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ReadingHistoryService:
    """Service class for managing sensor reading history."""
    
    def __init__(self, collection_name: str = "readings_history"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_reading(self, reading_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một bản ghi lịch sử mới."""
        try:
            # Server tự quyết định thời gian đọc để đảm bảo tính nhất quán
            reading_data['readAt'] = datetime.utcnow()
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, reading_data)
            
            logger.info(f"Reading record created successfully with ID: {doc_ref.id}")
            
            created_data = reading_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating reading record: {str(e)}")
            return None

    async def get_readings(
        self,
        zone_id: str,
        sensor_id: Optional[str] = None,
        type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Lấy lịch sử các giá trị đọc được với các bộ lọc.
        Lưu ý: Firestore yêu cầu tạo index cho các truy vấn phức tạp này.
        """
        readings = []
        try:
            query = self.collection.where(field_path='zoneId', op_string='==', value=zone_id)
            
            if sensor_id:
                query = query.where(field_path='sensorId', op_string='==', value=sensor_id)
            elif type:
                query = query.where(field_path='type', op_string='==', value=type)
       
            docs = await run_in_threadpool(query.stream)
            
            # Collect all results
            all_readings = []
            for doc in docs:
                reading_data = doc.to_dict()
                reading_data['id'] = doc.id
                all_readings.append(reading_data)
            
            if sensor_id and type:
                filtered_readings = [r for r in all_readings if r.get('type') == type]
            elif not sensor_id and type:
                filtered_readings = all_readings
            else:
                filtered_readings = all_readings
            
            filtered_readings.sort(key=lambda x: x.get('readAt', datetime.min), reverse=True)
            
            
            return filtered_readings
        except Exception as e:
            logger.error(f"Error finding reading history: {str(e)}")
            return []