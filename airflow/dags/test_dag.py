# airflow/dags/test_dag.py

from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

def say_hello():
    print("Airflow is alive!")

with DAG(
    'test_dag',
    start_date=datetime(2026, 1, 1),
    schedule_interval=None,
    catchup=False,
) as dag:
    PythonOperator(
        task_id='hello',
        python_callable=say_hello,
    )