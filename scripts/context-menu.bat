@echo off
chcp 65001 >nul
node "%~dp0..\dist\index.js" organize --path "%~1"
pause
