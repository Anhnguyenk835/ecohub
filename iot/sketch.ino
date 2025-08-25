#include <DHT.h>  
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h> 
#include <WiFi.h>
#include <ESP32Servo.h>

//=============================================================================//
// Định nghĩa chân
const int ledPin_Fan = 19;
const int servoPin_Fan = 18;
const int ledPin_Light = 25;
const int ledPin_Pump = 15;
const int servoPin_Pump = 5;
const int DHT_Pin = 4;                            
const int soilPin = 34;
const int lightPin = 35;      // Chân OUT của cảm biến nối với GPIO 35
const int phPin = 33;
const int co2Pin = 32;
const int ledPins[] = {13, 12, 14, 27, 26};
const int numLeds = 5; // Tổng số đèn LED

bool isTempOverridden = false;
bool isSoilOverridden = false;
bool isLuxOverridden = false;
//=============================================================================//
// Cấu hình MQTT
const char* ssid = "Wokwi-GUEST";
const char* password = "";

const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

WiFiClient espClient;  // The client
PubSubClient client(espClient);

const char* zoneId = "SvRnFqveMbtVFBSjInxa";
char mqtt_publish_topic[64];
char mqtt_command_topic[64]; 
char mqtt_device_status_topic[64];
char mqtt_feedback_topic[64];
// const char* mqtt_publish_topic = "ecohub/area1/sensors";
// const char* mqtt_command_topic = "ecohub/area1/commands"; // Topic để nhận lệnh từ server

// const char* mqtt_status_topic = "ecohub/pump/status";   // Topic gửi trạng thái máy bơm
// const char* mqtt_status_topic_1 = "ecohub/heater/status";   // Topic gửi trạng thái máy sưởi
// const char* mqtt_status_topic_2 = "ecohub/fan/status";   // Topic gửi trạng thái quạt
// const char* mqtt_status_topic_3 = "ecohub/light/status";   // Topic gửi trạng thái đèn tăng trưởng
//=============================================================================//
enum DeviceState { IDLE, FAN_RUNNING, HEATER_RUNNING, PUMP_RUNNING, LIGHT_RUNNING };
DeviceState currentDeviceState = IDLE;

// Biến quản lý thời gian
unsigned long lastDataReadTime = 0;
// const unsigned long dataReadInterval = 180000; // 3 phút
const unsigned long dataReadInterval = 10000; // mẫu 10s
unsigned long lastMqttReconnectAttempt = 0;

const long STEP_INTERVAL = 200; // 0.5 giây một bước
const long CYCLE_DURATION = 4500; // 15 giây cho mỗi chu trình

// Hằng số cho quạt và máy bơm
const int ANGLE_STEP = 6;       // Quay 6 độ mỗi bước
unsigned long cycleStartTime = 0;
unsigned long lastStepTime = 0;
int servoAngle = 0; // Biến dùng chung cho góc quay của servo đang hoạt động

//=============================================================================//
// Khai báo đối tượng
DHT dht(DHT_Pin, DHT22);                 // If you are using the DHT22, you just need to change the value 11 to 22
LiquidCrystal_I2C lcd(0x27, 20, 4);  // Define the lcd object from the liduidCrystal class
Servo fanServo;
Servo pumpServo;

int fanServoAngle = 0, pumpServoAngle = 0;
int fanServoDirection = 1;
int targetSoilMoisture = 0; // Biến lưu độ ẩm mục tiêu khi bơm

//=============================================================================//
// Dữ liệu cảm biến
float lux = 0.0, temperature = 0.0, humidity = 0.0, pH_value = 0.0;

const int DRY_VALUE = 4095; // Giá trị ADC tối đa của ESP32 (12-bit)
const int WET_VALUE = 0;    // Giá trị ADC tối thiểu
int co2_raw_value; // Giá trị analog thô (0-4095)

float soilMoisture = 0.0;
int co2_ppm = 0;
float last_real_temp = -999;
float last_real_soil = -999;
float last_real_lux = -999;
const float SAFE_TEMPERATURE = 28.0;
const float SAFE_SOIL_MOISTURE = 65.0;
const float TARGET_LUX = 1500.0;
float tempStep = 0;
float soilStep = 0;
float luxStep = 0;  

//=============================================================================//
void displayInfo() {
    lcd.clear();
    lcd.setCursor(0, 1);
    switch (currentDeviceState) {
        case FAN_RUNNING:
            lcd.print("   FAN IS RUNNING   ");
            break;
        case HEATER_RUNNING:
            lcd.print("  HEATER IS ON...   ");
            break;
        case PUMP_RUNNING:
            lcd.print("  PUMPING WATER...  ");
            break;
        case IDLE:
        default:

          // Dòng 0: Nhiệt độ
          lcd.setCursor(0, 0); lcd.print("T: "); lcd.print(temperature, 2); lcd.write(223); lcd.print("C");

          // Dòng 1: Độ ẩm không khí, pH
          lcd.setCursor(0, 1); lcd.print("H: "); lcd.print(humidity, 0); lcd.print("%");

          lcd.setCursor(9, 1); lcd.print("pH: "); lcd.print(pH_value, 1);
          
          // Dòng 2: Độ ẩm đất và Ánh sáng
          lcd.setCursor(0, 2); lcd.print("S: "); lcd.print(soilMoisture); lcd.print("%");
          
          lcd.setCursor(10, 2); lcd.print("L:"); lcd.print(lux, 0); lcd.print(" lux");

          // Dòng 3: CO2 và pH
          lcd.setCursor(0, 3); lcd.print("CO2: "); lcd.print(co2_ppm); lcd.print(" ppm");

          break;
    }
}

void readSensorData() {
    float real_time_temp = dht.readTemperature();
    if (!isnan(real_time_temp)) {
        if (last_real_temp == -999) last_real_temp = real_time_temp;
        if (abs(real_time_temp - last_real_temp) > 1.0 && isTempOverridden) {
            Serial.println("Temperature override DISABLED by manual input.");
            isTempOverridden = false;
        }
        if (!isTempOverridden) temperature = real_time_temp;
        last_real_temp = real_time_temp;
    }
    float real_time_hum = dht.readHumidity();
    if (!isnan(real_time_hum)) humidity = real_time_hum;

    float real_time_soil = map(analogRead(soilPin), 0, 4095, 100, 0);
    if (last_real_soil == -999) last_real_soil = real_time_soil;
    if (abs(real_time_soil - last_real_soil) > 5 && isSoilOverridden) {
        Serial.println("Soil moisture override DISABLED by manual input.");
        isSoilOverridden = false;
    }
    if (!isSoilOverridden) soilMoisture = real_time_soil;
    last_real_soil = real_time_soil;
    
    float real_time_lux = constrain(map(4095 - analogRead(lightPin), 0, 4095, 0, 2000), 0, 2000);
    if (last_real_lux == -999) last_real_lux = real_time_lux;
    if (abs(real_time_lux - last_real_lux) > 100.0 && isLuxOverridden) {
        isLuxOverridden = false;
    }
    if (!isLuxOverridden) lux = real_time_lux;
    last_real_lux = real_time_lux;

    co2_raw_value = analogRead(co2Pin);
    co2_ppm = map(co2_raw_value, 0, 4095, 400, 5000);

    int pH_raw = analogRead(phPin);
    // Ánh xạ giá trị 0-4095 sang thang đo pH 0-14 với 1 chữ số thập phân
    // Chúng ta map sang 0-140 rồi chia cho 10.0 để có số lẻ
    pH_value = (float)pH_raw * 14.0 / 4095.0;
}

//=============================================================================// 
void mqttReconnect() {
  Serial.print("Attempting MQTT connection...");
  String clientId = "Ecohub-Wokwi-" + String(random(0xffff), HEX);
  // Cấu hình Last Will and Testament (LWT)
  // Nếu thiết bị mất kết nối, broker sẽ tự động gửi "offline"
  // Tham số: topic, qos, retain, payload
  if (client.connect(clientId.c_str(), NULL, NULL, mqtt_device_status_topic, 1, true, "offline")) {
    Serial.println("connected");
    client.publish(mqtt_device_status_topic, "online", true);
    Serial.println("Published 'online' status with retain flag.");

    client.subscribe(mqtt_command_topic);
    Serial.print("Subscribed to: ");
    Serial.println(mqtt_command_topic);
  } else {
    Serial.print(client.state());
    Serial.println("Try again later");
  }
}

void wifiConnect() {
  int dotCount = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    // lcd.clear();
    lcd.setCursor(dotCount, 2);
    lcd.print(".");
    dotCount++;
  }
  Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void logSensorValues() {
    Serial.println("--- Sensor Values ---");
    Serial.print("T: "); Serial.print(temperature); if (isTempOverridden) Serial.print(" (O)"); Serial.println(" C");
    Serial.print("S: "); Serial.print(soilMoisture); if (isSoilOverridden) Serial.print(" (O)"); Serial.println(" %");
    Serial.println("---------------------");
}

void sendUpdate() {
  StaticJsonDocument<256> doc;
    doc["temperature"] = temperature;
    doc["airHumidity"] = humidity;
    doc["soilMoisture"] = soilMoisture;
    doc["lightIntensity"] = lux;
    doc["co2"] = co2_ppm;
    doc["ph"] = pH_value;

    JsonObject actuatorStates = doc.createNestedObject("actuatorStates");
    actuatorStates["Fan"] = (currentDeviceState == FAN_RUNNING) ? "ON" : "OFF";
    actuatorStates["Heater"] = (currentDeviceState == HEATER_RUNNING) ? "ON" : "OFF";
    actuatorStates["WaterPump"] = (currentDeviceState == PUMP_RUNNING) ? "ON" : "OFF";
    actuatorStates["Light"] = (currentDeviceState == LIGHT_RUNNING) ? "ON" : "OFF";
    bool is_running = (currentDeviceState != IDLE);

    char jsonBuffer[256];
    serializeJson(doc, jsonBuffer);

    client.publish(mqtt_publish_topic, jsonBuffer);
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) { message += (char)payload[i]; }
  Serial.print("COMMAND RECEIVED: ");
  Serial.println(message);

  if (message == "PUMP_WATER_OFF") {
      if (currentDeviceState == PUMP_RUNNING) {
        Serial.println("-> Action: Manually stopping Pump cycle.");
        currentDeviceState = IDLE;
        pumpServo.write(0);
        digitalWrite(ledPin_Pump, LOW);
        readSensorData(); displayInfo(); sendUpdate();
        return;
      }
    }
    else if (message == "TURN_HEATER_OFF") {
      if (currentDeviceState == HEATER_RUNNING) {
        Serial.println("-> Action: Manually stopping Heater cycle.");
        currentDeviceState = IDLE;
        setAllLeds(LOW);
        readSensorData(); displayInfo(); sendUpdate();
        return;
      }
    }
    else if (message == "TURN_FAN_OFF") {
      if (currentDeviceState == FAN_RUNNING) {
        Serial.println("-> Action: Manually stopping Fan cycle.");
        currentDeviceState = IDLE;
        fanServo.write(0);
        digitalWrite(ledPin_Fan, LOW);
        readSensorData(); displayInfo(); sendUpdate();
        return;
      }
    }
    else if (message == "TURN_LIGHT_OFF") {
      if (currentDeviceState == LIGHT_RUNNING) {
        Serial.println("-> Action: Manually stopping Light cycle.");
        currentDeviceState = IDLE;
        digitalWrite(ledPin_Light, LOW);
        readSensorData(); displayInfo(); sendUpdate();
        return;
      }
    }

  if (currentDeviceState != IDLE) {
        Serial.println("Device is busy. Ignoring command.");
        return; // Nếu thiết bị đang bận, bỏ qua mọi lệnh mới
    }
    lastDataReadTime = millis(); 
    readSensorData();
    
    cycleStartTime = millis();
    lastStepTime = millis();
    servoAngle = 0;

    const float totalSteps = (float)CYCLE_DURATION / (float)STEP_INTERVAL;

    if (message == "PUMP_WATER_ON") {
        currentDeviceState = PUMP_RUNNING;
        digitalWrite(ledPin_Pump, HIGH);
        float delta = SAFE_SOIL_MOISTURE - soilMoisture;
        soilStep = delta / totalSteps; // Tính mức tăng độ ẩm mỗi bước
    }
    else if (message == "TURN_HEATER_ON") {
        currentDeviceState = HEATER_RUNNING;
        setAllLeds(HIGH);
        float delta = SAFE_TEMPERATURE - temperature;
        tempStep = delta / totalSteps; // Tính mức tăng nhiệt mỗi bước
    } 
    else if (message == "TURN_FAN_ON") {
        currentDeviceState = FAN_RUNNING;
        digitalWrite(ledPin_Fan, HIGH);
        float delta = SAFE_TEMPERATURE - temperature;
        tempStep = delta / totalSteps; // Tính mức tăng nhiệt mỗi bước
    } 
    else if (message == "TURN_LIGHT_ON") {
      currentDeviceState = LIGHT_RUNNING;
      digitalWrite(ledPin_Light, HIGH);
    }
    displayInfo();
    sendUpdate();
}

//=============================================================================//
void handleFan() {
    if (millis() - cycleStartTime > CYCLE_DURATION) {
        // Hoàn thành chu trình
        digitalWrite(ledPin_Fan, LOW);
        fanServo.write(0);
        temperature = SAFE_TEMPERATURE; // [GIẢ LẬP] Giảm nhiệt độ xuống mức an toàn
        isTempOverridden = true;
        Serial.println("--- FAN CYCLE COMPLETE ---");
        currentDeviceState = IDLE;
        client.publish(mqtt_feedback_topic, "COMPLETED:TURN_FAN_ON");
        displayInfo();
        sendUpdate();
        lastDataReadTime = millis();
        return;
    }
    // Quay servo
    if (millis() - lastStepTime > 50) { // Quay nhanh hơn
        lastStepTime = millis();
        servoAngle += 10;
        if (servoAngle > 180) servoAngle = 0;
        fanServo.write(servoAngle);
    }
}

void handleHeater() {
    if (millis() - cycleStartTime > CYCLE_DURATION) {
        // Hoàn thành chu trình
        setAllLeds(LOW);
        temperature = SAFE_TEMPERATURE; // [GIẢ LẬP] Tăng nhiệt độ lên mức an toàn
        isTempOverridden = true; // Bật cờ ghi đè nhiệt độ
        Serial.println("--- HEATER CYCLE COMPLETE ---");
        currentDeviceState = IDLE;
        client.publish(mqtt_feedback_topic, "COMPLETED:TURN_HEATER_ON");
        displayInfo();
        sendUpdate();
        lastDataReadTime = millis();
        return;
    }

    if (millis() - lastStepTime > STEP_INTERVAL) {
        lastStepTime = millis();
        temperature += tempStep; // Sử dụng giá trị step đã được tính toán
    }
}

void handlePumping() {
    if (millis() - cycleStartTime > CYCLE_DURATION) {
        // Hoàn thành chu trình
        digitalWrite(ledPin_Pump, LOW);
        pumpServo.write(0);
        soilMoisture = SAFE_SOIL_MOISTURE; // [GIẢ LẬP] Tăng độ ẩm đất lên mức an toàn
        isSoilOverridden = true; // Bật cờ ghi đè độ ẩm đất
        Serial.println("--- PUMPING CYCLE COMPLETE ---");
        currentDeviceState = IDLE;
        client.publish(mqtt_feedback_topic, "COMPLETED:PUMP_WATER_ON");
        displayInfo();
        sendUpdate();
        lastDataReadTime = millis();
        return;
    }
    // Quay servo
    if (millis() - lastStepTime > STEP_INTERVAL) {
        lastStepTime = millis();
        servoAngle += ANGLE_STEP;
        if (servoAngle > 180) servoAngle = 0;
        pumpServo.write(servoAngle);

        soilMoisture += soilStep; // Sử dụng giá trị step đã được tính toán
    }
}

void handleLight() {
    if (millis() - cycleStartTime > CYCLE_DURATION) {
        lux = TARGET_LUX; // Chốt giá trị cuối cùng
        isLuxOverridden = true;
        Serial.println("\n--- LIGHT CYCLE COMPLETE ---");
        currentDeviceState = IDLE; // Hệ thống rảnh để nhận lệnh khác
        client.publish(mqtt_feedback_topic, "COMPLETED:TURN_LIGHT_ON");
        displayInfo();
        sendUpdate();
        lastDataReadTime = millis();
        return;
    }

    // Thực hiện từng bước trong chu trình
    if (millis() - lastStepTime > STEP_INTERVAL) {
        lastStepTime = millis();
        lux += luxStep; // Tăng giá trị lux giả lập
    }
}

void setAllLeds(int state) {
  for (int i = 0; i < numLeds; i++) {
    digitalWrite(ledPins[i], state);
  }
}

//=================================================================================//
void setup(){
  Serial.begin(115200);
  Wire.begin();

  snprintf(mqtt_publish_topic, sizeof(mqtt_publish_topic), "ecohub/%s/sensors", zoneId);
  snprintf(mqtt_command_topic, sizeof(mqtt_command_topic), "ecohub/%s/commands", zoneId);
  snprintf(mqtt_device_status_topic, sizeof(mqtt_device_status_topic), "ecohub/%s/device_status", zoneId);
  snprintf(mqtt_feedback_topic, sizeof(mqtt_feedback_topic), "ecohub/%s/command_feedback", zoneId);
  
  for (int i = 0; i < numLeds; i++) {
    pinMode(ledPins[i], OUTPUT);
  }

  setAllLeds(LOW);

  pumpServo.attach(servoPin_Pump); fanServo.attach(servoPin_Fan);

  pinMode(ledPin_Fan, OUTPUT); pinMode(ledPin_Pump, OUTPUT); pinMode(ledPin_Light, OUTPUT);
  dht.begin();

  digitalWrite(ledPin_Fan, LOW); digitalWrite(ledPin_Pump, LOW); digitalWrite(ledPin_Light, LOW);
  fanServo.write(0); pumpServo.write(0);

  lcd.init();                        // Initialize the LCD          
  lcd.backlight();                  // Turn on the back light

  lcd.clear(); lcd.setCursor(3, 1); lcd.print("EcoHub System"); lcd.setCursor(5, 2); lcd.print("Starting...");

  delay(500);
  
  // Bắt đầu kết nối WiFi nhưng không chờ đợi
  lcd.clear(); lcd.setCursor(0, 1); lcd.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  readSensorData();

  wifiConnect();

  lcd.clear(); lcd.setCursor(0, 0); lcd.print("WiFi Connected!"); lcd.setCursor(0, 1); lcd.print(WiFi.localIP());
  delay(500); // Chờ 2s để người dùng thấy IP

  // Cấu hình server MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  displayInfo(); // Hiển thị lại thông tin cảm biến sau khi kết nối xong
  
  lastDataReadTime = millis();
}

//=============================================================================//
void loop() {

  if (!client.connected()) {
    // Chỉ thử kết nối lại mỗi 8 giây
    if (millis() - lastMqttReconnectAttempt > 6000) {
      lastMqttReconnectAttempt = millis();
      mqttReconnect(); // Gọi hàm thử kết nối
    }
  } else {
    client.loop(); // Chỉ gọi client.loop() khi đã kết nối
  }
  
  switch (currentDeviceState) {
        case FAN_RUNNING:
            handleFan();
            break;
        case HEATER_RUNNING:
            handleHeater();
            break;
        case PUMP_RUNNING:
            handlePumping();
            break;
        case LIGHT_RUNNING:
            handleLight();
            break;
        case IDLE:
            // Không làm gì cả, chờ lệnh
            break;
  }

  if (millis() - lastDataReadTime >= dataReadInterval) {
    lastDataReadTime = millis();
    Serial.println("Updated");

    if (currentDeviceState == IDLE) {
        readSensorData();
        displayInfo();
        sendUpdate();
    }
  }
}