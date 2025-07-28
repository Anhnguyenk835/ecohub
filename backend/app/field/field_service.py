from typing import Dict, List, Optional, Any
from datetime import datetime
from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class FieldService:
    """Service class for managing field operations in Firestore."""
    
    def __init__(self, collection_name: str = "fields"):
        """Initialize FieldService with collection name."""
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)
    
    async def create_field(self, field_data: Dict[str, Any]) -> Optional[str]:
        """
        Create a new field document in Firestore.
        
        Args:
            field_data (Dict[str, Any]): Field data to be stored
            
        Returns:
            Optional[str]: Document ID if successful, None otherwise
        """
        try:
            # Add timestamp for creation
            field_data['created_at'] = datetime.utcnow()
            field_data['updated_at'] = datetime.utcnow()
            
            # Add the document to Firestore
            doc_ref = self.collection.add(field_data)
            doc_id = doc_ref[1].id
            
            logger.info(f"Field created successfully with ID: {doc_id}")
            return doc_id
            
        except Exception as e:
            logger.error(f"Error creating field: {str(e)}")
            return None
    
    async def get_field(self, field_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a field document by ID.
        
        Args:
            field_id (str): The document ID to retrieve
            
        Returns:
            Optional[Dict[str, Any]]: Field data if found, None otherwise
        """
        try:
            doc_ref = self.collection.document(field_id)
            doc = doc_ref.get()
            
            if doc.exists:
                field_data = doc.to_dict()
                field_data['id'] = doc.id
                logger.info(f"Field retrieved successfully: {field_id}")
                return field_data
            else:
                logger.warning(f"Field not found: {field_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error retrieving field {field_id}: {str(e)}")
            return None
    
    async def get_all_fields(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get all field documents.
        
        Args:
            limit (Optional[int]): Maximum number of documents to retrieve
            
        Returns:
            List[Dict[str, Any]]: List of field documents
        """
        try:
            query = self.collection
            
            if limit:
                query = query.limit(limit)
            
            docs = query.stream()
            
            fields = []
            for doc in docs:
                field_data = doc.to_dict()
                field_data['id'] = doc.id
                fields.append(field_data)
            
            logger.info(f"Retrieved {len(fields)} fields")
            return fields
            
        except Exception as e:
            logger.error(f"Error retrieving fields: {str(e)}")
            return []
    
    async def update_field(self, field_id: str, field_data: Dict[str, Any]) -> bool:
        """
        Update a field document.
        
        Args:
            field_id (str): The document ID to update
            field_data (Dict[str, Any]): Data to update
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Add timestamp for update
            field_data['updated_at'] = datetime.utcnow()
            
            doc_ref = self.collection.document(field_id)
            doc_ref.update(field_data)
            
            logger.info(f"Field updated successfully: {field_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating field {field_id}: {str(e)}")
            return False
    
    async def delete_field(self, field_id: str) -> bool:
        """
        Delete a field document.
        
        Args:
            field_id (str): The document ID to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            doc_ref = self.collection.document(field_id)
            doc_ref.delete()
            
            logger.info(f"Field deleted successfully: {field_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting field {field_id}: {str(e)}")
            return False
