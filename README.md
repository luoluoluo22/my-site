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
# 安装依赖
npm install

# 启动服务器
npm start
```

### 2. 使用浏览器原生 API（实验性）

如果不想使用 Node.js 服务器，可以使用浏览器原生的 `window.chrome.webview` API。
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
├── server.js       # 命令执行服务器（可选）
└── package.json    # 项目配置
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