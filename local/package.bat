@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 正在创建部署包...

:: 创建临时目录
set "temp_dir=%temp%\command-server-package"
mkdir "%temp_dir%" 2>nul

:: 复制必要文件
echo 正在复制文件...
xcopy /Y /E /I "." "%temp_dir%\command-server" >nul

:: 删除不需要的文件和目录
if exist "%temp_dir%\command-server\node_modules" (
    rmdir /s /q "%temp_dir%\command-server\node_modules"
)
if exist "%temp_dir%\command-server\.git" (
    rmdir /s /q "%temp_dir%\command-server\.git"
)
del /f /q "%temp_dir%\command-server\package-lock.json" 2>nul

:: 创建压缩包
echo 正在创建压缩包...
powershell -Command ^
    "Compress-Archive -Path '%temp_dir%\command-server' -DestinationPath '%~dp0..\command-server.zip' -Force"

:: 清理临时文件
rmdir /s /q "%temp_dir%"

echo 打包完成！压缩包位置：%~dp0..\command-server.zip
pause 