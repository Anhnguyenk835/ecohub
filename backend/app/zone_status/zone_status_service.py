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
            doc_id = self._get_doc_id(zone_id)
            doc_ref = self.collection.document(doc_id)
            doc = await run_in_threadpool(doc_ref.get)

            if doc.exists:
                status_data = doc.to_dict()
                # Thêm ID của zone vào để response model có thể sử dụng
                status_data['id'] = zone_id
                return status_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving status for zone {zone_id}: {str(e)}")
            return None

    async def update_zone_status(self, zone_id: str, status_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Tạo mới hoặc cập nhật (upsert) trạng thái của một khu vực.
        Sử dụng `set` với `merge=True` để cập nhật các trường được cung cấp
        mà không ghi đè toàn bộ document.
        """
        try:
            doc_id = self._get_doc_id(zone_id)
            doc_ref = self.collection.document(doc_id)

            # Luôn cập nhật dấu thời gian
            status_data['lastUpdated'] = datetime.utcnow()

            # Sử dụng set(data, merge=True) là phương pháp hiệu quả để upsert trong Firestore
            await run_in_threadpool(doc_ref.set, status_data, merge=True)
            logger.info(f"Status for zone {zone_id} updated successfully.")

            # Lấy lại dữ liệu đầy đủ sau khi cập nhật để trả về
            updated_doc = await self.get_zone_status(zone_id)
            return updated_doc

        except Exception as e:
            logger.error(f"Error updating status for zone {zone_id}: {str(e)}")
            return None