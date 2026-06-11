FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# uv como instalador rápido de dependencias
RUN pip install --no-cache-dir uv

# Instalar deps primero para aprovechar la caché de capas
COPY requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

# Código (en dev se sobreescribe con el volumen; necesario para build/prod)
COPY . .

EXPOSE 8000
