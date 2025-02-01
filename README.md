# 个人笔记管理系统

一个支持 Markdown 编辑、实时预览、跨设备命令执行的个人笔记管理系统。

## 功能特点

- 📝 Markdown 编辑与实时预览
- 🌓 深色/浅色主题切换
- 💾 智能自动保存
- 🔍 笔记搜索
- 🖥️ 跨设备命令执行
- 📋 代码块一键复制
- 🔒 简单的密码保护
- 🌐 局域网设备自动发现
- 🚀 一键部署本地服务

## 命令执行功能

系统支持跨设备执行本地 PowerShell 命令：

### 1. 本地服务部署

#### 方式一：下载部署包（推荐）

1. 在笔记页面点击"下载本地版本"
2. 解压下载的 `command-server.zip`
3. 以管理员身份运行 `start.bat`
4. 服务将自动安装并启动

#### 方式二：从源码安装

1. 克隆仓库
```bash
git clone https://github.com/luoluoluo22/my-site.git
```

2. 进入local目录并运行启动脚本
```bash
cd my-site/local
start.bat
```

### 2. 自动化功能

- 自动检测并安装Node.js环境
- 自动安装所需依赖
- 支持开机自动启动
- 后台静默运行

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

## 数据存储

笔记数据存储在 Supabase 数据库中，确保数据的安全性和可访问性。

## 项目结构

```
my-site/
├── app.js          # 主应用代码
├── style.css       # 样式文件
├── index.html      # 主页面
├── build.js        # 构建脚本
├── package.json    # 项目配置
└── local/          # 本地开发相关
    ├── server.js   # WebSocket 服务器
    ├── start.bat   # 启动脚本
    ├── package.bat # 打包脚本
    └── package.json # 本地开发配置
```

## 后续开发计划

1. [ ] 批量命令执行
2. [ ] 命令执行历史记录
3. [ ] 更多的代码高亮支持
4. [ ] 笔记分类和标签
5. [ ] 笔记导入导出

## 技术支持

如有问题或建议，请提交Issue或Pull Request。 