from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool
import asyncio

from app.services.database import db
from app.utils.logger import get_logger

from app.zone_status.zone_status_service import ZoneStatusService 
from app.device.device_service import DeviceService
from app.actuator.actuator_service import ActuatorService
from app.sensor.sensor_service import SensorService

logger = get_logger(__name__)

class ZoneService:
    """Service class for managing zone operations in Firestore."""
    
    def __init__(self, collection_name: str = "zones"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

        self.zone_status_service = ZoneStatusService()
        self.device_service = DeviceService()
        self.actuator_service = ActuatorService()
        self.sensor_service = SensorService()

    async def create_zone(self, zone_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một zone mới trong Firestore."""
        try:
            # Thêm timestamps
            now = datetime.utcnow()
            zone_data['createdAt'] = now
            zone_data['updatedAt'] = now
            
            # Thêm document vào Firestore
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, zone_data)
            zone_id = doc_ref.id
            logger.info(f"Zone created successfully with ID: {zone_id}")
            
            initial_status = await self.zone_status_service.create_initial_zone_status(zone_id)

            # Trả về dữ liệu đã tạo để không cần query lại
            created_data = zone_data.copy()
            created_data['id'] = zone_id

            default_device_data = {
                "name": f"Bộ điều khiển cho khu vực {zone_data.get('name', zone_id)}",
                "zoneId": zone_id
            }
            created_device = await self.device_service.create_device(default_device_data)
            if not created_device:
                logger.error(f"Failed to create default device for zone {zone_id}. Provisioning incomplete.")
                return created_data
            
            device_id = created_device['id']
            logger.info(f"Created default device {device_id} for zone {zone_id}")

            default_actuators = [
                {"name": "Máy bơm", "type": "WaterPump"},
                {"name": "Đèn LED", "type": "Light"},
                {"name": "Quạt thông gió", "type": "Fan"},
                {"name": "Máy sưởi", "type": "Heater"},
            ]

            default_sensors = [
                {"name": "Cảm biến nhiệt độ, độ ẩm không khí", "type": "DHT22", "measures": ["temperature", "airHumidity"]},
                {"name": "Cảm biến độ ẩm đất", "type": "Soil", "measures": ["soilMoisture"]},
                {"name": "Cảm biến ánh sáng", "type": "Light", "measures": ["lightIntensity"]},
                {"name": "Cảm biến pH", "type": "PH", "measures": ["ph"]},
                {"name": "Cảm biến CO2", "type": "CO2", "measures": ["co2"]},
            ]

            provisioning_tasks = []

            for actuator_data in default_actuators:
                actuator_data['zoneId'] = zone_id
                actuator_data['deviceId'] = device_id
                provisioning_tasks.append(self.actuator_service.create_actuator(actuator_data))
            
            for sensor_data in default_sensors:
                sensor_data['zoneId'] = zone_id
                sensor_data['deviceId'] = device_id
                provisioning_tasks.append(self.sensor_service.create_sensor(sensor_data))

            results = await asyncio.gather(*provisioning_tasks, return_exceptions=True)

            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Error during bulk provisioning for zone {zone_id}: Task {i} failed - {result}")
            
            logger.info(f"Finished hardware provisioning for zone {zone_id}.")

            await self.zone_status_service.create_initial_zone_status(zone_id)
            
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating zone: {str(e)}")
            return None

    async def get_zone(self, zone_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin zone bằng ID."""
        try:
            doc_ref = self.collection.document(zone_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                zone_data = doc.to_dict()
                zone_data['id'] = doc.id
                return zone_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving zone {zone_id}: {str(e)}")
            return None

    async def get_zones_by_owner(self, owner_id: str) -> List[Dict[str, Any]]:
        """Lấy tất cả các zone thuộc về một owner."""
        zones = []
        try:
            query = self.collection.where('owner', '==', owner_id)
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                zone_data = doc.to_dict()
                zone_data['id'] = doc.id
                zones.append(zone_data)
            return zones
        except Exception as e:
            logger.error(f"Error finding zones for owner {owner_id}: {str(e)}")
            return []

    async def update_zone(self, zone_id: str, zone_data: Dict[str, Any]) -> bool:
        """Cập nhật thông tin zone."""
        try:
            zone_data['updatedAt'] = datetime.utcnow()
            
            doc_ref = self.collection.document(zone_id)
            await run_in_threadpool(doc_ref.update, zone_data)
            
            logger.info(f"Zone updated successfully: {zone_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating zone {zone_id}: {str(e)}")
            return False

    async def delete_zone(self, zone_id: str) -> bool:
        """Xóa một zone."""
        logger.info(f"Initiating cascade delete for zone {zone_id}...")
        
        try:
          
            deletion_tasks = [
                run_in_threadpool(self.collection.document(zone_id).delete),
                
                self.zone_status_service.delete_status_for_zone(zone_id),
       
                self.device_service.delete_devices_by_zone(zone_id),

                self.actuator_service.delete_actuators_by_zone(zone_id),

                self.sensor_service.delete_sensors_by_zone(zone_id),
            ]

            results = await asyncio.gather(*deletion_tasks, return_exceptions=True)

            all_successful = True
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Error in cascade delete for zone {zone_id}, task {i} failed: {result}")
                    all_successful = False
            
            if all_successful:
                logger.info(f"Successfully completed cascade delete for zone {zone_id}")
            else:
                logger.warning(f"Cascade delete for zone {zone_id} completed with some errors.")

            return all_successful

        except Exception as e:
            logger.error(f"A critical error occurred during cascade delete for zone {zone_id}: {e}", exc_info=True)
            return False