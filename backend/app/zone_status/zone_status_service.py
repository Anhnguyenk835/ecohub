from typing import Dict, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ZoneStatusService:
    """Service class for managing zone status operations."""

    def __init__(self, collection_name: str = "zone_status"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    def _get_doc_id(self, zone_id: str) -> str:
        """Tạo ID cho document trong collection zone_status từ zone_id."""
        return f"zone_status_{zone_id}"

    async def get_zone_status(self, zone_id: str) -> Optional[Dict[str, Any]]:
        """Lấy trạng thái của một khu vực bằng zone_id."""
        try:
            # Truy vấn trực tiếp bằng zone_id
            doc_ref = self.collection.document(zone_id)
            doc = await run_in_threadpool(doc_ref.get)

            if doc.exists:
                status_data = doc.to_dict()
                # Lấy ID từ document để đảm bảo tính chính xác
                status_data['id'] = doc.id
                return status_data
            
            logger.warning(f"Status document for zone_id '{zone_id}' does not exist.")
            return None
        except Exception as e:
            logger.error(f"Error retrieving status for zone {zone_id}: {str(e)}")
            return None

    async def create_initial_zone_status(self, zone_id: str) -> Optional[Dict[str, Any]]:
        """Tạo một document status ban đầu cho một zone mới."""
        initial_status_data = {
            "status": "Initializing",  
            "actuatorStates": {}, 
            "lastReadings": {},  
        }
        
        return await self.update_zone_status(zone_id, initial_status_data)

    async def update_zone_status(self, zone_id: str, status_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Tạo mới hoặc cập nhật (upsert) trạng thái của một khu vực.
        """
        try:
            # Truy vấn trực tiếp bằng zone_id
            doc_ref = self.collection.document(zone_id)

            # Luôn cập nhật dấu thời gian
            status_data['lastUpdated'] = datetime.utcnow()

            # Sử dụng set(data, merge=True) để upsert
            await run_in_threadpool(doc_ref.set, status_data, merge=True)
            logger.info(f"Status for zone {zone_id} updated successfully.")

            # Lấy lại dữ liệu đầy đủ sau khi cập nhật để trả về
            updated_doc = await self.get_zone_status(zone_id)
            return updated_doc

        except Exception as e:
            logger.error(f"Error updating status for zone {zone_id}: {str(e)}")
            return None
        
    async def delete_status_for_zone(self, zone_id: str) -> bool:
        try:
            # Truy vấn trực tiếp bằng zone_id
            doc_ref = self.collection.document(zone_id)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"Deleted status for zone {zone_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting status for zone {zone_id}: {e}", exc_info=True)
            return False
        
    async def get_status_by_zone_id(self, zone_id: str) -> dict:
        """
        Lấy document status của một zone bằng ID.
        Đây là một alias cho get_zone_status để nhất quán.
        """
        status = await self.get_zone_status(zone_id)
        return status if status is not None else {}