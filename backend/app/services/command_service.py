import json
import paho.mqtt.client as mqtt
from app.config import settings
from app.utils.logger import get_logger
from app.action_log.action_log_service import ActionLogService
import asyncio

logger = get_logger(__name__)

# Initialize action log service
action_log_service = ActionLogService()

# Global MQTT client reference - will be set by MQTT service
_mqtt_client = None

def set_mqtt_client(client):
    """Set the MQTT client reference from MQTT service."""
    global _mqtt_client
    _mqtt_client = client

def publish_command(zone_id: str, command: str, user_info: dict = None):
    """Publish a command to MQTT broker for a specific zone."""
    try:
        if not _mqtt_client:
            logger.error("MQTT client not initialized")
            return False
            
        command_topic = f"ecohub/{zone_id}/commands"
        result = _mqtt_client.publish(command_topic, command)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"Successfully published command '{command}' to topic '{command_topic}'")
            
            # Log action if user info is provided
            if user_info and user_info.get("uid"):
                log_data = {
                    "userId": user_info["uid"],
                    "userName": user_info.get("name", "N/A"),
                    "zoneId": zone_id,
                    "action": "SEND_COMMAND",
                    "details": f"User sent command '{command}' from notification.",
                    "status": "SUCCESS"
                }
                # Run asynchronously to avoid blocking
                asyncio.create_task(action_log_service.create_action_log(log_data))
                logger.info(f"Action log created for user {user_info['uid']} sending command {command}")

            return True
        else:
            logger.error(f"Failed to publish command '{command}'. Return code: {result.rc}")
            return False
            
    except Exception as e:
        logger.error(f"Exception while publishing command: {e}")
        return False

def publish_scheduled_command(zone_id: str, command: str):
    """Publish a scheduled command to MQTT broker (without user info)."""
    try:
        if not _mqtt_client:
            logger.error("MQTT client not initialized")
            return False
            
        command_topic = f"ecohub/{zone_id}/commands"
        result = _mqtt_client.publish(command_topic, command)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"Successfully published scheduled command '{command}' to topic '{command_topic}'")
            return True
        else:
            logger.error(f"Failed to publish scheduled command '{command}'. Return code: {result.rc}")
            return False
            
    except Exception as e:
        logger.error(f"Exception while publishing scheduled command: {e}")
        return False
