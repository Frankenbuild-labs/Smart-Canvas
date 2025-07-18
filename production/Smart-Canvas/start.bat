@echo off
echo 🎨 Starting Smart Canvas...
echo.

echo 📦 Installing dependencies...
call npm install
echo.

echo 🐍 Starting backend server...
start "Smart Canvas Backend" cmd /k "cd backend && python main.py"
timeout /t 3 /nobreak > nul

echo ⚛️ Starting frontend development server...
start "Smart Canvas Frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul

echo.
echo 🚀 Smart Canvas is starting up!
echo 📱 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/api/docs
echo.
echo Press any key to exit...
pause > nul
