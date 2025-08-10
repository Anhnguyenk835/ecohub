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
        start_date: datetime,
        end_date: datetime,
        sensor_id: Optional[str] = None,
        type: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Lấy lịch sử các giá trị đọc được với các bộ lọc.
        Lưu ý: Firestore yêu cầu tạo index cho các truy vấn phức tạp này.
        """
        readings = []
        try:
            # Bắt đầu với các bộ lọc bắt buộc
            query = self.collection.where('zoneId', '==', zone_id)
            query = query.where('readAt', '>=', start_date).where('readAt', '<=', end_date)

            # Thêm các bộ lọc tùy chọn
            if sensor_id:
                query = query.where('sensorId', '==', sensor_id)
            if type:
                query = query.where('type', '==', type)

            # Sắp xếp và giới hạn kết quả
            query = query.order_by('readAt', direction='DESC').limit(limit)
            
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                reading_data = doc.to_dict()
                reading_data['id'] = doc.id
                readings.append(reading_data)
            return readings
        except Exception as e:
            logger.error(f"Error finding reading history: {str(e)}")
            return []