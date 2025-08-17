from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class SchedulerService:
    """Service class for managing schedule operations in Firestore."""
    
    def __init__(self, collection_name: str = "schedules"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_schedule(self, schedule_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new schedule in Firestore."""
        try:
            now = datetime.utcnow()
            schedule_data['createdAt'] = now
            schedule_data['updatedAt'] = now
            
            # Validate time format (HH:MM)
            time_str = schedule_data.get('time', '')
            if not self._is_valid_time_format(time_str):
                logger.error(f"Invalid time format: {time_str}. Expected HH:MM format.")
                return None
            
            # Validate repetition-specific fields
            if not self._validate_repetition_fields(schedule_data):
                logger.error("Invalid repetition fields for schedule type")
                return None
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, schedule_data)
            
            logger.info(f"Schedule created successfully with ID: {doc_ref.id}")
            
            created_data = schedule_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating schedule: {str(e)}")
            return None

    async def get_schedule(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        """Get schedule information by ID."""
        try:
            doc_ref = self.collection.document(schedule_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                schedule_data = doc.to_dict()
                schedule_data['id'] = doc.id
                return schedule_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving schedule {schedule_id}: {str(e)}")
            return None

    async def get_all_schedules(self, zone_id: Optional[str] = None, device_id: Optional[str] = None, 
                               device_type: Optional[str] = None,
                               is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get all schedules, optionally filtered by zone_id, device_id, device_type, or active status."""
        schedules = []
        try:
            query = self.collection
            
            if zone_id:
                query = query.where('zoneid', '==', zone_id)
            if device_id:
                query = query.where('deviceId', '==', device_id)
            if device_type:
                query = query.where('deviceType', '==', device_type)
            if is_active is not None:
                query = query.where('isActive', '==', is_active)
            
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                schedule_data = doc.to_dict()
                schedule_data['id'] = doc.id
                schedules.append(schedule_data)
            return schedules
        except Exception as e:
            logger.error(f"Error finding schedules: {str(e)}")
            return []

    async def get_schedules_by_device(self, zone_id: str, device_id: str) -> List[Dict[str, Any]]:
        """Get all schedules for a specific device in a specific zone."""
        return await self.get_all_schedules(zone_id=zone_id, device_id=device_id)

    async def get_active_schedules(self, zone_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all active schedules, optionally filtered by zone."""
        return await self.get_all_schedules(zone_id=zone_id, is_active=True)

    async def update_schedule(self, schedule_id: str, schedule_data: Dict[str, Any]) -> bool:
        """Update schedule information."""
        try:
            schedule_data['updatedAt'] = datetime.utcnow()
            
            # Validate time format if time is being updated
            if 'time' in schedule_data:
                time_str = schedule_data['time']
                if not self._is_valid_time_format(time_str):
                    logger.error(f"Invalid time format: {time_str}. Expected HH:MM format.")
                    return False
            
            # Validate repetition fields if repetition is being updated
            if 'repetition' in schedule_data:
                if not self._validate_repetition_fields(schedule_data):
                    logger.error("Invalid repetition fields for schedule type")
                    return False
            
            doc_ref = self.collection.document(schedule_id)
            await run_in_threadpool(doc_ref.update, schedule_data)
            
            logger.info(f"Schedule updated successfully: {schedule_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating schedule {schedule_id}: {str(e)}")
            return False

    async def delete_schedule(self, schedule_id: str) -> bool:
        """Delete a schedule."""
        try:
            doc_ref = self.collection.document(schedule_id)
            await run_in_threadpool(doc_ref.delete)
            logger.info(f"Schedule deleted successfully: {schedule_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting schedule {schedule_id}: {str(e)}")
            return False

    async def delete_schedules_by_device(self, device_id: str) -> bool:
        """Delete all schedules for a specific device."""
        try:
            query = self.collection.where('deviceId', '==', device_id)
            docs = await run_in_threadpool(query.stream)
            
            batch = db.batch()
            count = 0
            for doc in docs:
                batch.delete(doc.reference)
                count += 1
            
            if count > 0:
                await run_in_threadpool(batch.commit)
            
            logger.info(f"Deleted {count} schedules for device {device_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting schedules for device {device_id}: {e}", exc_info=True)
            return False

    async def toggle_schedule_status(self, schedule_id: str) -> bool:
        """Toggle the active status of a schedule."""
        try:
            schedule = await self.get_schedule(schedule_id)
            if not schedule:
                return False
            
            new_status = not schedule.get('isActive', True)
            update_data = {'isActive': new_status, 'updatedAt': datetime.utcnow()}
            
            success = await self.update_schedule(schedule_id, update_data)
            if success:
                logger.info(f"Schedule {schedule_id} status toggled to: {new_status}")
            return success
            
        except Exception as e:
            logger.error(f"Error toggling schedule status {schedule_id}: {str(e)}")
            return False

    def _is_valid_time_format(self, time_str: str) -> bool:
        """Validate time format (HH:MM)."""
        try:
            if not isinstance(time_str, str):
                return False
            
            parts = time_str.split(':')
            if len(parts) != 2:
                return False
            
            hour, minute = int(parts[0]), int(parts[1])
            return 0 <= hour <= 23 and 0 <= minute <= 59
        except (ValueError, TypeError):
            return False

    def _validate_repetition_fields(self, schedule_data: Dict[str, Any]) -> bool:
        """Validate repetition-specific fields based on repetition type."""
        repetition = schedule_data.get('repetition')
        
        if repetition == 'once':
            # For once schedules, date is required
            return 'date' in schedule_data and schedule_data['date'] is not None
        elif repetition == 'weekly':
            # For weekly schedules, daysOfWeek is required
            days_of_week = schedule_data.get('daysOfWeek')
            return (days_of_week is not None and 
                   isinstance(days_of_week, list) and 
                   all(0 <= day <= 6 for day in days_of_week))
        elif repetition == 'monthly':
            # For monthly schedules, dayOfMonth is required
            day_of_month = schedule_data.get('dayOfMonth')
            return day_of_month is not None and 1 <= day_of_month <= 31
        elif repetition == 'daily':
            # Daily schedules don't need additional fields
            return True
        else:
            return False
