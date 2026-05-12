@echo off
reg delete "HKEY_CLASSES_ROOT\Directory\shell\DownloadOrganizer" /f >nul 2>&1
reg delete "HKEY_CLASSES_ROOT\Folder\shell\DownloadOrganizer" /f >nul 2>&1
reg import "%~dp0install-context-menu.reg"
if %errorlevel%==0 (echo Done) else (echo FAIL - right-click this file, Run as Administrator)
pause
