# 个人笔记管理系统

一个支持 Markdown 编辑、实时预览、本地命令执行的个人笔记管理系统。

## 功能特点

- 📝 Markdown 编辑与实时预览
- 🌓 深色/浅色主题切换
- 💾 自动保存
- 🔍 笔记搜索
- 🖥️ PowerShell 命令执行
- 📋 代码块一键复制
- 🔒 简单的密码保护

## 命令执行功能

系统支持两种方式执行本地 PowerShell 命令：

### 1. 使用 Node.js 服务器（推荐）

需要先启动本地服务器：

```bash
# 进入本地开发目录
cd local

# 安装依赖
npm install

# 启动服务器
npm start
```

### 2. 使用浏览器原生 API（实验性）

如果不想使用 Node.js 服务器，可以使用浏览器原生的 `window.chrome.webview` API：

```powershell
# 进入本地开发目录
cd local

# 运行 WebView2 主机
.\host.ps1
```

这种方式需要将网页嵌入到 WebView2 环境中运行。

## PowerShell 命令格式

在 Markdown 中使用以下格式编写命令：

````markdown
```powershell
# 普通命令
Get-Location

# 需要管理员权限的命令
#requires admin
New-Item -ItemType Directory -Path "C:\TestFolder"
```
````

特殊标记：
- `#requires admin`: 标记需要管理员权限的命令
- 命令会自动编号
- 支持一键复制和执行

## 数据存储

笔记数据存储在 Supabase 数据库中，确保数据的安全性和可访问性。

## 开发相关

### 项目结构

```
my-site/
├── app.js          # 主应用代码
├── style.css       # 样式文件
├── index.html      # 主页面
├── build.js        # 构建脚本
├── package.json    # 项目配置
└── local/          # 本地开发相关
    ├── server.js   # WebSocket 服务器
    ├── host.ps1    # WebView2 主机
    └── package.json # 本地开发配置
```

### 环境变量

需要配置以下环境变量：
- `SUPABASE_URL`: Supabase 项目 URL
- `SUPABASE_KEY`: Supabase 匿名密钥

## 注意事项

1. 命令执行功能需要合适的权限
2. 管理员权限的命令会有特殊标记
3. 建议在受信任的环境中使用
4. 定期备份重要笔记

## 后续开发计划

1. [ ] 批量命令执行
2. [ ] 命令执行历史记录
3. [ ] 更多的代码高亮支持
4. [ ] 笔记分类和标签
5. [ ] 笔记导入导出

# 跨设备命令执行工具

一个基于WebSocket的跨设备命令执行工具，支持在移动设备上远程执行电脑端命令。

## 主要功能

1. 跨设备命令执行
   - 支持在移动设备上执行电脑端命令
   - 自动发现局域网内的可用服务
   - 智能连接管理，避免重复连接

2. 自动化部署
   - 自动检测并安装Node.js环境
   - 自动安装所需依赖
   - 支持开机自动启动
   - 提供一键打包部署功能

3. 中文支持
   - 完整的中文界面
   - 支持中文命令输入和输出
   - 正确显示中文字符

## 快速开始

### 方式一：下载部署包

1. 下载 `command-server.zip` 并解压
2. 以管理员身份运行 `start.bat`
3. 服务将自动安装并启动

### 方式二：从源码安装

1. 克隆仓库
```bash
git clone https://github.com/luoluoluo22/my-site.git
```

2. 进入local目录
```bash
cd my-site/local
```

3. 运行启动脚本
```bash
start.bat
```

## 自动化功能说明

### 开机自启动
- 首次运行 `start.bat` 时会自动配置开机自启动
- 服务将在后台最小化运行
- 可在任务管理器中查看运行状态

### 打包部署
1. 运行 `package.bat` 生成部署包
2. 部署包将保存为 `command-server.zip`
3. 包含所有必要文件，解压即可使用

## 环境要求

- Windows 7/10/11
- Node.js v20.11.0 或更高版本（启动脚本会自动安装）
- 管理员权限（用于配置开机自启动）

## 注意事项

1. 首次运行需要管理员权限
2. 如遇到安装失败，请检查：
   - 网络连接是否正常
   - 是否有足够的磁盘空间
   - 防火墙是否允许Node.js访问网络

3. 移动端使用说明：
   - 确保手机和电脑在同一局域网内
   - 首次连接时需要等待服务发现
   - 如果无法发现服务，请检查网络设置

## 技术支持

如有问题或建议，请提交Issue或Pull Request。 