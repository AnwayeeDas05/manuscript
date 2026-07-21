FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (libpq-dev needed for PostgreSQL/asyncpg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy NLP model
RUN python -m spacy download en_core_web_sm

# Copy project files
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Start script: run migrations if PostgreSQL, then start server
CMD ["sh", "-c", "if echo $DATABASE_URL | grep -q 'postgresql'; then alembic upgrade head; fi && uvicorn main:app --host 0.0.0.0 --port 8000"]
