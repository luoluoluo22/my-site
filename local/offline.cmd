@echo off
echo ===== 离线网页笔记工具 =====
echo.

REM 检查Node.js是否安装
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo 错误: 未找到Node.js，请先安装Node.js
  echo 下载地址: https://nodejs.org/
  pause
  exit /b 1
)

REM 检查依赖是否已安装
if not exist node_modules (
  echo 正在安装依赖...
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo 依赖安装失败，请手动运行 npm install
    pause
    exit /b 1
  )
)

REM 检查模板文件是否存在
if not exist offline-template.html (
  echo 错误: 未找到模板文件 offline-template.html
  echo 请确保模板文件存在
  pause
  exit /b 1
)

echo 选择操作:
echo [1] 创建离线网页版本
echo [2] 打包离线版本为ZIP
echo [Q] 退出
echo.

choice /C 12Q /N /M "请选择操作 [1-2,Q]: "

if %ERRORLEVEL% equ 1 (
  call node offline.js create
) else if %ERRORLEVEL% equ 2 (
  call node offline.js package
) else if %ERRORLEVEL% equ 3 (
  echo 退出程序
  exit /b 0
)

echo.
echo 操作完成！
echo.
echo 说明:
echo - 离线网页版本仅缓存网页界面，数据需要网络连接
echo - 如需打开离线笔记，请用浏览器打开 offline.html 文件
echo - 如需分发离线笔记，请使用生成的 dist/offline-notes.zip 文件

pause 