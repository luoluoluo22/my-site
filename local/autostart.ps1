# 获取脚本所在目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# 启动本地服务器
Start-Process "node" -ArgumentList "$scriptPath\server.js" -WindowStyle Hidden

# 启动 WebView2 主机
Start-Process "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath\host.ps1`"" -WindowStyle Hidden

Write-Host "本地服务已启动！" 