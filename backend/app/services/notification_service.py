import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi.concurrency import run_in_threadpool
from app.services.email_service import email_service
from app.services.database import db
from app.utils.logger import get_logger

logger = get_logger(__name__)

class NotificationService:
    """Service for managing and sending notifications to users."""
    
    def __init__(self):
        self.db = db
    
    async def get_users_for_zone(self, zone_id: str) -> List[Dict[str, Any]]:
        """Get users who should receive notifications for a specific zone."""
        try:
            logger.info(f"🔍 SEARCHING FOR ZONE USERS - Zone: {zone_id}")
            
            # Get zones collection to find zone owner
            zones_ref = self.db.collection("zones")
            zone_doc = await run_in_threadpool(zones_ref.document(zone_id).get)
            
            if not zone_doc.exists:
                logger.warning(f"⚠️ ZONE NOT FOUND - Zone: {zone_id}")
                return []
            
            zone_data = zone_doc.to_dict()
            zone_owner_uid = zone_data.get("owner")  # Zones use 'owner' field
            
            if not zone_owner_uid:
                logger.warning(f"⚠️ ZONE HAS NO OWNER - Zone: {zone_id}")
                return []
            
            logger.info(f"👑 ZONE OWNER FOUND - Zone: {zone_id}, Owner UID: {zone_owner_uid}")
            
            # Get the zone owner's user profile
            users_ref = self.db.collection("users")
            user_doc = await run_in_threadpool(users_ref.document(zone_owner_uid).get)
            
            if not user_doc.exists:
                logger.warning(f"⚠️ ZONE OWNER USER NOT FOUND - UID: {zone_owner_uid}")
                return []
            
            user_data = user_doc.to_dict()
            user_email = user_data.get("email", "no-email")
            email_verified = user_data.get("emailVerified", False)
            
            logger.debug(f"👤 ZONE OWNER DATA - Email: {user_email}, Verified: {email_verified}, UID: {zone_owner_uid}")
            
            if not email_verified or user_email == "no-email":
                logger.warning(f"🚫 ZONE OWNER NOT ELIGIBLE - Email: {user_email}, Verified: {email_verified}")
                return []
            
            # Create user info for the zone owner
            user_info = {
                "uid": zone_owner_uid,
                "email": user_email,
                "displayName": user_data.get("displayName", "User"),
                "notificationPreferences": user_data.get("notificationPreferences", {})
            }
            
            users = [user_info]
            logger.info(f"✅ ZONE OWNER ADDED - Zone: {zone_id}, Owner: {user_email}")
            logger.info(f"👥 ZONE USERS RETRIEVED - Zone: {zone_id}, Total Users: 1")
            logger.info(f"📧 USER EMAILS - Zone: {zone_id}, Emails: [ {user_email} ]")
            
            return users
            
        except Exception as e:
            logger.error(f"💥 ERROR getting zone users - Zone: {zone_id}, Error: {str(e)}")
            logger.exception(f"Full error details for zone {zone_id}:")
            return []

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get a specific user by email for testing purposes."""
        try:
            logger.info(f"🔍 SEARCHING FOR USER BY EMAIL - Email: {email}")
            
            users_ref = self.db.collection("users")
            query = users_ref.where('email', '==', email).limit(1)
            docs = await run_in_threadpool(query.stream)
            
            for doc in docs:
                user_data = doc.to_dict()
                user_email = user_data.get("email", "no-email")
                email_verified = user_data.get("emailVerified", False)
                
                logger.debug(f"👤 USER DATA - Email: {user_email}, Verified: {email_verified}, UID: {doc.id}")
                
                if email_verified and user_email != "no-email":
                    user_info = {
                        "uid": doc.id,
                        "email": user_email,
                        "displayName": user_data.get("displayName", "User"),
                        "notificationPreferences": user_data.get("notificationPreferences", {})
                    }
                    logger.info(f"✅ USER FOUND - Email: {user_email}, UID: {doc.id}")
                    return user_info
                else:
                    logger.warning(f"🚫 USER NOT ELIGIBLE - Email: {user_email}, Verified: {email_verified}")
                    return None
            
            logger.warning(f"⚠️ USER NOT FOUND - Email: {email}")
            return None
            
        except Exception as e:
            logger.error(f"💥 ERROR getting user by email - Email: {email}, Error: {str(e)}")
            logger.exception(f"Full error details for email {email}:")
            return None
    
    async def should_send_email_notification(
        self, 
        user: Dict[str, Any], 
        notification: Dict[str, Any]
    ) -> bool:
        """Determine if an email notification should be sent to a user."""
        try:
            user_email = user.get("email", "unknown")
            user_uid = user.get("uid", "unknown")
            
            logger.debug(f"🔍 CHECKING USER ELIGIBILITY - User: {user_email}, UID: {user_uid}")
            
            # Check user's notification preferences
            preferences = user.get("notificationPreferences", {})
            logger.debug(f"⚙️ USER PREFERENCES - User: {user_email}, Preferences: {preferences}")
            
            # Check if email notifications are enabled
            email_enabled = preferences.get("email", True)  # Default to True
            logger.debug(f"📧 EMAIL ENABLED CHECK - User: {user_email}, Enabled: {email_enabled}")
            
            if not email_enabled:
                logger.info(f"🚫 EMAIL DISABLED - User: {user_email}, Email notifications turned off")
                return False
            
            # Check severity preferences
            severity = notification.get("severity", "info")
            severity_preferences = preferences.get("severity", {})
            
            logger.debug(f"🚨 SEVERITY CHECK - User: {user_email}, Alert Severity: {severity}, User Min: {severity_preferences.get('minimum', 'info')}")
            
            # If user has specific severity preferences, check them
            if severity_preferences:
                min_severity = severity_preferences.get("minimum", "info")
                severity_levels = {"info": 1, "warning": 2, "critical": 3}
                
                if severity_levels.get(severity, 1) < severity_levels.get(min_severity, 1):
                    logger.info(f"🚫 SEVERITY TOO LOW - User: {user_email}, Alert: {severity}, User Min: {min_severity}")
                    return False
            
            # Check frequency limits (prevent spam)
            max_per_hour = preferences.get("maxPerHour", 10)
            max_per_day = preferences.get("maxPerDay", 50)
            
            logger.debug(f"⏰ RATE LIMIT CHECK - User: {user_email}, Max/Hour: {max_per_hour}, Max/Day: {max_per_day}")
            
            # For now, we'll allow all notifications
            # In a production app, you'd implement proper rate limiting here
            
            logger.info(f"✅ USER ELIGIBLE - User: {user_email}, Will receive email notification")
            return True
            
        except Exception as e:
            logger.error(f"💥 ERROR in eligibility check - User: {user.get('uid', 'unknown')}, Error: {str(e)}")
            logger.exception(f"Full error details for user {user.get('uid', 'unknown')}:")
            return True  # Default to sending if there's an error
    
    async def send_notification_emails(
        self, 
        zone_id: str, 
        notification: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send email notifications to all relevant users for a zone."""
        try:
            logger.info(f"📋 STARTING EMAIL NOTIFICATION PROCESS - Zone: {zone_id}")
            logger.info(f"📨 NOTIFICATION DETAILS - Type: {notification.get('type')}, Severity: {notification.get('severity')}, Message: {notification.get('message')}")
            
            # Get users for this zone
            users = await self.get_users_for_zone(zone_id)
            logger.info(f"👥 USERS FOUND - Zone: {zone_id}, Total Users: {len(users)}")
            
            if not users:
                logger.warning(f"⚠️ NO USERS FOUND - Zone: {zone_id}, Skipping email notifications")
                return {"success": True, "emails_sent": 0, "total_users": 0}
            
            # Filter users who should receive notifications
            eligible_users = []
            for user in users:
                should_send = await self.should_send_email_notification(user, notification)
                logger.debug(f"🔍 USER ELIGIBILITY CHECK - User: {user.get('email')}, Zone: {zone_id}, Eligible: {should_send}")
                if should_send:
                    eligible_users.append(user)
            
            logger.info(f"✅ ELIGIBLE USERS FILTERED - Zone: {zone_id}, Eligible: {len(eligible_users)}/{len(users)}")
            
            if not eligible_users:
                logger.warning(f"⚠️ NO ELIGIBLE USERS - Zone: {zone_id}, All users filtered out")
                return {"success": True, "emails_sent": 0, "total_users": len(users)}
            
            # Prepare notification data for email
            email_notification = {
                "type": notification.get("type", "System Alert"),
                "message": notification.get("message", "No message provided"),
                "suggestion": notification.get("suggestion", ""),
                "severity": notification.get("severity", "info"),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            logger.info(f"📧 PREPARING EMAIL BATCH - Zone: {zone_id}, Recipients: {[user.get('email') for user in eligible_users]}")
            
            # Send emails
            logger.info(f"📧 STARTING EMAIL SEND - Zone: {zone_id}, Eligible Users: {len(eligible_users)}")
            logger.info(f"📬 EMAIL RECIPIENTS - Zone: {zone_id}, Emails: {[user.get('email') for user in eligible_users]}")
            
            emails_sent = await email_service.send_bulk_notification_emails(
                user_emails=[user["email"] for user in eligible_users],
                user_names=[user.get("displayName", "User") for user in eligible_users],
                notification=email_notification,
                zone_id=zone_id
            )
            
            logger.info(f"📤 EMAIL BATCH COMPLETED - Zone: {zone_id}, Successfully Sent: {emails_sent}/{len(eligible_users)}")
            
            # Check for failures
            failed_count = len(eligible_users) - emails_sent
            if failed_count > 0:
                logger.error(f"❌ EMAIL FAILURES DETECTED - Zone: {zone_id}, Failed: {failed_count}/{len(eligible_users)}")
                logger.error(f"📊 EMAIL SUCCESS RATE - Zone: {zone_id}, Success Rate: {(emails_sent/len(eligible_users)*100):.1f}%")
            
            # Log the notification
            await self.log_notification_sent(zone_id, notification, emails_sent, len(eligible_users))
            
            result = {
                "success": True,
                "emails_sent": emails_sent,
                "total_users": len(users),
                "eligible_users": len(eligible_users)
            }
            
            logger.info(f"🎯 EMAIL NOTIFICATION PROCESS COMPLETE - Zone: {zone_id}, Result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error sending notification emails for zone {zone_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def log_notification_sent(
        self, 
        zone_id: str, 
        notification: Dict[str, Any], 
        emails_sent: int, 
        total_eligible: int
    ):
        """Log that notifications were sent for audit purposes."""
        try:
            # Create a log entry in Firestore
            log_ref = self.db.collection("notification_logs").document()
            
            log_data = {
                "zoneId": zone_id,
                "notification": notification,
                "emailsSent": emails_sent,
                "totalEligible": total_eligible,
                "timestamp": datetime.now(),
                "status": "sent" if emails_sent > 0 else "failed",
                "successRate": f"{(emails_sent/total_eligible*100):.1f}%" if total_eligible > 0 else "0%"
            }
            
            await run_in_threadpool(log_ref.set, log_data)
            logger.debug(f"Logged notification send for zone {zone_id}")
            
        except Exception as e:
            logger.error(f"Error logging notification send for zone {zone_id}: {str(e)}")

    async def log_email_failure(
        self, 
        zone_id: str, 
        user_email: str, 
        error_details: str,
        notification: Dict[str, Any]
    ):
        """Log specific email failures for debugging."""
        try:
            # Create a failure log entry in Firestore
            log_ref = self.db.collection("email_failure_logs").document()
            
            log_data = {
                "zoneId": zone_id,
                "userEmail": user_email,
                "errorDetails": error_details,
                "notification": notification,
                "timestamp": datetime.now(),
                "status": "failed"
            }
            
            await run_in_threadpool(log_ref.set, log_data)
            logger.debug(f"Logged email failure for zone {zone_id}, user {user_email}")
            
        except Exception as e:
            logger.error(f"Error logging email failure for zone {zone_id}, user {user_email}: {str(e)}")
    
    async def get_notification_history(
        self, 
        zone_id: Optional[str] = None, 
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get notification history for audit purposes."""
        try:
            logs_ref = self.db.collection("notification_logs")
            
            # Apply filters
            query = logs_ref
            if zone_id:
                query = query.where("zoneId", "==", zone_id)
            
            # Order by timestamp and limit results
            query = query.order_by("timestamp", direction="DESCENDING").limit(limit)
            
            logs = []
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                log_data = doc.to_dict()
                log_data["id"] = doc.id
                logs.append(log_data)
            
            return logs
            
        except Exception as e:
            logger.error(f"Error getting notification history: {str(e)}")
            return []

# Global notification service instance
notification_service = NotificationService()
