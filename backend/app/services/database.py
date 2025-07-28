import firebase_admin
from firebase_admin import credentials, firestore
from app.config import get_settings
from app.utils.logger import get_logger

# Get settings and logger
settings = get_settings()
logger = get_logger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK with credentials."""
    try:
        if not firebase_admin._apps:
            # Initialize Firebase only if not already initialized
            cred = credentials.Certificate(settings.firebase_credentials_path)
            firebase_admin.initialize_app(cred, {
                'projectId': settings.firebase_project_id
            })
            logger.info("Firebase Admin SDK initialized successfully")
        else:
            logger.info("Firebase Admin SDK already initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        raise

def get_firestore_db():
    """Get Firestore database instance."""
    try:
        initialize_firebase()
        db = firestore.client()
        logger.info("Firestore client created successfully")
        return db
    except Exception as e:
        logger.error(f"Failed to create Firestore client: {str(e)}")
        raise

# Export the database instance
db = get_firestore_db()