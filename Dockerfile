# Use a pre-compiled ML base image that already has PyTorch CPU and OpenCV pre-installed
FROM ultralytics/ultralytics:latest-cpu

WORKDIR /app

# Install curl for the Docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt file
COPY requirements.txt .

# Remove heavy frameworks from the install loop since they are already pre-baked into the base image
RUN sed -i '/torch/d' requirements.txt && \
    sed -i '/torchvision/d' requirements.txt && \
    sed -i '/opencv/d' requirements.txt && \
    pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the core project workspace application layers
COPY . .

# Ensure data runtime structures are safely available
RUN mkdir -p data outputs

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]