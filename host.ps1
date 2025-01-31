# 检查是否安装了 WebView2 Runtime
$webview2Path = "C:\Program Files (x86)\Microsoft\EdgeWebView\Application"
if (-not (Test-Path $webview2Path)) {
    Write-Host "正在下载 WebView2 Runtime..."
    $installer = "$env:TEMP\MicrosoftEdgeWebView2Setup.exe"
    Invoke-WebRequest "https://go.microsoft.com/fwlink/p/?LinkId=2124703" -OutFile $installer
    Start-Process -FilePath $installer -Args "/silent /install" -Wait
    Remove-Item $installer
}

# 创建 WinForms 窗口和 WebView2 控件
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.Web.WebView2.Core
Add-Type -AssemblyName Microsoft.Web.WebView2.WinForms

$form = New-Object System.Windows.Forms.Form
$form.Text = "个人笔记管理系统"
$form.Width = 1200
$form.Height = 800
$form.StartPosition = "CenterScreen"

$webview = New-Object Microsoft.Web.WebView2.WinForms.WebView2
$webview.Dock = "Fill"
$webview.CreationProperties = New-Object Microsoft.Web.WebView2.WinForms.CoreWebView2CreationProperties

# 初始化 WebView2
$form.Controls.Add($webview)
$webview.EnsureCoreWebView2Async($null)

# 添加 PowerShell 执行功能
$webview.CoreWebView2.AddHostObjectToScript("powershell", {
    function executeCommand($command) {
        try {
            $result = Invoke-Expression $command | Out-String
            return $result
        }
        catch {
            throw $_.Exception.Message
        }
    }
}.GetNewClosure())

# 导航到本地网页
$currentPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$webview.Source = "file:///$currentPath/index.html"

# 显示窗口
$form.ShowDialog() 