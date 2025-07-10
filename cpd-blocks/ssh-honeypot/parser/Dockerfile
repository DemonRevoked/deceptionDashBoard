FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY parser.py .

# Set Python to run unbuffered
ENV PYTHONUNBUFFERED=1

# Use exec form of CMD to ensure proper signal handling
CMD ["python", "-u", "parser.py"]

