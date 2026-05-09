"""Centralized configuration. Reads from os.environ (set by docker-compose)."""
import os

# LLM
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
LLM_MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "1024"))

# GitHub
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# AWS S3
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# Kafka
KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9094")
KAFKA_EVALUATION_COMPLETE_TOPIC = os.environ.get(
    "KAFKA_EVALUATION_COMPLETE_TOPIC", "evaluation-complete"
)

# MongoDB
MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://host.docker.internal:27017/recruitech")

# Gmail (comm notification emails)
GMAIL_USER = os.environ.get("GMAIL_USER", "recruitech.ai@gmail.com")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

# Gmail OAuth2 (Gmail API over HTTPS — used on Railway where SMTP ports are blocked)
GMAIL_OAUTH_CLIENT_ID = os.environ.get("GMAIL_OAUTH_CLIENT_ID", "")
GMAIL_OAUTH_CLIENT_SECRET = os.environ.get("GMAIL_OAUTH_CLIENT_SECRET", "")
GMAIL_OAUTH_REFRESH_TOKEN = os.environ.get("GMAIL_OAUTH_REFRESH_TOKEN", "")

# Frontend
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
