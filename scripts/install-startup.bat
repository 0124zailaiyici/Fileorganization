@echo off
chcp 65001 >nul
echo === 下载文件夹智能管家 - 开机自启安装 ===
echo.

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS_FILE=%STARTUP_DIR%\download-organizer.vbs

REM ============================================
REM 修改下面两行来配置要监控的目录
REM ============================================
set PATH1=D:\下载
set PATH2=C:\Users\wx\Downloads
set PATH3=
REM ============================================

> "%VBS_FILE%" (
echo ' 下载文件夹智能管家 - 开机自启
echo ' 修改监控目录: 编辑下方路径，多个目录复制整行
echo.
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "download-organizer watch --path %PATH1% --path %PATH2%", 0, False
)

echo 已安装，监控目录:
if not "%PATH1%"=="" echo   - %PATH1%
if not "%PATH2%"=="" echo   - %PATH2%
if not "%PATH3%"=="" echo   - %PATH3%
echo.
echo 修改目录: 重新运行此脚本或直接编辑 %VBS_FILE%
echo 卸载: 运行 uninstall-startup.bat
pause
