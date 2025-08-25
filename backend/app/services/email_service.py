import os
from typing import Optional, Dict, Any
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from app.utils.logger import get_logger

logger = get_logger(__name__)

class EmailService:
    """Service for sending email notifications to users."""
    
    def __init__(self):
        self.fastmail = None
        self.template_env = None
        self._initialize_email_service()
        self._initialize_templates()
    
    def _initialize_email_service(self):
        """Initialize the email service with configuration."""
        try:
            # Get email configuration from environment variables
            mail_username = os.getenv("MAIL_USERNAME", "") # tuananh835.nta@gmail.com -> DNS -> noreply@ecohub.com
            mail_password = os.getenv("MAIL_PASSWORD", "") 
            mail_from = os.getenv("MAIL_FROM", "noreply@ecohub.com") 
            mail_port = int(os.getenv("MAIL_PORT", "587"))  # SMTP 
            mail_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
            
            logger.info(f"📧 EMAIL CONFIG - Server: {mail_server}:{mail_port}, From: {mail_from}, Username: {mail_username}")
            logger.info(f"🔐 AUTHENTICATION - Password length: {len(mail_password) if mail_password else 0}")
            
            # Email configuration from environment variables
            mail_config = ConnectionConfig(
                MAIL_USERNAME=mail_username,
                MAIL_PASSWORD=mail_password,
                MAIL_FROM=mail_from,
                MAIL_PORT=mail_port,
                MAIL_SERVER=mail_server,
                MAIL_STARTTLS=True,
                MAIL_SSL_TLS=False,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True
            )
            
            self.fastmail = FastMail(mail_config)
            logger.info("✅ Email service initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize email service: {str(e)}")
            logger.exception("Full error details:")
            self.fastmail = None
    
    def _initialize_templates(self):
        """Initialize Jinja2 templates for email formatting."""
        try:
            # Get the directory containing this file
            current_dir = Path(__file__).parent.parent
            templates_dir = current_dir / "templates"
            
            if templates_dir.exists():
                self.template_env = Environment(loader=FileSystemLoader(str(templates_dir))) # custom html
            else:
                # Create templates directory if it doesn't exist
                templates_dir.mkdir(exist_ok=True)
                self._create_default_templates(templates_dir)
                self.template_env = Environment(loader=FileSystemLoader(str(templates_dir)))
                
            logger.info("Email templates initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize email templates: {str(e)}")
            self.template_env = None
    
    def _create_default_templates(self, templates_dir: Path):
        """Create default email templates if they don't exist."""
        try:
            # Create default notification template
            notification_template = templates_dir / "notification.html"
            if not notification_template.exists():
                with open(notification_template, "w") as f:
                    f.write("""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>EcoHub Alert Notification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .alert { padding: 15px; margin: 15px 0; border-radius: 5px; }
        .alert-critical { background-color: #fef2f2; border-left: 4px solid #ef4444; }
        .alert-warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; }
        .alert-info { background-color: #eff6ff; border-left: 4px solid #3b82f6; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 EcoHub Alert Notification</h1>
        </div>
        <div class="content">
            <h2>Hello {{ user_name }},</h2>
            <p>You have received a new alert notification from your EcoHub system.</p>
            
            <div class="alert alert-{{ severity }}">
                <h3>{{ notification_type }}</h3>
                <p><strong>Zone:</strong> {{ zone_id }}</p>
                <p><strong>Message:</strong> {{ message }}</p>
                {% if suggestion %}
                <p><strong>Suggestion:</strong> {{ suggestion }}</p>
                {% endif %}
                <p><strong>Time:</strong> {{ timestamp }}</p>
            </div>
            
            <p>Please log into your EcoHub dashboard to view more details and take necessary actions.</p>
            
            <a href="{{ dashboard_url }}" class="button">View Dashboard</a>
        </div>
        <div class="footer">
            <p>This is an automated notification from EcoHub. Please do not reply to this email.</p>
            <p>&copy; 2024 EcoHub. All rights reserved.</p>
        </div>
    </div>
</body>
</html>""")
            
            logger.info("Default email templates created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create default templates: {str(e)}")
    
    async def send_notification_email(
        self, 
        user_email: str, 
        user_name: str, 
        notification: Dict[str, Any],
        zone_id: str
    ) -> bool:
        """Send a notification email to a user."""
        if not self.fastmail or not self.template_env:
            logger.error(f"❌ EMAIL SERVICE NOT INITIALIZED - Cannot send email to {user_email}")
            logger.error(f"🔧 SERVICE STATUS - FastMail: {'✅' if self.fastmail else '❌'}, Templates: {'✅' if self.template_env else '❌'}")
            return False
        
        try:
            logger.info(f"📧 PREPARING EMAIL - Recipient: {user_email}, Zone: {zone_id}, Type: {notification.get('type')}")
            
            # Validate email address
            if not user_email or '@' not in user_email:
                logger.error(f"❌ INVALID EMAIL ADDRESS - Recipient: {user_email}, Zone: {zone_id}")
                return False
            
            # Prepare template variables
            template_vars = {
                "user_name": user_name or "User",
                "notification_type": notification.get("type", "System Alert"),
                "zone_id": zone_id,
                "message": notification.get("message", "No message provided"),
                "suggestion": notification.get("suggestion", ""),
                "severity": notification.get("severity", "info"),
                "timestamp": notification.get("timestamp", ""),
                "dashboard_url": os.getenv("FRONTEND_URL", "http://localhost:3000")
            }
            
            logger.debug(f"📝 TEMPLATE VARIABLES - Zone: {zone_id}, Severity: {template_vars['severity']}, User: {user_email}")
            
            # Render email template
            try:
                template = self.template_env.get_template("notification.html")
                html_content = template.render(**template_vars)
                logger.debug(f"📄 TEMPLATE RENDERED - Zone: {zone_id}, User: {user_email}")
            except Exception as template_error:
                logger.error(f"❌ TEMPLATE RENDER FAILED - Recipient: {user_email}, Zone: {zone_id}, Error: {str(template_error)}")
                logger.exception(f"Template error details for {user_email}:")
                return False
            
            # Create message
            try:
                message = MessageSchema(
                    subject=f"🚨 EcoHub Alert: {notification.get('type', 'System Alert')}",
                    recipients=[user_email],
                    body=html_content,
                    subtype="html"
                )
                logger.info(f"📨 MESSAGE CREATED - Recipient: {user_email}, Zone: {zone_id}, Subject: {message.subject}")
            except Exception as message_error:
                logger.error(f"❌ MESSAGE CREATION FAILED - Recipient: {user_email}, Zone: {zone_id}, Error: {str(message_error)}")
                logger.exception(f"Message creation error details for {user_email}:")
                return False
            
            logger.info(f"📤 SENDING EMAIL - Recipient: {user_email}, Zone: {zone_id}, Subject: {message.subject}")
            
            # Send email
            try:
                logger.info(f"🔧 ATTEMPTING SMTP SEND - Recipient: {user_email}, Zone: {zone_id}")
                logger.info(f"🔧 SMTP CONFIG - Server: {os.getenv('MAIL_SERVER')}, Port: {os.getenv('MAIL_PORT')}, Username: {os.getenv('MAIL_USERNAME')}, Password: {os.getenv('MAIL_PASSWORD')}")
                
                # Add a timeout to prevent hanging
                import asyncio
                try:
                    logger.info(f"🔧 STARTING SMTP SEND WITH TIMEOUT - Recipient: {user_email}, Zone: {zone_id}")
                    logger.info(f"🔧 TIMEOUT SET TO 30 SECONDS - Recipient: {user_email}, Zone: {zone_id}")
                    
                    # Send with timeout
                    await asyncio.wait_for(self.fastmail.send_message(message), timeout=30.0)
                    logger.info(f"✅ EMAIL SENT SUCCESSFULLY - Recipient: {user_email}, Zone: {zone_id}")
                    return True
                except asyncio.TimeoutError:
                    logger.error(f"⏰ EMAIL SEND TIMEOUT - Recipient: {user_email}, Zone: {zone_id}, Timeout after 30 seconds")
                    logger.error(f"🔧 SMTP HANGING DETECTED - Recipient: {user_email}, Zone: {zone_id}")
                    return False
                    
            except Exception as send_error:
                logger.error(f"❌ EMAIL SEND FAILED - Recipient: {user_email}, Zone: {zone_id}, Error: {str(send_error)}")
                logger.error(f"🔧 SMTP DETAILS - Server: {os.getenv('MAIL_SERVER')}, Port: {os.getenv('MAIL_PORT')}, Username: {os.getenv('MAIL_USERNAME')}")
                logger.error(f"🔧 ERROR TYPE - {type(send_error).__name__}")
                logger.exception(f"SMTP error details for {user_email}:")
                return False
            
        except Exception as e:
            logger.error(f"💥 UNEXPECTED ERROR - Recipient: {user_email}, Zone: {zone_id}, Error: {str(e)}")
            logger.exception(f"Unexpected error details for {user_email}:")
            return False
    
    async def send_bulk_notification_emails(
        self, 
        user_emails: list, 
        user_names: list, 
        notification: Dict[str, Any],
        zone_id: str
    ) -> int:
        """Send notification emails to multiple users and return success count."""
        if not user_emails:
            logger.warning(f"⚠️ NO EMAILS TO SEND - Zone: {zone_id}, Empty recipient list")
            return 0
        
        logger.info(f"📬 STARTING BULK EMAIL SEND - Zone: {zone_id}, Total Recipients: {len(user_emails)}")
        logger.info(f"📧 RECIPIENT LIST - Zone: {zone_id}, Emails: {user_emails}")
        
        success_count = 0
        failed_emails = []
        
        for i, email in enumerate(user_emails):
            user_name = user_names[i] if i < len(user_names) else None
            logger.info(f"📤 SENDING EMAIL {i+1}/{len(user_emails)} - Recipient: {email}, Zone: {zone_id}")
            
            try:
                if await self.send_notification_email(email, user_name, notification, zone_id):
                    success_count += 1
                    logger.info(f"✅ EMAIL {i+1} SUCCESS - Recipient: {email}, Zone: {zone_id}")
                else:
                    failed_emails.append(email)
                    logger.error(f"❌ EMAIL {i+1} FAILED - Recipient: {email}, Zone: {zone_id}")
            except Exception as e:
                failed_emails.append(email)
                logger.error(f"💥 EMAIL {i+1} EXCEPTION - Recipient: {email}, Zone: {zone_id}, Error: {str(e)}")
                logger.exception(f"Exception details for email {i+1} to {email}:")
        
        logger.info(f"🎯 BULK EMAIL COMPLETE - Zone: {zone_id}, Success: {success_count}/{len(user_emails)}")
        
        if failed_emails:
            logger.warning(f"⚠️ FAILED EMAILS - Zone: {zone_id}, Failed: {failed_emails}")
            logger.error(f"📊 FAILURE SUMMARY - Zone: {zone_id}, Total: {len(user_emails)}, Success: {success_count}, Failed: {len(failed_emails)}")
        
        return success_count

# Global email service instance
email_service = EmailService()
