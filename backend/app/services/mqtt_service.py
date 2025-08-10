import json
import paho.mqtt.client as mqtt
from app.config import settings
from app.utils.logger import get_logger
from app.services.database import db  # Giả sử bạn có firebase_service

logger = get_logger(__name__)

# Initialize MQTT Client
mqtt_client = mqtt.Client(client_id=settings.mqtt_client_id,
                          callback_api_version=mqtt.CallbackAPIVersion.VERSION1)

def on_connect(client, userdata, flags, rc):
    """Callback for when the client connects to the broker."""
    if rc == 0:
        logger.info(f"Successfully connected to MQTT Broker: {settings.mqtt_broker_host}")
        # Subscribe to the topic upon connection
        client.subscribe(settings.mqtt_topic)
        logger.info(f"Subscribed to topic: {settings.mqtt_topic}")
    else:
        logger.error(f"Failed to connect to MQTT Broker, return code {rc}\n")

def automatic_handle_sensor_logic(sensor_data: dict):
    """
    Kiểm tra dữ liệu cảm biến và quyết định có cần gửi lệnh điều khiển không.
    sensor_data là một dictionary đã được parse từ JSON.
    """
    try:
        # Lấy các giá trị cần thiết từ dữ liệu
        temperature = sensor_data.get("Temperature")
        humidity = sensor_data.get("Humidity")
        soil_moisture = sensor_data.get("Soil Moisture")
        is_running = sensor_data.get("is_running", False)
        running_device = sensor_data.get("running_device", "none")

        if is_running:
            logger.info(f"Logic: Device '{running_device}' is currently running. No new commands will be sent.")
            return

        # --- Logic cho Quạt (Fan) ---
        # Chỉ kiểm tra khi hệ thống đang rảnh (is_running = False)
        if temperature is not None:
            if temperature > settings.TEMP_THRESHOLD_HIGH:
                logger.info(f"Logic: High temperature ({temperature}°C). Turning fan ON.")
                publish_command("TURN_FAN_ON")
                return # Gửi lệnh xong thì thoát, không kiểm tra các điều kiện khác

        # --- Logic cho Đèn sưởi (Heater) ---
        # Chỉ kiểm tra khi hệ thống đang rảnh
        if temperature is not None:
            if temperature < settings.TEMP_THRESHOLD_LOW:
                logger.info(f"Logic: Low temperature ({temperature}°C). Turning heater ON.")
                publish_command("TURN_HEATER_ON")
                return # Gửi lệnh xong thì thoát

        # --- Logic cho Máy bơm (Pump) ---
        # Chỉ kiểm tra khi hệ thống đang rảnh
        if soil_moisture is not None:
            if soil_moisture < settings.SOIL_MOISTURE_THRESHOLD_LOW:
                logger.info(f"Logic: Low soil moisture ({soil_moisture}%). Turning pump ON.")
                publish_command("PUMP_WATER_ON")
                return # Gửi lệnh xong thì thoát

    except Exception as e:
        logger.error(f"Error in handle_sensor_logic: {e}")

def on_message(client, userdata, msg):
    """Callback for when a message is received from the broker."""
    if msg.topic == settings.mqtt_topic:
        try:
            payload = msg.payload.decode('utf-8')
            logger.info(f"Received message on topic {msg.topic}: {payload}")
            
            data = json.loads(payload)
            logger.info("Successfully parsed JSON data.")

            # Lưu dữ liệu vào Firestore
            doc_ref = db.collection('sensor_data').add(data)
            logger.info(f"Data saved to Firestore with document ID: {doc_ref[1].id}")

            automatic_handle_sensor_logic(data)

        except json.JSONDecodeError:
            logger.error(f"Failed to decode JSON from payload: {msg.payload.decode()}")
        except Exception as e:
            logger.error(f"An error occurred in on_message: {e}")
    else:
        logger.warning(f"Received message on an unexpected topic: {msg.topic}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

def publish_command(command: str):
    """Publishes a command to the command topic."""
    try:
        topic = settings.mqtt_command_topic
        if not topic:
            logger.error("MQTT_COMMAND_TOPIC is not set. Cannot publish command.")
            return False
        result = mqtt_client.publish(topic, command)
        # result.is_published() sẽ trả về True nếu thành công
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"Successfully published command '{command}' to topic '{topic}'")

            logger.info(f"ACTION LOGGED: Command '{command}' sent to devices.")

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
