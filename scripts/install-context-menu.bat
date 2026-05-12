@echo off
reg import "%~dp0install-context-menu.reg"
if %errorlevel%==0 (
    echo context menu installed - right-click any folder
) else (
    echo failed - run as administrator
)
pause
