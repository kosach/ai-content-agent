#!/bin/bash
# AI Content Agent - Launch All Services

set -e

PROJECT_ROOT="/home/kos/.openclaw/workspace-main/ai-content-agent"
LOGS_DIR="$PROJECT_ROOT/logs"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Launching AI Content Agent Services...${NC}\n"

# Create logs directory
mkdir -p "$LOGS_DIR"

# Check if services already running
if pgrep -f "node apps/" > /dev/null; then
    echo -e "${YELLOW}⚠️  Services already running. Stopping them first...${NC}"
    pkill -f "node apps/" || true
    sleep 2
fi

# Check Docker services
echo -e "${BLUE}📦 Checking Docker services...${NC}"
if ! docker ps | grep -q ai-agent; then
    echo -e "${YELLOW}⚠️  Docker services not running. Starting them...${NC}"
    cd "$PROJECT_ROOT"
    docker compose -f docker-compose.dev.yml up -d
    sleep 5
fi

# Start services
cd "$PROJECT_ROOT"

echo -e "${GREEN}✓${NC} Starting API Server (port 3000)..."
node apps/api/dist/index.js > "$LOGS_DIR/api.log" 2>&1 &
API_PID=$!
sleep 2

echo -e "${GREEN}✓${NC} Starting Telegram Bot (@my_doer_bot)..."
node apps/telegram-bot/dist/index.js > "$LOGS_DIR/bot.log" 2>&1 &
BOT_PID=$!
sleep 2

echo -e "${GREEN}✓${NC} Starting Analysis Worker..."
node apps/worker-analysis/dist/index.js > "$LOGS_DIR/analysis.log" 2>&1 &
ANALYSIS_PID=$!
sleep 2

echo -e "${GREEN}✓${NC} Starting Generation Worker..."
node apps/worker-generation/dist/index.js > "$LOGS_DIR/generation.log" 2>&1 &
GENERATION_PID=$!
sleep 2

# Check if all services started
sleep 2
FAILED=0

if ! ps -p $API_PID > /dev/null; then
    echo -e "${YELLOW}⚠️  API Server failed to start. Check logs/api.log${NC}"
    FAILED=1
fi

if ! ps -p $BOT_PID > /dev/null; then
    echo -e "${YELLOW}⚠️  Telegram Bot failed to start. Check logs/bot.log${NC}"
    FAILED=1
fi

if ! ps -p $ANALYSIS_PID > /dev/null; then
    echo -e "${YELLOW}⚠️  Analysis Worker failed to start. Check logs/analysis.log${NC}"
    FAILED=1
fi

if ! ps -p $GENERATION_PID > /dev/null; then
    echo -e "${YELLOW}⚠️  Generation Worker failed to start. Check logs/generation.log${NC}"
    FAILED=1
fi

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All services started successfully!${NC}\n"
    echo -e "${BLUE}📊 Service Status:${NC}"
    echo -e "  API Server:          http://localhost:3000 (PID: $API_PID)"
    echo -e "  Telegram Bot:        @my_doer_bot (PID: $BOT_PID)"
    echo -e "  Analysis Worker:     Running (PID: $ANALYSIS_PID)"
    echo -e "  Generation Worker:   Running (PID: $GENERATION_PID)"
    echo ""
    echo -e "${BLUE}📝 Logs:${NC}"
    echo -e "  View all logs:       tail -f $LOGS_DIR/*.log"
    echo -e "  API logs:            tail -f $LOGS_DIR/api.log"
    echo -e "  Bot logs:            tail -f $LOGS_DIR/bot.log"
    echo ""
    echo -e "${BLUE}🧪 Test the bot:${NC}"
    echo -e "  Open Telegram:       https://t.me/my_doer_bot"
    echo -e "  Send:                /start"
    echo -e "  Upload:              Video or photo"
    echo ""
    echo -e "${BLUE}🛑 To stop all services:${NC}"
    echo -e "  Run:                 pkill -f 'node apps/'"
    echo ""
else
    echo -e "\n${YELLOW}⚠️  Some services failed to start. Check logs for details.${NC}\n"
    exit 1
fi
