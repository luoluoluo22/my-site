/**
 * 离线网页笔记工具
 * 此脚本集成了所有离线网页笔记功能，包括：
 * 1. 创建离线网页版本
 * 2. 打包发布
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 文件路径
const TEMPLATE_HTML_PATH = path.join(__dirname, 'offline-template.html');
const OFFLINE_HTML_PATH = path.join(__dirname, 'offline.html');
const DIST_DIR = path.join(__dirname, 'dist');
const ZIP_PATH = path.join(DIST_DIR, 'offline-notes.zip');

// 命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'help';

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
离线网页笔记工具 - 使用说明
===========================

可用命令:
  node offline.js create   - 创建离线网页版本 (默认)
  node offline.js package  - 打包离线版本为zip文件
  node offline.js help     - 显示此帮助信息

示例:
  node offline.js create   - 创建离线网页版本
  node offline.js package  - 打包离线版本为zip供分发
  `);
}

/**
 * 创建dist目录
 */
function createDistDir() {
  if (!fs.existsSync(DIST_DIR)) {
    console.log(`创建输出目录: ${DIST_DIR}`);
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
}

/**
 * 创建离线网页版本
 */
async function createOfflineWebPage() {
  console.log('开始创建离线网页版本...');
  
  try {
    // 确保模板文件存在
    if (!fs.existsSync(TEMPLATE_HTML_PATH)) {
      console.error(`错误: 模板文件不存在: ${TEMPLATE_HTML_PATH}`);
      return false;
    }
    
    // 读取模板HTML
    console.log('正在读取模板文件...');
    let htmlContent = fs.readFileSync(TEMPLATE_HTML_PATH, 'utf8');
    
    // 添加离线功能和错误处理
    console.log('正在添加离线功能和错误处理...');
    const offlineScript = `
    <script>
      // 网页加载完成后初始化
      window.addEventListener('DOMContentLoaded', function() {
        console.log("===== 离线网页模式已启动 =====");
        console.log("这个页面的UI资源可以离线使用，数据将实时从云端获取");
        
        // 监听网络状态变化
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        
        // 初始检查网络状态
        updateNetworkStatus();
        
        // 添加离线提示
        setTimeout(function() {
          if (!localStorage.getItem('hasShownOfflineIntro')) {
            alert("离线网页笔记已准备就绪！\\n\\n - 网页界面可离线加载\\n - 数据将实时从云端获取\\n - 网络连接断开时会自动提示");
            localStorage.setItem('hasShownOfflineIntro', 'true');
          }
        }, 1000);
      });
      
      // 更新网络状态指示
      function updateNetworkStatus() {
        const isOnline = navigator.onLine;
        const statusElement = document.getElementById('network-status');
        
        if (!statusElement) {
          // 如果状态元素不存在，创建一个
          const statusDiv = document.createElement('div');
          statusDiv.id = 'network-status';
          statusDiv.style.position = 'fixed';
          statusDiv.style.bottom = '10px';
          statusDiv.style.right = '10px';
          statusDiv.style.padding = '8px 12px';
          statusDiv.style.borderRadius = '4px';
          statusDiv.style.fontSize = '14px';
          statusDiv.style.fontWeight = 'bold';
          statusDiv.style.zIndex = '9999';
          document.body.appendChild(statusDiv);
        }
        
        const status = document.getElementById('network-status');
        
        if (isOnline) {
          status.textContent = '网络已连接';
          status.style.backgroundColor = '#4CAF50';
          status.style.color = 'white';
          console.log('网络已连接，数据同步可用');
          
          // 5秒后隐藏状态指示
          setTimeout(() => {
            status.style.opacity = '0.2';
          }, 5000);
          
          // 鼠标悬停时显示
          status.onmouseover = function() {
            status.style.opacity = '1';
          };
          status.onmouseout = function() {
            status.style.opacity = '0.2';
          };
        } else {
          status.textContent = '网络已断开 - 仅界面可用';
          status.style.backgroundColor = '#F44336';
          status.style.color = 'white';
          status.style.opacity = '1';
          console.warn('网络已断开，数据同步不可用');
        }
      }
      
      // 增强原始Supabase连接错误处理
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        return originalFetch(url, options)
          .catch(error => {
            console.error('网络请求失败:', error);
            
            // 检查是否为Supabase请求
            if (url.includes('supabase')) {
              // 显示友好的错误提示
              const status = document.getElementById('network-status');
              if (status) {
                status.textContent = '无法连接到云服务 - 请检查网络';
                status.style.backgroundColor = '#F44336';
                status.style.color = 'white';
                status.style.opacity = '1';
              }
            }
            
            throw error;
          });
      };
      
      // 在控制台显示离线网页信息
      console.log('离线网页模式已初始化');
      console.log('UI资源已缓存，数据将在网络可用时加载');
    </script>
    </body>`;
    
    // 替换结束标签
    htmlContent = htmlContent.replace('</body>', offlineScript);
    
    // 写入新文件
    console.log('正在写入离线HTML文件...');
    fs.writeFileSync(OFFLINE_HTML_PATH, htmlContent);
    
    console.log('创建完成!');
    console.log(`离线HTML文件已保存到: ${OFFLINE_HTML_PATH}`);
    console.log('此离线网页版本:');
    console.log(' - 网页界面可完全离线加载');
    console.log(' - 数据部分需要网络连接');
    console.log(' - 添加了网络状态指示器');
    console.log(' - 增强了错误处理和用户提示');
    
    return true;
  } catch (error) {
    console.error('创建离线网页版本失败:', error.message);
    return false;
  }
}

/**
 * 打包离线版本为ZIP
 */
async function packageOffline() {
  console.log('开始打包离线版本...');
  
  try {
    // 确保离线HTML文件存在
    if (!fs.existsSync(OFFLINE_HTML_PATH)) {
      console.error(`错误: 离线HTML文件不存在: ${OFFLINE_HTML_PATH}`);
      console.log('请先运行 node offline.js create 创建离线版本');
      return false;
    }
    
    // 创建输出目录
    createDistDir();
    
    // 创建一个文件输出流
    const output = fs.createWriteStream(ZIP_PATH);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 设置压缩级别
    });
    
    // 监听所有存档数据传输完成
    output.on('close', function() {
      console.log('打包完成!');
      console.log(`已生成ZIP文件: ${ZIP_PATH}`);
      console.log(`文件大小: ${(archive.pointer() / 1024).toFixed(2)} KB`);
    });
    
    // 监听警告
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.warn('警告:', err);
      } else {
        throw err;
      }
    });
    
    // 监听错误
    archive.on('error', function(err) {
      throw err;
    });
    
    // 管道归档数据到文件
    archive.pipe(output);
    
    // 添加HTML文件到ZIP
    archive.file(OFFLINE_HTML_PATH, { name: '离线笔记.html' });
    
    // 添加README文件
    archive.append(`
# 离线网页笔记使用说明

## 使用方法
1. 解压ZIP文件
2. 双击打开"离线笔记.html"文件到浏览器中
3. 此文件的界面可以离线加载，但数据同步需要网络连接

## 功能
- 网页界面离线加载，加快访问速度
- 数据实时从云端获取
- 响应式设计，适配各种设备
- 主题切换功能
- 支持Markdown格式编辑预览
- 网络状态指示器

## 离线说明
- 此版本仅将网页界面资源离线化
- 数据部分仍需要网络连接
- 如果网络连接不可用，将显示明显提示
- 网络恢复后可自动继续使用
    `, { name: 'README.txt' });
    
    // 完成打包
    await archive.finalize();
    
    return true;
  } catch (error) {
    console.error('打包离线版本失败:', error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('===== 离线网页笔记工具 =====');
  
  switch (command) {
    case 'create':
      await createOfflineWebPage();
      break;
    case 'package':
      await packageOffline();
      break;
    case 'help':
    default:
      showHelp();
      break;
  }
}

// 执行主函数
main().catch(error => {
  console.error('程序执行出错:', error.message);
  process.exit(1);
}); 