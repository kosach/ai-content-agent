#!/bin/bash
# AI Content Agent - Stop All Services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping AI Content Agent Services...${NC}\n"

# Stop all node processes
if pgrep -f "node apps/" > /dev/null; then
    echo -e "${GREEN}✓${NC} Stopping Node services..."
    pkill -f "node apps/"
    sleep 2
    
    # Force kill if still running
    if pgrep -f "node apps/" > /dev/null; then
        echo -e "${RED}⚠️${NC} Some processes still running, force killing..."
        pkill -9 -f "node apps/"
    fi
    
    echo -e "${GREEN}✓${NC} All services stopped"
else
    echo -e "${BLUE}ℹ${NC}  No services were running"
fi

# Optionally stop Docker services
read -p "Stop Docker services (postgres, redis, minio)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd /home/kos/.openclaw/workspace-main/ai-content-agent
    echo -e "${GREEN}✓${NC} Stopping Docker services..."
    docker compose -f docker-compose.dev.yml down
    echo -e "${GREEN}✓${NC} Docker services stopped"
fi

echo -e "\n${GREEN}🎉 Cleanup complete!${NC}\n"
