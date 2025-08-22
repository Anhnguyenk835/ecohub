from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict

from app.user.user_model import UserUpdate, UserResponse, NotificationPreferences
from app.user.user_service import UserService
from app.utils.logger import get_logger
from app.services.firebase_auth import get_current_user, get_verified_user

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["users"])
user_service = UserService()

async def get_user_or_404(uid: str) -> Dict:
    user = await user_service.get_user(uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with UID {uid} not found")
    return user

@router.post("/me/sync", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def sync_profile(current = Depends(get_verified_user)):
    """Create or update the profile for the authenticated user (verified email required)."""
    profile = {
        "uid": current["uid"],
        "email": current.get("email"),
        "displayName": current.get("name"),
        "emailVerified": True,
    }
    saved = await user_service.create_or_update_profile(current["uid"], profile)
    return UserResponse(**saved)

@router.get("/me", response_model=UserResponse)
async def get_me(current = Depends(get_verified_user)):
    profile = await user_service.get_user(current["uid"]) 
    if not profile:
        # Auto-create minimal profile if missing
        profile = await user_service.create_or_update_profile(current["uid"], {
            "uid": current["uid"],
            "email": current.get("email"),
            "displayName": current.get("name"),
            "emailVerified": current.get("email_verified", False),
        })
    return UserResponse(**profile)

@router.put("/me", response_model=UserResponse)
async def update_me(user_data: UserUpdate, current = Depends(get_verified_user)):
    update_dict = user_data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No data to update")
    success = await user_service.update_user(current["uid"], update_dict)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")
    updated = await user_service.get_user(current["uid"])
    return UserResponse(**updated)

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(current = Depends(get_verified_user)):
    success = await user_service.delete_user(current["uid"])
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user")

@router.put("/me/notifications", response_model=UserResponse)
async def update_notification_preferences(
    preferences: NotificationPreferences, 
    current = Depends(get_verified_user)
):
    """Update user's notification preferences."""
    try:
        # Update only notification preferences
        update_dict = {"notificationPreferences": preferences.dict()}
        success = await user_service.update_user(current["uid"], update_dict)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Failed to update notification preferences"
            )
        
        # Return updated user profile
        updated = await user_service.get_user(current["uid"])
        return UserResponse(**updated)
        
    except Exception as e:
        logger.error(f"Error updating notification preferences for user {current['uid']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to update notification preferences"
        )

@router.get("/me/notifications", response_model=NotificationPreferences)
async def get_notification_preferences(current = Depends(get_verified_user)):
    """Get user's current notification preferences."""
    try:
        profile = await user_service.get_user(current["uid"])
        if not profile:
            # Return default preferences if no profile exists
            return NotificationPreferences()
        
        preferences = profile.get("notificationPreferences", {})
        return NotificationPreferences(**preferences)
        
    except Exception as e:
        logger.error(f"Error getting notification preferences for user {current['uid']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to get notification preferences"
        )

@router.post("/me/test-email")
async def test_email_notification(current = Depends(get_verified_user)):
    """Test email notification for the current user."""
    try:
        from app.services.email_service import email_service
        from app.services.notification_service import notification_service
        
        # Get user profile
        profile = await user_service.get_user(current["uid"])
        if not profile or not profile.get("email"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User email not found"
            )
        
        user_email = profile["email"]
        logger.info(f"🧪 TEST EMAIL REQUEST - User: {user_email}, UID: {current['uid']}")
        
        # Test email service initialization
        logger.info(f"🔧 EMAIL SERVICE STATUS - FastMail: {'✅' if email_service.fastmail else '❌'}, Templates: {'✅' if email_service.template_env else '❌'}")
        
        if not email_service.fastmail:
            logger.error(f"❌ EMAIL SERVICE NOT READY - FastMail instance is None")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Email service not properly initialized"
            )
        
        # Send test email
        test_notification = {
            "type": "Test Alert",
            "message": "This is a test email to verify your email configuration.",
            "suggestion": "Test action",
            "severity": "info",
            "timestamp": "Test timestamp"
        }
        
        logger.info(f"📧 SENDING TEST EMAIL - Recipient: {user_email}")
        logger.info(f"🔧 TEST NOTIFICATION - Type: {test_notification['type']}, Message: {test_notification['message']}")
        
        success = await email_service.send_notification_email(
            user_email,
            profile.get("displayName", "User"),
            test_notification,
            "test_zone"
        )
        
        if success:
            logger.info(f"✅ TEST EMAIL SUCCESS - Recipient: {user_email}")
            return {"message": "Test email sent successfully", "email": user_email}
        else:
            logger.error(f"❌ TEST EMAIL FAILED - Recipient: {user_email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send test email"
            )
            
    except Exception as e:
        logger.error(f"💥 ERROR in test email - User: {current['uid']}, Error: {str(e)}")
        logger.exception(f"Full error details for user {current['uid']}:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test email: {str(e)}"
        )

@router.post("/me/simple-test-email")
async def simple_test_email(current = Depends(get_verified_user)):
    """Simple test email without templates to debug basic email functionality."""
    try:
        from fastapi_mail import MessageSchema
        from app.services.email_service import email_service
        
        # Get user profile
        profile = await user_service.get_user(current["uid"])
        if not profile or not profile.get("email"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User email not found"
            )
        
        user_email = profile["email"]
        logger.info(f"🧪 SIMPLE TEST EMAIL REQUEST - User: {user_email}, UID: {current['uid']}")
        
        # Check email service
        if not email_service.fastmail:
            logger.error(f"❌ EMAIL SERVICE NOT READY - FastMail instance is None")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Email service not properly initialized"
            )
        
        # Create simple message without template
        try:
            message = MessageSchema(
                subject="🧪 Simple Test Email from EcoHub",
                recipients=[user_email],
                body="This is a simple test email to verify basic SMTP functionality.",
                subtype="html"
            )
            logger.info(f"📨 SIMPLE MESSAGE CREATED - Recipient: {user_email}")
        except Exception as msg_error:
            logger.error(f"❌ SIMPLE MESSAGE CREATION FAILED - Error: {str(msg_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create message: {str(msg_error)}"
            )
        
        # Send simple email
        try:
            logger.info(f"📤 SENDING SIMPLE TEST EMAIL - Recipient: {user_email}")
            await email_service.fastmail.send_message(message)
            logger.info(f"✅ SIMPLE TEST EMAIL SUCCESS - Recipient: {user_email}")
            return {"message": "Simple test email sent successfully", "email": user_email}
        except Exception as send_error:
            logger.error(f"❌ SIMPLE TEST EMAIL FAILED - Recipient: {user_email}, Error: {str(send_error)}")
            logger.error(f"🔧 ERROR TYPE - {type(send_error).__name__}")
            logger.exception(f"Simple email send error details:")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send simple test email: {str(send_error)}"
            )
            
    except Exception as e:
        logger.error(f"💥 ERROR in simple test email - User: {current['uid']}, Error: {str(e)}")
        logger.exception(f"Full error details for user {current['uid']}:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send simple test email: {str(e)}"
        )