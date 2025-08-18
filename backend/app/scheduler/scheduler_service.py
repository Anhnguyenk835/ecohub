from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger
from app.services.scheduler_service import apscheduler_service

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
            
            # Validate hour and minute format
            hour = schedule_data.get('hour')
            minute = schedule_data.get('minute')
            if not self._is_valid_time(hour, minute):
                logger.error(f"Invalid time: hour={hour}, minute={minute}. Expected hour 0-23, minute 0-59.")
                return None
            
            # Validate repetition-specific fields
            if not self._validate_repetition_fields(schedule_data):
                logger.error("Invalid repetition fields for schedule type")
                return None
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, schedule_data)
            
            logger.info(f"Schedule created successfully with ID: {doc_ref.id}")
            
            created_data = schedule_data.copy()
            created_data['id'] = doc_ref.id
            
            # Register schedule with APScheduler
            if created_data.get('isActive', True):
                await apscheduler_service.create_schedule_job(created_data)
                logger.info(f"Schedule registered with APScheduler: {doc_ref.id}")
            
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
                query = query.where(field_path='zoneid', op_string='==', value=zone_id)
            if device_id:
                query = query.where(field_path='deviceId', op_string='==', value=device_id)
            if device_type:
                query = query.where(field_path='deviceType', op_string='==', value=device_type)
            if is_active is not None:
                query = query.where(field_path='isActive', op_string='==', value=is_active)
            
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
        """Update schedule information by deleting current info and updating with new info."""
        try:
            # Get current schedule to preserve fields that should be reset
            current_schedule = await self.get_schedule(schedule_id)
            if not current_schedule:
                logger.error(f"Schedule {schedule_id} not found for update")
                return False
            
            # Prepare update data with null values for fields not being updated
            update_data = {
                'updatedAt': datetime.utcnow()
            }
            
            # Handle each field - if provided, use new value; if not provided, set to null
            fields_to_reset = [
                'name', 'deviceId', 'deviceType', 'action', 'command', 'hour', 'minute', 
                'repetition', 'date', 'daysOfWeek', 'dayOfMonth', 'isActive'
            ]
            
            for field in fields_to_reset:
                if field in schedule_data and schedule_data[field] is not None:
                    # Use the new value
                    update_data[field] = schedule_data[field]
                else:
                    # Set to null/empty value based on field type
                    if field in ['name', 'deviceId', 'action', 'command', 'date']:
                        update_data[field] = None
                    elif field in ['hour', 'minute', 'dayOfMonth']:
                        update_data[field] = None
                    elif field in ['daysOfWeek']:
                        update_data[field] = []
                    elif field == 'deviceType':
                        update_data[field] = None
                    elif field == 'repetition':
                        update_data[field] = None
                    elif field == 'isActive':
                        update_data[field] = False
            
            # Validate time if hour or minute is being updated
            if 'hour' in update_data or 'minute' in update_data:
                hour = update_data.get('hour', current_schedule.get('hour'))
                minute = update_data.get('minute', current_schedule.get('minute'))
                if not self._is_valid_time(hour, minute):
                    logger.error(f"Invalid time: hour={hour}, minute={minute}. Expected hour 0-23, minute 0-59.")
                    return False
            
            # Validate repetition fields if repetition is being updated
            if 'repetition' in update_data:
                if not self._validate_repetition_fields(update_data):
                    logger.error("Invalid repetition fields for schedule type")
                    return False
            
            # Update the document
            doc_ref = self.collection.document(schedule_id)
            await run_in_threadpool(doc_ref.update, update_data)
            
            # Log command update if it was changed
            if 'command' in update_data:
                logger.info(f"Schedule {schedule_id} command updated to: {update_data['command']}")
            
            logger.info(f"Schedule updated successfully: {schedule_id}")
            logger.info(f"Updated fields: {list(update_data.keys())}")
            
            # Update schedule in APScheduler
            updated_schedule = await self.get_schedule(schedule_id)
            if updated_schedule:
                await apscheduler_service.update_schedule_job(schedule_id, updated_schedule)
                logger.info(f"Schedule updated in APScheduler: {schedule_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating schedule {schedule_id}: {str(e)}")
            return False

    async def delete_schedule(self, schedule_id: str) -> bool:
        """Delete a schedule."""
        try:
            # Remove schedule from APScheduler first
            await apscheduler_service.delete_schedule_job(schedule_id)
            
            # Delete from Firestore
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
            query = self.collection.where(field_path='deviceId', op_string='==', value=device_id)
            docs = await run_in_threadpool(query.stream)
            
            # Remove schedules from APScheduler first
            for doc in docs:
                await apscheduler_service.delete_schedule_job(doc.id)
            
            # Delete from Firestore
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
            
            # Directly update only the isActive field to preserve all other data
            doc_ref = self.collection.document(schedule_id)
            await run_in_threadpool(doc_ref.update, update_data)
            
            logger.info(f"Schedule {schedule_id} status toggled to: {new_status}")
            
            # Toggle schedule in APScheduler
            await apscheduler_service.toggle_schedule_job(schedule_id, new_status, schedule)
            logger.info(f"Schedule toggled in APScheduler: {schedule_id} -> {new_status}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error toggling schedule status {schedule_id}: {str(e)}")
            return False

    def _is_valid_time(self, hour: Optional[int], minute: Optional[int]) -> bool:
        """Validate hour and minute format."""
        try:
            if hour is None or minute is None:
                return False
            
            if not isinstance(hour, int) or not isinstance(minute, int):
                return False
            
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
            # For weekly schedules, daysOfWeek is required (1-7 for Monday-Sunday)
            days_of_week = schedule_data.get('daysOfWeek')
            return (days_of_week is not None and 
                   isinstance(days_of_week, list) and 
                   all(1 <= day <= 7 for day in days_of_week))
        elif repetition == 'monthly':
            # For monthly schedules, dayOfMonth is required
            day_of_month = schedule_data.get('dayOfMonth')
            return day_of_month is not None and 1 <= day_of_month <= 31
        elif repetition == 'daily':
            # Daily schedules don't need additional fields
            return True
        else:
            return False
