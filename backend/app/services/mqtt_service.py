import json
import paho.mqtt.client as mqtt
from app.config import settings
from app.utils.logger import get_logger
from app.services.database import db  # Giả sử bạn có firebase_service

logger = get_logger(__name__)

def on_connect(client, userdata, flags, rc):
    """Callback for when the client connects to the broker."""
    if rc == 0:
        logger.info(f"Successfully connected to MQTT Broker: {settings.mqtt_broker_host}")
        # Subscribe to the topic upon connection
        client.subscribe(settings.mqtt_topic)
        logger.info(f"Subscribed to topic: {settings.mqtt_topic}")
    else:
        logger.error(f"Failed to connect to MQTT Broker, return code {rc}\n")

def on_message(client, userdata, msg):
    """Callback for when a message is received from the broker."""
    try:
        payload = msg.payload.decode('utf-8')
        logger.info(f"Received message on topic {msg.topic}: {payload}")
        
        # Parse the JSON data
        data = json.loads(payload)
        logger.info("Successfully parsed JSON data.")

        # Save data to Firestore
        # Giả sử collection của bạn tên là 'sensor_data'
        doc_ref = db.collection('sensor_data').add(data)
        logger.info(f"Data saved to Firestore with document ID: {doc_ref[1].id}")

    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON from payload: {msg.payload.decode()}")
    except Exception as e:
        logger.error(f"An error occurred in on_message: {e}")

# Initialize MQTT Client
mqtt_client = mqtt.Client(client_id=settings.mqtt_client_id)
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

def connect_mqtt():
    """Connect to the MQTT broker."""
    try:
        logger.info("Connecting to MQTT broker...")
        mqtt_client.connect(settings.mqtt_broker_host, settings.mqtt_port, 60)
    except Exception as e:
        logger.error(f"Could not connect to MQTT broker: {e}")

def start_mqtt_loop():
    """Start the MQTT client loop in a non-blocking way."""
    mqtt_client.loop_start()
    logger.info("MQTT client loop started.")

def stop_mqtt_loop():
    """Stop the MQTT client loop."""
    mqtt_client.loop_stop()
    logger.info("MQTT client loop stopped.")
