import asyncio
from datetime import datetime, timedelta
import json
import paho.mqtt.client as mqtt
from fastapi.concurrency import run_in_threadpool
from app.config import settings
from app.utils.logger import get_logger
from app.zone_status.zone_status_service import ZoneStatusService
from app.readings_history.reading_history_service import ReadingHistoryService
from app.sensor.sensor_service import SensorService
from app.services.database import db 
from app.zone.zone_service import ZoneService
from app.action_log.action_log_service import ActionLogService
from app.services.command_service import set_mqtt_client, publish_command
from app.services.notification_service import notification_service

logger = get_logger(__name__)

# Initialize MQTT Client
mqtt_client = mqtt.Client(client_id=settings.mqtt_client_id,
                          callback_api_version=mqtt.CallbackAPIVersion.VERSION1)

zone_status_service = ZoneStatusService()
reading_history_service = ReadingHistoryService()
sensor_service = SensorService()
zone_service = ZoneService()
action_log_service = ActionLogService()

def get_event_loop_status():
    """Get the current event loop status for debugging."""
    try:
        loop = asyncio.get_event_loop()
        return {
            "running": loop.is_running(),
            "closed": loop.is_closed(),
            "loop_id": id(loop)
        }
    except Exception as e:
        return {"error": str(e)}

async def evaluate_thresholds(zone_id: str, readings: dict, thresholds: dict) -> str:
    overall_status = "Good" 
    suggestion = None
    
    zone_info = await zone_service.get_zone(zone_id)
    zone_name = zone_info.get("name", zone_id) if zone_info else zone_id

    issue_status = []

    for sensor_type, settings in thresholds.items():
        if not settings or not settings.get("enabled") or sensor_type not in readings:
            continue

        if sensor_type in readings:
            current_value = readings[sensor_type]
            min_val = settings.get("min")
            max_val = settings.get("max")

            if sensor_type == "temperature":
                if current_value < min_val:
                    msg = f"Zone '{zone_name}': temperature is too low ({current_value}°C). Turning on heater is recommended."
                    overall_status = "Too Cool" 
                    suggestion = "TURN_HEATER_ON"
                    suggestion_text = "Activate Heater?"

                    issue_status.append({
                        "status": overall_status,
                        "message": msg,
                        "suggestion": suggestion,
                        "suggestion_text": suggestion_text,
                        "priority": 2
                     })
                elif current_value > max_val:
                    msg = f"Zone '{zone_name}': temperature is too high ({current_value}°C). Turning on fan is recommended."
                    overall_status = "Too Hot"
                    suggestion = "TURN_FAN_ON"
                    suggestion_text = "Activate Fan?"

                    issue_status.append({
                        "status": overall_status,
                        "message": msg,
                        "suggestion": suggestion,
                        "suggestion_text": suggestion_text,
                        "priority": 2
                     })
                
            if sensor_type == "soilMoisture":
                if current_value < min_val:
                    msg = f"Zone '{zone_name}': soil is too dry ({current_value}%). Turning on pump is recommended."
                    overall_status = "Need water"
                    suggestion = "PUMP_WATER_ON"
                    suggestion_text = "Activate Pump?"

                    issue_status.append({
                        "status": overall_status,
                        "message": msg,
                        "suggestion": suggestion,
                        "suggestion_text": suggestion_text,
                        "priority": 1
                     })

            if sensor_type == "lightIntensity":
                if current_value < min_val:
                    msg = f"Zone '{zone_name}': Light intensity is too low ({current_value} lux). Turning on light is recommended."
                    overall_status = "Need light"
                    suggestion = "TURN_LIGHT_ON"
                    
                    suggestion_text = "Activate Light?"

                    issue_status.append({
                        "status": overall_status,
                        "message": msg,
                        "suggestion": suggestion,
                        "suggestion_text": suggestion_text,
                        "priority": 0
                     })

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


    if not issue_status:
        return "Good", None

    issue_status.sort(key=lambda x: x["priority"], reverse=True)

    # Get the most critical issue for return value
    most_critical_issue = issue_status[0]
    overall_status = most_critical_issue["status"]
    suggestion = most_critical_issue["suggestion"]

    # Note: Email sending is now handled directly in process_sensor_data
    # when zone status is updated, not through publish_notification
    
    return overall_status, suggestion

def publish_notification(zone_id: str, alert_type: str, message: str, suggestion: str, suggestion_text: str):
    """Gửi một thông báo/cảnh báo lên topic notifications của một zone cụ thể."""
    try:
        # Xây dựng topic notification động
        notification_topic = f"ecohub/{zone_id}/notifications"
        payload = {
            "type": alert_type,
            "message": message,
            "suggestion": suggestion,
            "suggestion_text": suggestion_text
        }
        json_payload = json.dumps(payload)
        
        result = mqtt_client.publish(notification_topic, json_payload, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"NOTIFICATION SENT to '{notification_topic}': {message}")
        else:
            logger.error(f"Failed to send notification to '{notification_topic}'. RC: {result.rc}")
    except Exception as e:
        logger.error(f"Exception while publishing notification: {e}")

async def trigger_email_notifications(zone_id: str, notification: dict):
    """Trigger email notifications for a zone alert."""
    try:
        logger.info(f"🚨 ALERT RECEIVED - Zone: {zone_id}, Type: {notification.get('type')}, Message: {notification.get('message')}")
        logger.info(f"🔧 NOTIFICATION PAYLOAD - Zone: {zone_id}, Payload: {notification}")
        
        # Determine severity based on alert type
        severity = "info"
        if any(keyword in notification.get("type", "").lower() for keyword in ["hot", "cool", "high", "low"]):
            severity = "critical"
        elif any(keyword in notification.get("type", "").lower() for keyword in ["water", "light"]):
            severity = "warning"
        
        logger.info(f"📊 SEVERITY DETERMINED - Zone: {zone_id}, Severity: {severity}")
        
        # Add severity to notification
        notification_with_severity = {**notification, "severity": severity}
        logger.info(f"🔧 ENHANCED NOTIFICATION - Zone: {zone_id}, Enhanced: {notification_with_severity}")
        
        logger.info(f"📧 TRIGGERING EMAIL NOTIFICATIONS - Zone: {zone_id}, Severity: {severity}")
        logger.info(f"🔧 CALLING NOTIFICATION SERVICE - Zone: {zone_id}, Service: {notification_service}")
        
        # For now, we'll send to all users (you can modify this logic later)
        # In a real app, you'd get the current user from the context
        logger.info(f"📧 CALLING send_notification_emails - Zone: {zone_id}")
        result = await notification_service.send_notification_emails(zone_id, notification_with_severity)
        logger.info(f"📧 NOTIFICATION SERVICE RESULT - Zone: {zone_id}, Result: {result}")
        
        if result["success"]:
            logger.info(f"✅ EMAIL NOTIFICATIONS SUCCESS - Zone: {zone_id}, Emails Sent: {result['emails_sent']}/{result['total_users']}, Eligible Users: {result.get('eligible_users', 'N/A')}")
        else:
            logger.error(f"❌ EMAIL NOTIFICATIONS FAILED - Zone: {zone_id}, Error: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        logger.error(f"💥 CRITICAL ERROR in email notifications - Zone: {zone_id}, Error: {str(e)}")
        logger.exception(f"Full traceback for zone {zone_id}:")

async def send_direct_alert_email(zone_id: str, status: str, suggestion: str):
    """Send email directly when zone status changes to severe."""
    try:
        logger.info(f"📧 DIRECT EMAIL TRIGGERED - Zone: {zone_id}, Status: {status}, Suggestion: {suggestion}")
        
        # Get zone info for better email content
        zone_info = await zone_service.get_zone(zone_id)
        zone_name = zone_info.get("name", zone_id) if zone_info else zone_id
        
        # Get zone owner for email
        zone_owner_uid = zone_info.get("owner") if zone_info else None
        if not zone_owner_uid:
            logger.warning(f"⚠️ NO ZONE OWNER - Zone: {zone_id}, Cannot send email")
            return
        
        # Get user profile
        users_ref = db.collection("users")
        user_doc = await run_in_threadpool(users_ref.document(zone_owner_uid).get)
        
        if not user_doc.exists:
            logger.warning(f"⚠️ USER NOT FOUND - Zone: {zone_id}, UID: {zone_owner_uid}")
            return
        
        user_data = user_doc.to_dict()
        user_email = user_data.get("email")
        user_name = user_data.get("displayName", "User")
        
        if not user_email or not user_data.get("emailVerified", False):
            logger.warning(f"⚠️ USER NOT ELIGIBLE - Zone: {zone_id}, Email: {user_email}, Verified: {user_data.get('emailVerified')}")
            return
        
        logger.info(f"👤 USER FOUND FOR EMAIL - Zone: {zone_id}, Email: {user_email}, Name: {user_name}")
        
        # Create email notification
        notification_data = {
            "type": status,
            "message": f"Zone '{zone_name}' status changed to: {status}",
            "suggestion": suggestion,
            "severity": "critical" if status in ["Too Hot", "Too Cool"] else "warning",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        logger.info(f"📧 SENDING DIRECT ALERT EMAIL - Zone: {zone_id}, Recipient: {user_email}")
        
        # Import email service
        from app.services.email_service import email_service
        
        # Send email directly
        success = await email_service.send_notification_email(
            user_email,
            user_name,
            notification_data,
            zone_id
        )
        
        if success:
            logger.info(f"✅ DIRECT ALERT EMAIL SENT - Zone: {zone_id}, Recipient: {user_email}")
        else:
            logger.error(f"❌ DIRECT ALERT EMAIL FAILED - Zone: {zone_id}, Recipient: {user_email}")
            
    except Exception as e:
        logger.error(f"💥 ERROR in direct alert email - Zone: {zone_id}, Error: {str(e)}")
        logger.exception(f"Direct email error details for zone {zone_id}:")

def publish_completion_notification(zone_id: str, completed_command: str):
    """Gửi một thông báo đặc biệt để báo hiệu một hành động đã hoàn thành."""
    try:
        notification_topic = f"ecohub/{zone_id}/notifications"
        payload = {
            "type": "Action Completed",
            "message": f"Action '{completed_command}' has finished.",
            "is_completion_signal": True,        # Cờ đặc biệt
            "completed_command": completed_command # Lệnh nào đã hoàn thành
        }
        json_payload = json.dumps(payload)
        
        result = mqtt_client.publish(notification_topic, json_payload, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"COMPLETION SIGNAL SENT to '{notification_topic}' for command '{completed_command}'")
        else:
            logger.error(f"Failed to send completion signal. RC: {result.rc}")
    except Exception as e:
        logger.error(f"Exception while publishing completion signal: {e}")

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
            
                    # Send email directly if status is severe
        # This bypasses the complex notification system and sends emails immediately
        if calculated_status in ["Too Hot", "Too Cool", "Need water", "Need light"]:
            logger.info(f"🚨 SEVERE STATUS DETECTED - Zone: {zone_id}, Status: {calculated_status}")
            await send_direct_alert_email(zone_id, calculated_status, calculated_suggestion)
            
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

        logger.info(f"Subscribed to topic: {wildcard_topic}")

        notification_topic = settings.mqtt_notification_topic
        client.subscribe(notification_topic, qos=1)

        logger.info(f"Subscribed to topic: {notification_topic}")

        feedback_topic = "ecohub/+/command_feedback"
        client.subscribe(feedback_topic, qos=1)
        logger.info(f"Subscribed to topic: {feedback_topic}")
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
        elif len(topic_parts) == 3 and topic_parts[0] == "ecohub" and topic_parts[2] == "command_feedback":
            zone_id = topic_parts[1]
            payload_str = msg.payload.decode('utf-8')
            logger.info(f"Received COMMAND FEEDBACK from zone '{zone_id}': {payload_str}")
            
            if payload_str.startswith("COMPLETED:"):
                completed_command = payload_str.split(":", 1)[1]
                # Gọi hàm để gửi tín hiệu hoàn thành lên cho frontend
                publish_completion_notification(zone_id, completed_command)
        else:
            logger.warning(f"Received message on an unhandled topic format: {msg.topic}")

    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON from payload: {msg.payload.decode()}")
    except Exception as e:
        logger.error(f"An error occurred in on_message: {e}", exc_info=True)

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message


    
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
        
        # Set the MQTT client reference in command service
        set_mqtt_client(mqtt_client)
        
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
