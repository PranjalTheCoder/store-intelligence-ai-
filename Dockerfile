FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV AND curl for the Docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Optimize layer caching for dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files securely
COPY . .

# Ensure necessary staging directories exist with proper write permissions
RUN mkdir -p data outputs

EXPOSE 8000

# Default production command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]