FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc fonts-dejavu-core && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p /app/logs

EXPOSE 8000
# Прод-параметры воркеров задаёт docker-compose (WEB_CONCURRENCY). Здесь дефолт
# для автономного запуска образа: 4 воркера под текущий 4-ядерный сервер.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", \
     "--workers", "4", "--timeout", "60", \
     "--max-requests", "1000", "--max-requests-jitter", "100"]
