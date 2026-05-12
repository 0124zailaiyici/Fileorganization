@echo off
reg delete "HKEY_CLASSES_ROOT\Directory\shell\DownloadOrganizer" /f >nul 2>&1
reg delete "HKEY_CLASSES_ROOT\Folder\shell\DownloadOrganizer" /f >nul 2>&1
reg import "%~dp0install-context-menu.reg"
if %errorlevel%==0 (echo OK - restart Explorer or logout/login) else (echo FAIL - run as administrator)
pause
