import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
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
            cred_obj = None
            # Prefer JSON from env variables for security (no file needed in container)
            firebase_sa_json = os.getenv("FIREBASE_CREDENTIALS_PATH")
            if firebase_sa_json:
                try:
                    service_account_info = json.loads(firebase_sa_json)
                    cred_obj = credentials.Certificate(service_account_info)
                except json.JSONDecodeError:
                    logger.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Falling back to credentials file path.")

            if cred_obj is None:
                cred_obj = credentials.Certificate(settings.firebase_credentials_path)

            firebase_admin.initialize_app(cred_obj, {
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