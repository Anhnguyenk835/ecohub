import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor

from app.services.command_service import publish_scheduled_command
from app.utils.logger import get_logger

logger = get_logger(__name__)

class APSchedulerService:
    """Service class for managing APScheduler operations."""
    
    def __init__(self):
        self.scheduler = None
        self._initialize_scheduler()
    
    def _initialize_scheduler(self):
        """Initialize the APScheduler with appropriate configuration."""
        try:
            # Configure job stores and executors
            jobstores = {
                'default': MemoryJobStore()
            }
            
            executors = {
                'default': AsyncIOExecutor()
            }
            
            job_defaults = {
                'coalesce': False,
                'max_instances': 3
            }
            
            # Create scheduler
            self.scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                executors=executors,
                job_defaults=job_defaults,
                timezone='UTC'
            )
            
            logger.info("APScheduler initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize APScheduler: {str(e)}")
            raise
    
    async def start_scheduler(self):
        """Start the APScheduler."""
        try:
            if self.scheduler and not self.scheduler.running:
                self.scheduler.start()
                logger.info("APScheduler started successfully")
                
        except Exception as e:
            logger.error(f"Failed to start APScheduler: {str(e)}")
            raise
    
    def stop_scheduler(self):
        """Stop the APScheduler."""
        try:
            if self.scheduler and self.scheduler.running:
                self.scheduler.shutdown()
                logger.info("APScheduler stopped successfully")
        except Exception as e:
            logger.error(f"Failed to stop APScheduler: {str(e)}")
    
    async def create_schedule_job(self, schedule_data: Dict[str, Any]) -> bool:
        """Create a new scheduled job in APScheduler."""
        try:
            schedule_id = schedule_data.get('id')
            if not schedule_id:
                logger.error("Schedule ID is required to create job")
                return False
            
            # Remove existing job if it exists
            if self.scheduler.get_job(schedule_id):
                self.scheduler.remove_job(schedule_id)
            
            # Create the job based on repetition type
            job = await self._create_job_from_schedule(schedule_data)
            
            if job:
                logger.info(f"Schedule job created successfully: {schedule_id}")
                return True
            else:
                logger.error(f"Failed to create schedule job: {schedule_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating schedule job {schedule_data.get('id', 'unknown')}: {str(e)}")
            return False
    
    async def _create_job_from_schedule(self, schedule_data: Dict[str, Any]) -> Optional[Any]:
        """Create a job based on schedule repetition type."""
        try:
            schedule_id = schedule_data.get('id')
            zone_id = schedule_data.get('zoneid')
            device_id = schedule_data.get('deviceId')
            action = schedule_data.get('action')
            hour = schedule_data.get('hour')
            minute = schedule_data.get('minute')
            repetition = schedule_data.get('repetition')
            is_active = schedule_data.get('isActive', True)
            
            if not all([schedule_id, zone_id, device_id, action, hour is not None, minute is not None, repetition]):
                logger.error(f"Missing required fields for schedule {schedule_id}")
                return None
            
            if not is_active:
                logger.info(f"Schedule {schedule_id} is inactive, skipping job creation")
                return None
            
            # Create the job function
            command = schedule_data.get('command', action)  # Use command if available, fallback to action
            job_func = self._create_job_function(zone_id, device_id, command)
            
            # Schedule based on repetition type
            if repetition == 'once':
                return await self._schedule_once_job(schedule_data, job_func)
            elif repetition == 'daily':
                return await self._schedule_daily_job(schedule_data, job_func)
            elif repetition == 'weekly':
                return await self._schedule_weekly_job(schedule_data, job_func)
            elif repetition == 'monthly':
                return await self._schedule_monthly_job(schedule_data, job_func)
            else:
                logger.error(f"Unsupported repetition type: {repetition}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating job from schedule: {str(e)}")
            return None
    
    def _create_job_function(self, zone_id: str, device_id: str, command: str):
        """Create a job function that will be executed by APScheduler."""
        def execute_scheduled_action():
            try:
                logger.info(f"Executing scheduled command: {command} for device {device_id} in zone {zone_id}")
                
                # Publish command to MQTT
                success = publish_scheduled_command(zone_id, command)
                
                if success:
                    logger.info(f"Scheduled command executed successfully: {command}")
                else:
                    logger.error(f"Failed to execute scheduled command: {command}")
                    
            except Exception as e:
                logger.error(f"Error executing scheduled command: {str(e)}")
        
        return execute_scheduled_action
    
    async def _schedule_once_job(self, schedule_data: Dict[str, Any], job_func) -> Optional[Any]:
        """Schedule a one-time job."""
        try:
            schedule_id = schedule_data.get('id')
            date_str = schedule_data.get('date')
            hour = schedule_data.get('hour')
            minute = schedule_data.get('minute')
            
            if not date_str:
                logger.error(f"Date is required for once schedule {schedule_id}")
                return None
            
            # Parse date and create datetime
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                run_time = date_obj.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Check if the time has already passed
                if run_time <= datetime.utcnow():
                    logger.warning(f"Schedule {schedule_id} time has already passed, skipping")
                    return None
                
                # Schedule the job
                job = self.scheduler.add_job(
                    func=job_func,
                    trigger=DateTrigger(run_date=run_time),
                    id=schedule_id,
                    name=f"Once schedule: {schedule_data.get('name', 'Unknown')}",
                    replace_existing=True
                )
                
                logger.info(f"Once schedule job created: {schedule_id} at {run_time}")
                return job
                
            except ValueError as e:
                logger.error(f"Invalid date format for schedule {schedule_id}: {e}")
                return None
                
        except Exception as e:
            logger.error(f"Error scheduling once job: {str(e)}")
            return None
    
    async def _schedule_daily_job(self, schedule_data: Dict[str, Any], job_func) -> Optional[Any]:
        """Schedule a daily recurring job."""
        try:
            schedule_id = schedule_data.get('id')
            hour = schedule_data.get('hour')
            minute = schedule_data.get('minute')
            
            # Schedule daily job using cron trigger
            job = self.scheduler.add_job(
                func=job_func,
                trigger=CronTrigger(hour=hour, minute=minute),
                id=schedule_id,
                name=f"Daily schedule: {schedule_data.get('name', 'Unknown')}",
                replace_existing=True
            )
            
            logger.info(f"Daily schedule job created: {schedule_id} at {hour:02d}:{minute:02d}")
            return job
            
        except Exception as e:
            logger.error(f"Error scheduling daily job: {str(e)}")
            return None
    
    async def _schedule_weekly_job(self, schedule_data: Dict[str, Any], job_func) -> Optional[Any]:
        """Schedule a weekly recurring job."""
        try:
            schedule_id = schedule_data.get('id')
            hour = schedule_data.get('hour')
            minute = schedule_data.get('minute')
            days_of_week = schedule_data.get('daysOfWeek', [])
            
            if not days_of_week:
                logger.error(f"Days of week required for weekly schedule {schedule_id}")
                return None
            
            # Convert days to APScheduler format (0=Monday, 6=Sunday)
            # Our format uses 1=Monday, 7=Sunday, so we need to convert
            aps_days = [day - 1 for day in days_of_week]
            
            # Schedule weekly job using cron trigger
            job = self.scheduler.add_job(
                func=job_func,
                trigger=CronTrigger(day_of_week=','.join(map(str, aps_days)), hour=hour, minute=minute),
                id=schedule_id,
                name=f"Weekly schedule: {schedule_data.get('name', 'Unknown')}",
                replace_existing=True
            )
            
            logger.info(f"Weekly schedule job created: {schedule_id} on days {days_of_week} at {hour:02d}:{minute:02d}")
            return job
            
        except Exception as e:
            logger.error(f"Error scheduling weekly job: {str(e)}")
            return None
    
    async def _schedule_monthly_job(self, schedule_data: Dict[str, Any], job_func) -> Optional[Any]:
        """Schedule a monthly recurring job."""
        try:
            schedule_id = schedule_data.get('id')
            hour = schedule_data.get('hour')
            minute = schedule_data.get('minute')
            day_of_month = schedule_data.get('dayOfMonth')
            
            if day_of_month is None:
                logger.error(f"Day of month required for monthly schedule {schedule_id}")
                return None
            
            # Schedule monthly job using cron trigger
            job = self.scheduler.add_job(
                func=job_func,
                trigger=CronTrigger(day=day_of_month, hour=hour, minute=minute),
                id=schedule_id,
                name=f"Monthly schedule: {schedule_data.get('name', 'Unknown')}",
                replace_existing=True
            )
            
            logger.info(f"Monthly schedule job created: {schedule_id} on day {day_of_month} at {hour:02d}:{minute:02d}")
            return job
            
        except Exception as e:
            logger.error(f"Error scheduling monthly job: {str(e)}")
            return None
    
    async def update_schedule_job(self, schedule_id: str, schedule_data: Dict[str, Any]) -> bool:
        """Update an existing scheduled job."""
        try:
            # Remove existing job
            if self.scheduler.get_job(schedule_id):
                self.scheduler.remove_job(schedule_id)
            
            # Create new job with updated data
            return await self.create_schedule_job(schedule_data)
            
        except Exception as e:
            logger.error(f"Error updating schedule job {schedule_id}: {str(e)}")
            return False
    
    async def delete_schedule_job(self, schedule_id: str) -> bool:
        """Delete a scheduled job."""
        try:
            if self.scheduler.get_job(schedule_id):
                self.scheduler.remove_job(schedule_id)
                logger.info(f"Schedule job deleted: {schedule_id}")
                return True
            else:
                logger.warning(f"Schedule job not found: {schedule_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting schedule job {schedule_id}: {str(e)}")
            return False
    
    async def toggle_schedule_job(self, schedule_id: str, is_active: bool, schedule_data: Dict[str, Any] = None) -> bool:
        """Toggle a schedule job on/off."""
        try:
            if is_active:
                # Use provided schedule data or skip
                if schedule_data:
                    return await self.create_schedule_job(schedule_data)
                else:
                    logger.error(f"Schedule data required for activation of {schedule_id}")
                    return False
            else:
                # Remove job
                return await self.delete_schedule_job(schedule_id)
                
        except Exception as e:
            logger.error(f"Error toggling schedule job {schedule_id}: {str(e)}")
            return False
    
    async def reload_schedules(self, active_schedules: List[Dict[str, Any]] = None):
        """Reload all active schedules from Firestore and register them in APScheduler."""
        try:
            logger.info("Reloading schedules from Firestore...")
            
            # Clear existing jobs
            self.scheduler.remove_all_jobs()
            logger.info("Cleared existing scheduled jobs")
            
            # If no schedules provided, skip reloading
            if not active_schedules:
                logger.info("No schedules provided for reloading")
                return
            
            # Recreate jobs for active schedules
            success_count = 0
            for schedule in active_schedules:
                if await self.create_schedule_job(schedule):
                    success_count += 1
            
            logger.info(f"Successfully reloaded {success_count}/{len(active_schedules)} schedules")
            
        except Exception as e:
            logger.error(f"Error reloading schedules: {str(e)}")
    
    def get_job_info(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a scheduled job."""
        try:
            job = self.scheduler.get_job(schedule_id)
            if job:
                return {
                    'id': job.id,
                    'name': job.name,
                    'next_run_time': job.next_run_time,
                    'trigger': str(job.trigger)
                }
            return None
        except Exception as e:
            logger.error(f"Error getting job info for {schedule_id}: {str(e)}")
            return None
    
    def get_all_jobs(self) -> List[Dict[str, Any]]:
        """Get information about all scheduled jobs."""
        try:
            jobs = []
            for job in self.scheduler.get_jobs():
                jobs.append({
                    'id': job.id,
                    'name': job.name,
                    'next_run_time': job.next_run_time,
                    'trigger': str(job.trigger)
                })
            return jobs
        except Exception as e:
            logger.error(f"Error getting all jobs: {str(e)}")
            return []

# Global instance
apscheduler_service = APSchedulerService()
