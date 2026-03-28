@echo off
title RetinAI App Runner

echo =========================================
echo    STARTING RETIN-AI CLINICAL SUITE
echo =========================================

echo [1/2] Launching Python FastAPI Backend...
start "RetinAI Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"

echo [2/2] Launching Next.js Frontend...
start "RetinAI Frontend" cmd /k "cd frontend-next && npm run dev"

echo =========================================
echo All services are spinning up!
echo The app will be available at: http://localhost:3000
echo =========================================
exit
