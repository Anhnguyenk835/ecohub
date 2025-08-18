from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Optional

from app.scheduler.scheduler_model import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from app.scheduler.scheduler_service import SchedulerService
from app.services.scheduler_service import apscheduler_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/schedules", tags=["schedules"])
scheduler_service = SchedulerService()

async def get_schedule_or_404(schedule_id: str) -> Dict:
    """Dependency to get schedule or return 404 error."""
    schedule = await scheduler_service.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Schedule with ID {schedule_id} not found")
    return schedule

@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(schedule_data: ScheduleCreate):
    """
    Create a new schedule for device automation.
    """
    created_schedule = await scheduler_service.create_schedule(schedule_data.dict())
    if not created_schedule:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create schedule")
    
    return ScheduleResponse(**created_schedule)

@router.get("/", response_model=List[ScheduleResponse])
async def get_all_schedules(
    zone_id: Optional[str] = Query(None, description="Filter schedules by zone ID"),
    device_id: Optional[str] = Query(None, description="Filter schedules by device ID"),
    device_type: Optional[str] = Query(None, description="Filter schedules by device type"),
    is_active: Optional[bool] = Query(None, description="Filter schedules by active status")
):
    """
    Get all schedules with optional filtering.
    """
    schedules = await scheduler_service.get_all_schedules(zone_id, device_id, device_type, is_active)
    return [ScheduleResponse(**schedule) for schedule in schedules]

@router.get("/device/{device_id}", response_model=List[ScheduleResponse])
async def get_schedules_by_device(device_id: str, zone_id: Optional[str] = Query(None, description="Filter by zone ID")):
    """
    Get all schedules for a specific device.
    """
    schedules = await scheduler_service.get_schedules_by_device(zone_id or "all", device_id)
    return [ScheduleResponse(**schedule) for schedule in schedules]

@router.get("/active", response_model=List[ScheduleResponse])
async def get_active_schedules(zone_id: Optional[str] = Query(None, description="Filter by zone ID")):
    """
    Get all active schedules.
    """
    schedules = await scheduler_service.get_active_schedules(zone_id)
    return [ScheduleResponse(**schedule) for schedule in schedules]

@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(schedule: dict = Depends(get_schedule_or_404)):
    """
    Get detailed information of a specific schedule by ID.
    """
    return ScheduleResponse(**schedule)

@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(schedule_data: ScheduleUpdate, schedule: dict = Depends(get_schedule_or_404)):
    """
    Update information of an existing schedule.
    """
    schedule_id = schedule['id']
    update_dict = schedule_data.dict(exclude_unset=True)

    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")

    success = await scheduler_service.update_schedule(schedule_id, update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update schedule")

    updated_schedule = await scheduler_service.get_schedule(schedule_id)
    return ScheduleResponse(**updated_schedule)

@router.patch("/{schedule_id}/toggle", response_model=ScheduleResponse)
async def toggle_schedule_status(schedule: dict = Depends(get_schedule_or_404)):
    """
    Toggle the active status of a schedule.
    """
    schedule_id = schedule['id']
    success = await scheduler_service.toggle_schedule_status(schedule_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not toggle schedule status")

    updated_schedule = await scheduler_service.get_schedule(schedule_id)
    return ScheduleResponse(**updated_schedule)

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(schedule: dict = Depends(get_schedule_or_404)):
    """
    Delete a schedule.
    """
    schedule_id = schedule['id']
    success = await scheduler_service.delete_schedule(schedule_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete schedule")
    return None

@router.delete("/device/{device_id}/all", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_schedules_for_device(device_id: str):
    """
    Delete all schedules for a specific device.
    """
    success = await scheduler_service.delete_schedules_by_device(device_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete schedules for device")
    return None

@router.get("/jobs/info", response_model=List[Dict])
async def get_all_jobs_info():
    """
    Get information about all scheduled jobs in APScheduler.
    """
    jobs = apscheduler_service.get_all_jobs()
    return jobs

@router.get("/jobs/{schedule_id}/info", response_model=Dict)
async def get_job_info(schedule_id: str):
    """
    Get information about a specific scheduled job in APScheduler.
    """
    job_info = apscheduler_service.get_job_info(schedule_id)
    if not job_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job with ID {schedule_id} not found")
    return job_info

@router.post("/reload", status_code=status.HTTP_200_OK)
async def reload_schedules():
    """
    Reload all schedules from Firestore and register them in APScheduler.
    Useful for manual reload or after backend restart.
    """
    try:
        # Get active schedules from Firestore
        active_schedules = await scheduler_service.get_active_schedules()
        
        # Reload them in APScheduler
        await apscheduler_service.reload_schedules(active_schedules)
        
        return {"status": "success", "message": f"Schedules reloaded successfully. {len(active_schedules)} active schedules found."}
    except Exception as e:
        logger.error(f"Error reloading schedules: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not reload schedules")
