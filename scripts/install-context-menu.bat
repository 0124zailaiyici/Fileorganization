@echo off
chcp 65001 >nul
echo === 下载文件夹智能管家 - 右键菜单安装 ===
echo.

set REG_KEY=HKEY_CLASSES_ROOT\Directory\shell\DownloadOrganizer
set REG_CMD=%REG_KEY%\command

REM 添加右键菜单
reg add "%REG_KEY%" /ve /t REG_SZ /d "智能整理此文件夹" /f
reg add "%REG_KEY%" /v Icon /t REG_SZ /d "shell32.dll,167" /f
reg add "%REG_CMD%" /ve /t REG_SZ /d "cmd.exe /k \"download-organizer organize --path \"%%1\"\""

if %errorlevel%==0 (
    echo 右键菜单已安装
    echo 在任意文件夹上右键即可看到"智能整理此文件夹"
) else (
    echo 安装失败，请以管理员身份运行
)
echo.
echo 卸载右键菜单: 运行 uninstall-context-menu.bat
pause
