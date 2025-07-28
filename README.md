# EcoHub Backend

A Python backend application built with FastAPI for the EcoHub project.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── main.py
│   ├── field/
│   │   ├── __init__.py
│   │   ├── field_model.py
│   │   ├── field_route.py
│   │   └── field_service.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── database.py
│   └── utils/
│       ├── __init__.py
│       └── logger.py
├── poetry.lock
├── pyproject.toml
└── start.sh
```

## Prerequisites

- Python 3.8+
- Poetry (for dependency management)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Physics
```

2. Install dependencies using Poetry:
```bash
cd backend
poetry install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Running the Application

### Using Poetry

```bash
cd backend
poetry run python -m app.main
```

### Using the start script

```bash
cd backend
chmod +x start.sh
./start.sh
```

## Development

### Project Dependencies

This project uses Poetry for dependency management. The main dependencies are defined in `pyproject.toml`.

### Database

The application uses Firebase as the database service. Make sure to configure your Firebase credentials properly.

## API Documentation

Once the application is running, you can access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
