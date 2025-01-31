# 创建开机启动快捷方式
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\MyNoteAutostart.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\autostart.ps1`""
$Shortcut.WindowStyle = 7  # 最小化窗口
$Shortcut.Save()

# 安装依赖
Set-Location $PSScriptRoot
npm install

Write-Host "安装完成！系统重启后将自动启动本地服务。"
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown') 