#!/bin/bash
# Rebuild and restart the Docker container with the latest code

echo "Stopping container..."
docker-compose down

echo "Rebuilding image..."
docker-compose build --no-cache

echo "Starting container..."
docker-compose up -d

echo "Checking logs..."
docker-compose logs -f --tail=50
