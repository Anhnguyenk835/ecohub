from typing import Dict, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)


class UserService:
    """Service class for managing user profiles in Firestore (keyed by Firebase UID)."""

    def __init__(self, collection_name: str = "users"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_or_update_profile(self, uid: str, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update a user profile by Firebase UID."""
        now = datetime.utcnow()
        profile.setdefault("createdAt", now)
        profile["updatedAt"] = now

        doc_ref = self.collection.document(uid)
        await run_in_threadpool(doc_ref.set, profile, True)
        result = profile.copy()
        result["uid"] = uid
        return result

    async def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        try:
            doc_ref = self.collection.document(uid)
            doc = await run_in_threadpool(doc_ref.get)
            if not doc.exists:
                return None
            data = doc.to_dict()
            data["uid"] = uid
            return data
        except Exception as e:
            logger.error(f"Error retrieving user {uid}: {str(e)}")
            return None

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        try:
            query = self.collection.where('email', '==', email).limit(1)
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                data = doc.to_dict()
                data['uid'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error finding user by email {email}: {str(e)}")
            return None

    async def update_user(self, uid: str, profile: Dict[str, Any]) -> bool:
        try:
            profile['updatedAt'] = datetime.utcnow()
            doc_ref = self.collection.document(uid)
            await run_in_threadpool(doc_ref.update, profile)
            logger.info(f"User updated successfully: {uid}")
            return True
        except Exception as e:
            logger.error(f"Error updating user {uid}: {str(e)}")
            return False

    async def delete_user(self, uid: str) -> bool:
        try:
            doc_ref = self.collection.document(uid)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"User deleted successfully: {uid}")
            return True
        except Exception as e:
            logger.error(f"Error deleting user {uid}: {str(e)}")
            return False