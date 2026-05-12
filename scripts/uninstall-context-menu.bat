@echo off
reg delete "HKEY_CLASSES_ROOT\Directory\shell\DownloadOrganizer" /f
echo 右键菜单已卸载
pause
