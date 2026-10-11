FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
# libgomp1: required by fastembed / onnxruntime for OpenMP threading
# curl: required for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifest first for layer caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy Alembic database migration files and configuration
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini

# Copy backend application code
COPY backend /app/backend

# Copy and configure entrypoint script
COPY backend/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

# Create non-root user and configure ownership
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Environment settings
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Health check using the live /health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://127.0.0.1:8000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
