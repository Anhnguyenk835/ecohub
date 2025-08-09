from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool
from passlib.context import CryptContext  # Thư viện để băm mật khẩu

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Khởi tạo context để băm và xác thực mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    """Service class for managing user operations in Firestore."""
    
    def __init__(self, collection_name: str = "users"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    def get_password_hash(self, password: str) -> str:
        """Băm mật khẩu."""
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Xác thực mật khẩu."""
        return pwd_context.verify(plain_password, hashed_password)
    
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo user mới, băm mật khẩu trước khi lưu."""
        try:
            # Băm mật khẩu
            hashed_password = self.get_password_hash(user_data.pop("password"))
            user_data["hashed_password"] = hashed_password
            
            # Thêm timestamps
            now = datetime.utcnow()
            user_data['createdAt'] = now
            user_data['updatedAt'] = now
            
            # Thêm document vào Firestore
            # Sử dụng run_in_threadpool để không block event loop
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, user_data)
            
            logger.info(f"User created successfully with ID: {doc_ref.id}")
            
            # Trả về dữ liệu đã tạo để không cần query lại
            created_data = user_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return None

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin user bằng ID."""
        try:
            doc_ref = self.collection.document(user_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                return user_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving user {user_id}: {str(e)}")
            return None
            
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Tìm user bằng email (hữu ích để kiểm tra trùng lặp)."""
        try:
            query = self.collection.where('email', '==', email).limit(1)
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                return user_data
            return None
        except Exception as e:
            logger.error(f"Error finding user by email {email}: {str(e)}")
            return None

    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Cập nhật thông tin user."""
        try:
            # Nếu có mật khẩu mới, băm nó
            if "password" in user_data:
                hashed_password = self.get_password_hash(user_data.pop("password"))
                user_data["hashed_password"] = hashed_password

            user_data['updatedAt'] = datetime.utcnow()
            
            doc_ref = self.collection.document(user_id)
            await run_in_threadpool(doc_ref.update, user_data)
            
            logger.info(f"User updated successfully: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {str(e)}")
            return False

    async def delete_user(self, user_id: str) -> bool:
        """Xóa user."""
        try:
            doc_ref = self.collection.document(user_id)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"User deleted successfully: {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {str(e)}")
            return False