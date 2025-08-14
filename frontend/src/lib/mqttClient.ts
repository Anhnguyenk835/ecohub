import mqtt from "mqtt";

const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL;

export const mqttClient = mqtt.connect(brokerUrl, {
  clientId: "EcoHubFE_" + Math.random().toString(16).substr(2, 8),
});
