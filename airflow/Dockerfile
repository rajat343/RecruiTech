FROM apache/airflow:2.10.5

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/airflow/.local/share/crewai/credentials \
    /home/airflow/.local/share/airflow \
    /home/airflow/.cache \
    && chmod -R 777 /home/airflow/.local /home/airflow/.cache

USER airflow

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
