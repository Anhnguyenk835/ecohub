## Structure

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Physics
   ```

2. **Navigate to backend**
   ```bash
   cd backend
   ```

### Prerequisites

- Python 3.9+

### Development Workflow

1. **Setup Development Environment**:
   ```bash
   cd backend
   poetry lock
   poetry install
   # Configure your .env file
   ```

2. **Run Development Server**:
   ```bash
   poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```