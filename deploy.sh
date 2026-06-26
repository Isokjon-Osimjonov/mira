#!/bin/bash
set -e

echo "=== Mira Market Blue-Green Deploy ==="
echo "Image tag: ${IMAGE_TAG:-latest}"

# Determine which color is currently live by checking
# which port Nginx upstream currently points to
CURRENT_UPSTREAM=$(grep -oP 'proxy_pass http://127.0.0.1:\K[0-9]+' \
  /etc/nginx/sites-available/api.miramarket.uz || echo "4000")

if [ "$CURRENT_UPSTREAM" = "4000" ]; then
  LIVE_COLOR="blue"
  LIVE_PORT="4000"
  IDLE_COLOR="green"
  IDLE_PORT="4001"
else
  LIVE_COLOR="green"
  LIVE_PORT="4001"
  IDLE_COLOR="blue"
  IDLE_PORT="4000"
fi

echo "Currently live: $LIVE_COLOR (port $LIVE_PORT)"
echo "Deploying to idle: $IDLE_COLOR (port $IDLE_PORT)"

# Pull the new image
docker compose -f docker-compose.prod.yml pull api_$IDLE_COLOR

# Start the idle container with the new image
docker compose -f docker-compose.prod.yml --profile $IDLE_COLOR up -d api_$IDLE_COLOR

echo "Waiting for $IDLE_COLOR to become healthy..."
sleep 5

# Health check the idle container directly on its port
HEALTH_CHECK_OK=false
for i in $(seq 1 10); do
  if curl -sf http://127.0.0.1:$IDLE_PORT/health > /dev/null; then
    HEALTH_CHECK_OK=true
    break
  fi
  echo "Attempt $i: not healthy yet, waiting..."
  sleep 3
done

if [ "$HEALTH_CHECK_OK" = false ]; then
  echo "ERROR: $IDLE_COLOR failed health check. Aborting deploy."
  echo "Rolling back: stopping $IDLE_COLOR container."
  docker compose -f docker-compose.prod.yml stop api_$IDLE_COLOR
  exit 1
fi

echo "$IDLE_COLOR is healthy. Switching Nginx traffic..."

# Flip Nginx upstream to the new color's port
sudo sed -i "s/127.0.0.1:$LIVE_PORT/127.0.0.1:$IDLE_PORT/" \
  /etc/nginx/sites-available/api.miramarket.uz

sudo nginx -t
sudo systemctl reload nginx

echo "Traffic switched to $IDLE_COLOR (port $IDLE_PORT)."
echo "Stopping old $LIVE_COLOR container in 10 seconds (safety window)..."
sleep 10

docker compose -f docker-compose.prod.yml stop api_$LIVE_COLOR

echo "=== Deploy complete. Live: $IDLE_COLOR ==="
