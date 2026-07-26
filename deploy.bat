@echo off
echo ========================================
echo   English Learning Bot - Deploy Script
echo ========================================
echo.

REM Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Git is not installed! Install from: https://git-scm.com
    pause
    exit /b 1
)

REM Check if .env exists
if not exist .env (
    echo Creating .env from template...
    copy .env.example .env
    echo Please edit .env file with your BOT_TOKEN and ADMIN_IDS
    pause
    exit /b 1
)

REM Initialize git if not already
if not exist .git (
    echo Initializing git repository...
    git init
)

REM Add and commit
echo Adding files to git...
git add .
git commit -m "English Learning Mini App"

echo.
echo ========================================
echo   Next steps:
echo ========================================
echo.
echo 1. Go to https://render.com and sign up (free)
echo 2. Click "New +" then "Web Service"
echo 3. Connect your GitHub repo
echo 4. Set these environment variables:
echo    BOT_TOKEN = your bot token from @BotFather
echo    ADMIN_IDS = your telegram user ID
echo    WEBAPP_URL = https://your-app-name.onrender.com
echo    BOT_WEBAPP_URL = https://your-app-name.onrender.com
echo 5. Click "Create Web Service"
echo.
echo Your bot will be live at: https://your-app-name.onrender.com
echo.
pause
