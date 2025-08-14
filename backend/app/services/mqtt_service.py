import asyncio
from datetime import datetime
import json
import paho.mqtt.client as mqtt
from app.config import settings
from app.utils.logger import get_logger
from app.zone_status.zone_status_service import ZoneStatusService
from app.readings_history.reading_history_service import ReadingHistoryService
from app.sensor.sensor_service import SensorService
from app.services.database import db 
from app.zone.zone_service import ZoneService

logger = get_logger(__name__)

# Initialize MQTT Client
mqtt_client = mqtt.Client(client_id=settings.mqtt_client_id,
                          callback_api_version=mqtt.CallbackAPIVersion.VERSION1)

zone_status_service = ZoneStatusService()
reading_history_service = ReadingHistoryService()
sensor_service = SensorService()
zone_service = ZoneService()

async def evaluate_thresholds(zone_id: str, readings: dict, thresholds: dict) -> str:
    overall_status = "Good" 
    suggestion = None
    
    zone_info = await zone_service.get_zone(zone_id)
    zone_name = zone_info.get("name", zone_id) if zone_info else zone_id

    for sensor_type, settings in thresholds.items():
        if not settings or not settings.get("enabled"):
            continue

        if sensor_type in readings:
            current_value = readings[sensor_type]
            min_val = settings.get("min")
            max_val = settings.get("max")

            if sensor_type == "temperature":
                if current_value < min_val:
                    msg = f"Zone '{zone_name}': temperature is too low ({current_value})"
                    overall_status = "Too Cool" 
                    suggestion = "TURN_HEATER_ON"
                    publish_notification(zone_id, overall_status, msg, suggestion)

                    return overall_status, suggestion
                elif current_value > max_val:
                    msg = f"Zone '{zone_name}': temperature is too high ({current_value})"
                    overall_status = "Too Hot"
                    suggestion = "TURN_FAN_ON"
                    publish_notification(zone_id, overall_status, msg, suggestion)
                    return overall_status, suggestion
                
            if sensor_type == "soilMoisture":
                if current_value < min_val:
                    msg = f"Zone '{zone_name}': soil is too dry ({current_value}%). Watering is recommended."
                    overall_status = "Need water"
                    suggestion = "PUMP_WATER_ON"
                    publish_notification(zone_id, overall_status, msg, suggestion)
                    return overall_status, suggestion

            if sensor_type == "lightIntensity":
                if current_value < min_val:
                    msg = f"Zone '{zone_name}': Light intensity is too low ({current_value} lux)."
                    overall_status = "Need light"
                    suggestion = "TURN_LIGHT_ON"
                    publish_notification(zone_id, overall_status, msg, suggestion)
                    return overall_status, suggestion

            is_out_of_bounds = False
            # Min
            if min_val is not None and current_value < min_val:
                is_out_of_bounds = True
                logger.warning(f"THRESHOLD BREACH: {sensor_type} ({current_value}) is BELOW min ({min_val})")
            
            # Max
            if max_val is not None and current_value > max_val:
                is_out_of_bounds = True
                logger.warning(f"THRESHOLD BREACH: {sensor_type} ({current_value}) is ABOVE max ({max_val})")

            if is_out_of_bounds:
                overall_status = "Warning" 
    
    return overall_status, suggestion

def publish_notification(zone_id: str, alert_type: str, message: str, suggestion: str):
    """Gửi một thông báo/cảnh báo lên topic notifications của một zone cụ thể."""
    try:
        # Xây dựng topic notification động
        notification_topic = f"ecohub/{zone_id}/notifications"
        payload = {
            "type": alert_type,
            "message": message,
            "suggestion": suggestion
        }
        json_payload = json.dumps(payload)
        
        result = mqtt_client.publish(notification_topic, json_payload, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"NOTIFICATION SENT to '{notification_topic}': {message}")
        else:
            logger.error(f"Failed to send notification to '{notification_topic}'. RC: {result.rc}")
    except Exception as e:
        logger.error(f"Exception while publishing notification: {e}")

def publish_status_update(zone_id: str, status_payload: dict):
    """Gửi tin nhắn cập nhật trạng thái của một zone."""
    try:
        # Topic này dành riêng cho việc cập nhật UI
        update_topic = f"ecohub/zones/{zone_id}/status_update"
        json_payload = json.dumps(status_payload, default=str) # default=str để xử lý datetime
        
        result = mqtt_client.publish(update_topic, json_payload, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"STATUS UPDATE SENT to '{update_topic}'")
        else:
            logger.error(f"Failed to send status update to '{update_topic}'. RC: {result.rc}")
    except Exception as e:
        logger.error(f"Exception while publishing status update: {e}")

async def process_sensor_data(zone_id: str, payload_data: dict):
    logger.info(f"Processing data for zone_id: {zone_id}")
    now = datetime.utcnow() 

    readings = payload_data.get("readings", {})
    actuator_states = payload_data.get("actuatorStates", {})

    zone_doc = await zone_service.get_zone(zone_id)
    thresholds = zone_doc.get("thresholds", {})

    calculated_status, calculated_suggestion = await evaluate_thresholds(zone_id, payload_data, thresholds)
    logger.info(f"Calculated status for zone {zone_id} is: '{calculated_status}'")

    # Update collection zone_status
    try:
        status_update_payload = {
            "status": calculated_status, 
            "lastReadings": payload_data,
            "suggestion": calculated_suggestion
            # Bạn có thể thêm logic so sánh ngưỡng và cập nhật "status" ở đây
            # "status": calculate_overall_status(payload_data, thresholds)
        }
        
        # Call service for update
        updated_status = await zone_status_service.update_zone_status(zone_id, status_update_payload)
        logger.info(f"Successfully updated zone_status for zone_id: {zone_id}")

        if updated_status:
            publish_status_update(zone_id, updated_status)
            
    except Exception as e:
        logger.error(f"Error updating zone_status for zone_id {zone_id}: {e}", exc_info=True)
    

    # Update collection readings_history
    try:
        sensors_in_zone = await sensor_service.get_all_sensors(zone_id=zone_id)
        logger.info(f"DEBUG: Found {len(sensors_in_zone)} sensor(s) for zone_id '{zone_id}'.")

        if not sensors_in_zone:
            logger.warning(f"No sensors found for zone_id {zone_id}. Cannot save reading history.")
            return

        # Bước 2b: Tạo một "bản đồ tra cứu" từ type sang sensorId   
        sensor_map = {}
        for sensor in sensors_in_zone:
            sensor_id = sensor.get('id')
            measures = sensor.get('measures', [])
            if sensor_id and measures:
                for measure_type in measures:
                    sensor_map[measure_type] = sensor_id
        
        logger.debug(f"Built sensor map for zone {zone_id}: {sensor_map}")

        batch = db.batch()
        history_collection_ref = reading_history_service.collection
        records_to_create = 0

        for reading_type, value in payload_data.items():
            if reading_type == "actuatorStates" or not isinstance(value, (int, float)):
                continue

            sensor_id = sensor_map.get(reading_type)
            
            if sensor_id:
                history_doc_ref = history_collection_ref.document() 
                history_data = {
                    "readAt": now,
                    "sensorId": sensor_id,
                    "type": reading_type,
                    "value": float(value), 
                    "zoneId": zone_id
                }
                batch.set(history_doc_ref, history_data)
                records_to_create += 1
            else:
                logger.warning(f"No matching sensor found for reading type '{reading_type}' in zone {zone_id}.")

        # Bước 2d: Thực thi batch nếu có bản ghi để tạo
        if records_to_create > 0:
            await asyncio.to_thread(batch.commit)
            logger.info(f"Successfully saved {records_to_create} records to readings_history for zone {zone_id}.")

    except Exception as e:
        logger.error(f"Error saving to readings_history for zone_id {zone_id}: {e}", exc_info=True)

def on_connect(client, userdata, flags, rc):
    """Callback for when the client connects to the broker."""
    if rc == 0:
        logger.info(f"Successfully connected to MQTT Broker: {settings.mqtt_broker_host}")
        # Subscribe to the topic upon connection
        wildcard_topic = settings.mqtt_topic_pattern
        client.subscribe(wildcard_topic)

        notification_topic = settings.mqtt_notification_topic
        client.subscribe(notification_topic, qos=1)

        logger.info(f"Subscribed to topic: {wildcard_topic}")
    else:
        logger.error(f"Failed to connect to MQTT Broker, return code {rc}\n")

def on_message(client, userdata, msg):
    """Callback for when a message is received from the broker."""
    try:
        topic_parts = msg.topic.split('/')
        if len(topic_parts) == 3 and topic_parts[0] == "ecohub" and topic_parts[2] == "sensors":
            zone_id = topic_parts[1]
            payload_str = msg.payload.decode('utf-8')
            logger.info(f"Received message on topic {msg.topic} for zone_id {zone_id}")

            data = json.loads(payload_str)
            logger.debug("Successfully parsed JSON data.")

            asyncio.run(process_sensor_data(zone_id, data))
        else:
            logger.warning(f"Received message on an unhandled topic format: {msg.topic}")
    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON from payload: {msg.payload.decode()}")
    except Exception as e:
        logger.error(f"An error occurred in on_message: {e}", exc_info=True)

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

def publish_command(zone_id: str, command: str):
    """Gửi một lệnh điều khiển tới topic command của một zone cụ thể."""
    try:
        command_topic = f"ecohub/{zone_id}/commands"
        result = mqtt_client.publish(command_topic, command)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"Successfully published command '{command}' to topic '{command_topic}'")
            # TODO: Log hành động này vào collection action_logs
            return True
        else:
            logger.error(f"Failed to publish command '{command}'. Return code: {result.rc}")
            return False
    except Exception as e:
        logger.error(f"Exception while publishing command: {e}")
        return False
    
def connect_mqtt():
    """Connect to the MQTT broker."""
    try:
        logger.info("Connecting to MQTT broker...")
        mqtt_client.connect(settings.mqtt_broker_host, settings.mqtt_port, 60)
    except Exception as e:
        logger.error(f"Could not connect to MQTT broker: {e}")

def start_mqtt_service():
    """Start the MQTT client loop in a non-blocking way."""
    try:
        # Gán các hàm callback cho client
        mqtt_client.on_connect = on_connect
        mqtt_client.on_message = on_message
        
        logger.info("Connecting to MQTT broker...")
        mqtt_client.connect(settings.mqtt_broker_host, settings.mqtt_port, 60)
        
        # Bắt đầu vòng lặp trong một luồng riêng để không block chương trình chính
        mqtt_client.loop_start()
        logger.info("MQTT service started and loop is running.")
    except Exception as e:
        logger.error(f"Could not start MQTT service: {e}")

def stop_mqtt_service():
    """Hàm để dừng service MQTT một cách an toàn."""
    try:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        logger.info("MQTT service stopped.")
    except Exception as e:
        logger.error(f"Error stopping MQTT service: {e}")

def stop_mqtt_loop():
    """Stop the MQTT client loop."""
    mqtt_client.loop_stop()
    mqtt_client.disconnect()

    logger.info("MQTT service stopped.")
