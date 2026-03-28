FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required by OpenCV
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user (Hugging Face requirement)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy the actual code and models into the container
COPY --chown=user:user backend/ ./backend/
COPY --chown=user:user AI_Models/ ./AI_Models/

# Expose the correct port for Hugging Face Spaces (Spaces always expose 7860 to the public)
EXPOSE 7860

# Command to run the Fast API app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
