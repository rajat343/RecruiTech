"""Gmail API email sender over HTTPS (port 443).

Railway Hobby plan blocks SMTP ports (25, 465, 587), so we use the Gmail API
REST endpoint instead. This module authenticates via OAuth2 refresh token,
which works with free Gmail accounts (no Google Workspace required).

Required env vars:
    GMAIL_USER                  — sender address (e.g., recruitech.ai@gmail.com)
    GMAIL_OAUTH_CLIENT_ID       — OAuth2 client ID from Google Cloud Console
    GMAIL_OAUTH_CLIENT_SECRET   — OAuth2 client secret
    GMAIL_OAUTH_REFRESH_TOKEN   — refresh token obtained from OAuth2 Playground

Setup:
    1. Go to Google Cloud Console → create project → enable Gmail API
    2. Create OAuth2 credentials (Desktop app type)
    3. Go to https://developers.google.com/oauthplayground/
       - Click gear icon → check "Use your own OAuth credentials"
       - Enter your Client ID and Client Secret
       - In Step 1, select "Gmail API v1" → https://www.googleapis.com/auth/gmail.send
       - Click "Authorize APIs" → sign in with recruitech.ai@gmail.com
       - In Step 2, click "Exchange authorization code for tokens"
       - Copy the Refresh Token
    4. Set the three env vars above in Railway
"""

import base64
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
TOKEN_URI = "https://oauth2.googleapis.com/token"


def send_email(sender: str, to: str, subject: str, html_body: str) -> None:
    """Send an HTML email via Gmail API using OAuth2 refresh token.

    Args:
        sender: The From address (must match the Gmail account that authorized the token).
        to: Recipient email address.
        subject: Email subject line.
        html_body: HTML content of the email body.
    """
    from utils.config import (
        GMAIL_OAUTH_CLIENT_ID,
        GMAIL_OAUTH_CLIENT_SECRET,
        GMAIL_OAUTH_REFRESH_TOKEN,
    )

    if not all([GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN]):
        raise RuntimeError(
            "Gmail OAuth2 env vars not set (GMAIL_OAUTH_CLIENT_ID, "
            "GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN). "
            "Cannot send email via Gmail API."
        )

    # Create credentials from refresh token
    credentials = Credentials(
        token=None,
        refresh_token=GMAIL_OAUTH_REFRESH_TOKEN,
        token_uri=TOKEN_URI,
        client_id=GMAIL_OAUTH_CLIENT_ID,
        client_secret=GMAIL_OAUTH_CLIENT_SECRET,
        scopes=SCOPES,
    )

    # Refresh to get a valid access token
    credentials.refresh(Request())

    # Build Gmail API client
    service = build("gmail", "v1", credentials=credentials, cache_discovery=False)

    # Construct MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"RecruiTech <{sender}>"
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    # Encode and send
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
    service.users().messages().send(
        userId="me",
        body={"raw": raw_message},
    ).execute()

    logger.info(f"Email sent via Gmail API to {to} (subject: {subject})")
