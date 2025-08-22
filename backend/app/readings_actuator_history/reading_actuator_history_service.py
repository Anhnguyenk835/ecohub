from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class ReadingActuatorHistoryService:
    """Service class for managing actuator history logs."""
    
    def __init__(self, collection_name: str = "readings_actuator_history"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_actuator_log(self, actuator_log_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            actuator_log_data['readAt'] = datetime.utcnow()
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, actuator_log_data)
            
            logger.info(f"Actuator history record created successfully with ID: {doc_ref.id}")
            
            created_data = actuator_log_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating actuator history record: {str(e)}")
            return None

    async def get_actuator_logs(
        self,
        zone_id: str,
        actuator_id: Optional[str] = None,
        type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
 
        try:
            query = self.collection.where(field_path='zoneId', op_string='==', value=zone_id)
            
            # Xây dựng truy vấn dựa trên các tham số được cung cấp
            if actuator_id:
                query = query.where(field_path='actuatorId', op_string='==', value=actuator_id)
            if type:
                query = query.where(field_path='type', op_string='==', value=type)
       
            docs_stream = await run_in_threadpool(query.stream)
            
            logs = []
            for doc in docs_stream:
                log_data = doc.to_dict()
                log_data['id'] = doc.id
                logs.append(log_data)
            

            logs.sort(key=lambda x: x.get('readAt', datetime.min), reverse=True)
            
            return logs
        except Exception as e:
            logger.error(f"Error finding actuator history: {str(e)}")
            return []

