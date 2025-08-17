import asyncio
from contextlib import asynccontextmanager

from pydantic import BaseModel

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.utils.logger import get_logger

from app.field.field_route import router as field_router
from app.user.user_route import router as user_router
from app.zone.zone_route import router as zone_router
from app.sensor.sensor_route import router as sensor_router
from app.readings_history.reading_history_route import router as reading_history_router
from app.device.device_route import router as device_router
from app.crop_profile.crop_profile_route import router as crop_profile_router
from app.command.command_route import router as command_router
from app.alter.alter_route import router as alter_router
from app.actuator.actuator_route import router as actuator_router
from app.action_log.action_log_route import router as action_log_router

from app.services import mqtt_service
from app.services.firebase_auth import get_verified_user
# from app.middleware.auth import AuthMiddleware

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting FastAPI application...")
    
    # --- CONNECT MQTT ---
    mqtt_service.start_mqtt_service()

    yield  # Application is running
    
    # Shutdown
    mqtt_service.stop_mqtt_service()
    logger.info("Shutting down FastAPI application...")


# Create FastAPI application
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    lifespan=lifespan
)

origins = [
    "http://localhost:3000"
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # Configure this appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach global auth middleware
# app.add_middleware(AuthMiddleware)

class CommandRequest(BaseModel):
    command: str

@app.post("/zones/{zone_id}/command", status_code=200, tags=["Commands"])
async def send_command_to_zone_device(zone_id: str, request: CommandRequest, user=Depends(get_verified_user)):
    """
    Nhận một lệnh từ client (ví dụ: web dashboard) và publish nó
    đến topic MQTT để thiết bị IoT thực thi.
    """
    # Danh sách các lệnh hợp lệ để bảo mật và tránh lỗi
    valid_commands = [
        "TURN_FAN_ON", "TURN_FAN_OFF",
        "TURN_HEATER_ON", "TURN_HEATER_OFF",
        "PUMP_WATER_ON", "PUMP_WATER_OFF",
        "TURN_LIGHT_ON", "TURN_LIGHT_OFF"
    ]
    
    if request.command not in valid_commands:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid command. Valid commands are: {valid_commands}"
        )
        
    logger.info(f"Received API request to send command: {request.command} to zone '{zone_id}'")
    
    # Gọi hàm publish từ mqtt_service
    success = mqtt_service.publish_command(zone_id, request.command, user_info=user)
    
    if success:
        return {"status": "success", "message": f"Command '{request.command}' published zone '{zone_id}' successfully."}
    else:
        raise HTTPException(
            status_code=500, 
            detail="Failed to publish command to MQTT broker for zone '{zone_id}."
        )

# Include API routes
# app.include_router(field_router)
app.include_router(user_router)
app.include_router(zone_router)
app.include_router(sensor_router)
app.include_router(reading_history_router)
app.include_router(device_router)
app.include_router(crop_profile_router)
app.include_router(command_router)
app.include_router(alter_router)
app.include_router(actuator_router)
app.include_router(action_log_router)

@app.middleware("http")
async def log_requests(request, call_next):
    """Log all incoming requests."""
    start_time = asyncio.get_event_loop().time()
    
    response = await call_next(request)
    
    process_time = asyncio.get_event_loop().time() - start_time
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.4f}s"
    )
    
    return response

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {settings.api_host}:{settings.api_port}")
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower()
    )
