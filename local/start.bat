@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 检查是否以管理员权限运行
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 请以管理员权限运行此脚本
    powershell -Command "Start-Process '%~dpnx0' -Verb RunAs"
    exit /b
)

:: 创建开机自启动快捷方式
echo 正在设置开机自启动...
set "startup_dir=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "shortcut_path=%startup_dir%\CommandServer.lnk"
powershell -NoProfile -Command "$WS = New-Object -ComObject WScript.Shell; $shortcut = $WS.CreateShortcut('%shortcut_path%'); $shortcut.TargetPath = '%~dp0start.bat'; $shortcut.WorkingDirectory = '%~dp0'; $shortcut.WindowStyle = 7; $shortcut.Save()"

echo 正在检查Node.js环境...

:: 检查node是否已安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js未安装，正在下载安装包...
    
    :: 创建临时目录
    mkdir "%temp%\nodejs-setup" 2>nul
    
    :: 下载Node.js安装包
    powershell -NoProfile -Command "$nodeUrl = 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi'; $output = Join-Path $env:TEMP 'nodejs-setup\node-setup.msi'; Invoke-WebRequest -Uri $nodeUrl -OutFile $output"
    
    if !errorlevel! neq 0 (
        echo 下载Node.js失败，请检查网络连接或手动安装Node.js
        pause
        exit /b 1
    )
    
    echo 正在安装Node.js...
    msiexec /i "%temp%\nodejs-setup\node-setup.msi" /qn
    
    if !errorlevel! neq 0 (
        echo 安装Node.js失败，请以管理员权限运行或手动安装
        pause
        exit /b 1
    )
    
    :: 等待安装完成
    timeout /t 5 /nobreak
    
    :: 清理临时文件
    rmdir /s /q "%temp%\nodejs-setup"
    
    :: 刷新环境变量
    echo 正在刷新环境变量...
    for /f "delims=" %%i in ('powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable('Path', 'Machine')"') do set "PATH=%%i;%PATH%"
    
    :: 验证Node.js安装
    where node >nul 2>nul
    if !errorlevel! neq 0 (
        echo Node.js安装完成，但需要重启命令行才能生效
        echo 请关闭此窗口并重新运行start.bat
        pause
        exit /b 0
    )
)

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    if !errorlevel! neq 0 (
        echo 安装依赖失败，请检查网络连接
        pause
        exit /b 1
    )
)

:: 启动服务
echo 正在启动服务...
set NODE_NO_WARNINGS=1
node --no-warnings server.js

pause 