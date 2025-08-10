from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger
from app.alter.alter_model import AlterStatus, AlterSeverity # Import enum

logger = get_logger(__name__)

class AlterService:
    """Service class for managing alert operations."""
    
    def __init__(self, collection_name: str = "alters"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_alter(self, alter_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một cảnh báo mới với trạng thái 'new'."""
        try:
            alter_data['at'] = datetime.utcnow()
            alter_data['status'] = AlterStatus.NEW
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, alter_data)
            
            logger.info(f"Alter created successfully with ID: {doc_ref.id}")
            
            created_data = alter_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating alter: {str(e)}")
            return None

    async def get_alter(self, alter_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin một cảnh báo bằng ID."""
        try:
            doc_ref = self.collection.document(alter_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                alter_data = doc.to_dict()
                alter_data['id'] = doc.id
                return alter_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving alter {alter_id}: {str(e)}")
            return None

    async def get_all_alters(
        self,
        zone_id: Optional[str] = None,
        status: Optional[AlterStatus] = None,
        severity: Optional[AlterSeverity] = None
    ) -> List[Dict[str, Any]]:
        """Lấy danh sách các cảnh báo với các bộ lọc."""
        alerts = []
        try:
            query = self.collection
            if zone_id:
                query = query.where('zoneId', '==', zone_id)
            if status:
                query = query.where('status', '==', status.value)
            if severity:
                query = query.where('severity', '==', severity.value)

            # Sắp xếp theo thời gian gần nhất
            query = query.order_by('at', direction='DESC')
            
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                alert_data = doc.to_dict()
                alert_data['id'] = doc.id
                alerts.append(alert_data)
            return alerts
        except Exception as e:
            logger.error(f"Error finding alters: {str(e)}")
            return []

    async def update_alter(self, alter_id: str, update_data: Dict[str, Any]) -> bool:
        """Cập nhật một cảnh báo (chủ yếu là trạng thái)."""
        try:
            doc_ref = self.collection.document(alter_id)
            await run_in_threadpool(doc_ref.update, update_data)
            logger.info(f"Alter {alter_id} updated successfully.")
            return True
        except Exception as e:
            logger.error(f"Error updating alter {alter_id}: {str(e)}")
            return False