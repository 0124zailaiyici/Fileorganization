@echo off
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
del "%STARTUP_DIR%\download-organizer.vbs" 2>nul
echo 已卸载开机自启
pause
