@echo off
reg delete "HKEY_CLASSES_ROOT\Directory\shell\DownloadOrganizer" /f
if %errorlevel%==0 (echo context menu removed) else (echo failed - run as administrator)
pause
