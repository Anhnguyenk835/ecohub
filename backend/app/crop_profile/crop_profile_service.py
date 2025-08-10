from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class CropProfileService:
    """Service class for managing crop profile operations in Firestore."""
    
    def __init__(self, collection_name: str = "crop_profiles"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_crop_profile(self, profile_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một hồ sơ cây trồng mới."""
        try:
            now = datetime.utcnow()
            profile_data['createdAt'] = now
            profile_data['updatedAt'] = now
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, profile_data)
            
            logger.info(f"Crop profile created successfully with ID: {doc_ref.id}")
            
            created_data = profile_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating crop profile: {str(e)}")
            return None

    async def get_crop_profile(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin hồ sơ cây trồng bằng ID."""
        try:
            doc_ref = self.collection.document(profile_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                profile_data = doc.to_dict()
                profile_data['id'] = doc.id
                return profile_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving crop profile {profile_id}: {str(e)}")
            return None

    async def get_all_crop_profiles(self) -> List[Dict[str, Any]]:
        """Lấy tất cả các hồ sơ cây trồng."""
        profiles = []
        try:
            docs = await run_in_threadpool(self.collection.stream)
            for doc in docs:
                profile_data = doc.to_dict()
                profile_data['id'] = doc.id
                profiles.append(profile_data)
            return profiles
        except Exception as e:
            logger.error(f"Error finding crop profiles: {str(e)}")
            return []

    async def update_crop_profile(self, profile_id: str, profile_data: Dict[str, Any]) -> bool:
        """Cập nhật thông tin hồ sơ cây trồng."""
        try:
            profile_data['updatedAt'] = datetime.utcnow()
            
            doc_ref = self.collection.document(profile_id)
            await run_in_threadpool(doc_ref.update, profile_data)
            
            logger.info(f"Crop profile updated successfully: {profile_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating crop profile {profile_id}: {str(e)}")
            return False

    async def delete_crop_profile(self, profile_id: str) -> bool:
        """Xóa một hồ sơ cây trồng."""
        try:
            doc_ref = self.collection.document(profile_id)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"Crop profile deleted successfully: {profile_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting crop profile {profile_id}: {str(e)}")
            return False