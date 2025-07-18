#!/bin/bash

echo "🎨 Starting Smart Canvas..."
echo

echo "📦 Installing dependencies..."
npm install
echo

echo "🐍 Starting backend server..."
cd backend
python main.py &
BACKEND_PID=$!
cd ..

echo "⚛️ Starting frontend development server..."
npm run dev &
FRONTEND_PID=$!

echo
echo "🚀 Smart Canvas is running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/api/docs"
echo
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
