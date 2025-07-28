# FastAPI MQTT Firebase Integration

A Python application built with FastAPI that integrates MQTT messaging with Firebase Firestore for data storage.

## Features

- **FastAPI**: Modern, fast web framework for building APIs
- **MQTT Integration**: Asynchronous MQTT client using gmqtt
- **Firebase Firestore**: Cloud-based NoSQL database for data storage
- **Poetry**: Dependency management and packaging
- **Background Tasks**: Continuous MQTT message processing
- **Logging**: Comprehensive logging and error handling
- **Environment Configuration**: Secure configuration management

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration and environment variables
│   ├── models.py            # Pydantic models
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py        # API endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── mqtt_client.py   # MQTT client service
│   │   └── firebase_service.py  # Firebase operations
│   └── utils/
│       ├── __init__.py
│       └── logger.py        # Logging configuration
├── pyproject.toml           # Poetry configuration
├── .env.example             # Environment variables template
├── .gitignore
└── README.md
```

## Setup

### Prerequisites

- Python 3.9+
- Poetry
- Firebase project with Firestore enabled
- MQTT broker (for testing, you can use a public broker)

### Installation

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies using Poetry:
   ```bash
   poetry install
   ```

3. Copy the environment template and configure your settings:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` file with your configuration:
   - Set Firebase credentials path
   - Configure MQTT broker settings
   - Set other environment variables

5. Download your Firebase Admin SDK JSON file and place it in the project root (ensure it's named according to your `.env` configuration).

### Configuration

Create a `.env` file based on `.env.example`:

```env
# Firebase Configuration
FIREBASE_CREDENTIALS_PATH=firebase-adminsdk.json
FIREBASE_PROJECT_ID=your-project-id

# MQTT Configuration
MQTT_BROKER_HOST=broker.hivemq.com
MQTT_BROKER_PORT=1883
MQTT_TOPIC=sensors/data
MQTT_CLIENT_ID=fastapi-mqtt-client

# Application Configuration
LOG_LEVEL=INFO
ENVIRONMENT=development
```

## Running the Application

### Development

```bash
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /`: Health check endpoint
- `GET /api/messages`: Retrieve recent MQTT messages from Firebase
- `GET /api/messages/{limit}`: Retrieve limited number of recent messages

## MQTT Integration

The application automatically connects to the configured MQTT broker and subscribes to the specified topic. Incoming messages are:

1. Received by the MQTT client
2. Parsed and validated
3. Stored in Firebase Firestore
4. Logged for monitoring

## Firebase Integration

Messages are stored in Firestore with the following structure:

```json
{
  "topic": "sensors/data",
  "payload": "message content",
  "timestamp": "2025-07-28T10:30:00Z",
  "client_id": "sensor-001"
}
```

## Testing

Run tests using Poetry:

```bash
poetry run pytest
```

## Development Tools

Format code:
```bash
poetry run black .
```

Check code style:
```bash
poetry run flake8
```

Sort imports:
```bash
poetry run isort .
```

## Logging

The application uses structured logging with different levels:
- INFO: General application flow
- ERROR: Error conditions
- DEBUG: Detailed debugging information

Logs are output to console and can be configured to write to files.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase Admin SDK JSON | `firebase-adminsdk.json` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Required |
| `MQTT_BROKER_HOST` | MQTT broker hostname | `broker.hivemq.com` |
| `MQTT_BROKER_PORT` | MQTT broker port | `1883` |
| `MQTT_TOPIC` | MQTT topic to subscribe to | `sensors/data` |
| `MQTT_CLIENT_ID` | MQTT client identifier | `fastapi-mqtt-client` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `ENVIRONMENT` | Environment name | `development` |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## License

This project is licensed under the MIT License.
