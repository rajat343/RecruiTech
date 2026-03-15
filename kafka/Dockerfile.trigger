FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir kafka-python-ng==2.2.3 requests>=2.31.0

COPY kafka_trigger.py .

CMD ["python", "-u", "kafka_trigger.py"]
