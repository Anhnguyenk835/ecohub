from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ActionLogService:
    """Service class for managing user action logs."""
    
    def __init__(self, collection_name: str = "action_logs"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_action_log(self, log_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một bản ghi nhật ký hành động mới."""
        try:
            # Server tự quyết định thời gian để đảm bảo tính toàn vẹn
            log_data['logAt'] = datetime.utcnow()
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, log_data)
            
            logger.info(f"Action log created successfully with ID: {doc_ref.id}")
            
            created_data = log_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating action log: {str(e)}")
            return None

    async def get_action_logs(
        self,
        zone_id: Optional[str] = None,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Lấy nhật ký hành động với các bộ lọc.
        Lưu ý: Firestore yêu cầu tạo index cho các truy vấn này.
        """
        logs = []
        try:
            query = self.collection

            # Thêm các bộ lọc
            if zone_id:
                query = query.where('zoneId', '==', zone_id)
            if user_id:
                query = query.where('userId', '==', user_id)
            if start_date:
                query = query.where('logAt', '>=', start_date)
            if end_date:
                query = query.where('logAt', '<=', end_date)

            # Sắp xếp theo thời gian gần nhất và giới hạn kết quả
            query = query.order_by('logAt', direction='DESC').limit(limit)
            
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                log_item = doc.to_dict()
                log_item['id'] = doc.id
                logs.append(log_item)
            return logs
        except Exception as e:
            logger.error(f"Error finding action logs: {str(e)}")
            return []