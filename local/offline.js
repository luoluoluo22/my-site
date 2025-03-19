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

// Supabase默认配置，可在.env文件中修改
const DEFAULT_SUPABASE_URL = 'https://gptacdyjxmjzlmgwjmms.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZham9tY3liaHZoeXRldXprbXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NDM0OTUsImV4cCI6MjA1NjAxOTQ5NX0.FVT19962rmokZX4apGz1MTHbOIIa-eNRI0ndHse_zAY';

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
      // 默认Supabase连接配置
      const DEFAULT_SUPABASE_URL = '${DEFAULT_SUPABASE_URL}';
      const DEFAULT_SUPABASE_KEY = '${DEFAULT_SUPABASE_KEY}';
      
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
        
        // 添加设置按钮
        addSettingsButton();
      });
      
      // 添加设置按钮
      function addSettingsButton() {
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'offline-settings-btn';
        settingsBtn.innerText = '⚙️';
        settingsBtn.title = '设置Supabase连接';
        settingsBtn.style.position = 'fixed';
        settingsBtn.style.bottom = '10px';
        settingsBtn.style.left = '10px';
        settingsBtn.style.padding = '8px';
        settingsBtn.style.fontSize = '16px';
        settingsBtn.style.borderRadius = '50%';
        settingsBtn.style.backgroundColor = '#f0f0f0';
        settingsBtn.style.border = '1px solid #ccc';
        settingsBtn.style.cursor = 'pointer';
        settingsBtn.style.zIndex = '9999';
        
        settingsBtn.addEventListener('click', showSettingsPanel);
        document.body.appendChild(settingsBtn);
      }
      
      // 显示设置面板
      function showSettingsPanel() {
        // 如果已经存在设置面板，则删除
        const existingPanel = document.getElementById('offline-settings-panel');
        if (existingPanel) {
          existingPanel.remove();
          return;
        }
        
        // 创建设置面板
        const panel = document.createElement('div');
        panel.id = 'offline-settings-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '50px';
        panel.style.left = '10px';
        panel.style.width = '300px';
        panel.style.padding = '15px';
        panel.style.backgroundColor = 'white';
        panel.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
        panel.style.borderRadius = '5px';
        panel.style.zIndex = '9998';
        
        // 获取当前的Supabase配置
        const currentUrl = localStorage.getItem('supabaseUrl') || DEFAULT_SUPABASE_URL;
        const currentKey = localStorage.getItem('supabaseKey') || DEFAULT_SUPABASE_KEY;
        
        // 设置面板内容
        panel.innerHTML = \`
          <h3 style="margin-top:0;margin-bottom:10px;">Supabase连接设置</h3>
          <div style="margin-bottom:10px;">
            <label for="supabase-url" style="display:block;margin-bottom:5px;">Supabase URL:</label>
            <input type="text" id="supabase-url" value="\${currentUrl}" style="width:100%;padding:5px;">
          </div>
          <div style="margin-bottom:15px;">
            <label for="supabase-key" style="display:block;margin-bottom:5px;">Supabase Key:</label>
            <input type="text" id="supabase-key" value="\${currentKey}" style="width:100%;padding:5px;">
          </div>
          <div style="display:flex;justify-content:space-between;">
            <button id="reset-settings" style="padding:5px 10px;">重置</button>
            <button id="save-settings" style="padding:5px 10px;background-color:#4CAF50;color:white;border:none;border-radius:3px;">保存</button>
          </div>
          <div style="margin-top:10px;font-size:12px;color:#888;">
            修改后需要刷新页面才能生效
          </div>
        \`;
        
        document.body.appendChild(panel);
        
        // 添加事件监听器
        document.getElementById('save-settings').addEventListener('click', function() {
          const newUrl = document.getElementById('supabase-url').value.trim();
          const newKey = document.getElementById('supabase-key').value.trim();
          
          // 保存到localStorage
          localStorage.setItem('supabaseUrl', newUrl);
          localStorage.setItem('supabaseKey', newKey);
          
          // 显示成功消息
          alert('设置已保存，请刷新页面以应用更改');
          panel.remove();
        });
        
        document.getElementById('reset-settings').addEventListener('click', function() {
          document.getElementById('supabase-url').value = DEFAULT_SUPABASE_URL;
          document.getElementById('supabase-key').value = DEFAULT_SUPABASE_KEY;
        });
      }
      
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
          
          // 添加点击功能，手动重试连接
          status.style.cursor = 'pointer';
          status.title = '点击重试连接';
          status.onclick = function() {
            status.textContent = '正在重试连接...';
            // 如果页面有NoteApp对象，尝试重新初始化
            if (window.NoteApp && typeof window.NoteApp.init === 'function') {
              try {
                window.NoteApp.init();
                console.log('已尝试重新初始化应用');
              } catch (err) {
                console.error('重新初始化失败:', err);
              }
            }
            // 1秒后重新检查状态
            setTimeout(updateNetworkStatus, 1000);
          };
          
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
          status.style.cursor = 'default';
          status.onclick = null;
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
                status.textContent = '无法连接到云服务 - 点击设置';
                status.style.backgroundColor = '#F44336';
                status.style.color = 'white';
                status.style.opacity = '1';
                status.style.cursor = 'pointer';
                
                // 添加点击打开设置面板的功能
                status.onclick = function() {
                  showSettingsPanel();
                };
              }
              
              // 记录详细错误信息，用于问题诊断
              if (url) {
                console.error('请求URL:', url.substring(0, 100) + (url.length > 100 ? '...' : ''));
              }
              if (options && options.method) {
                console.error('请求方法:', options.method);
              }
            }
            
            throw error;
          });
      };
      
      // 添加自动重试逻辑（针对Supabase连接）
      // 当应用初始化后，如果发现Supabase连接无效，可以尝试重试
      function addRetryLogic() {
        // 检查是否存在应用初始化函数
        if (window.NoteApp && typeof window.NoteApp.initSupabaseConnection === 'function') {
          // 保存原始函数
          const originalInitConnection = window.NoteApp.initSupabaseConnection;
          
          // 替换为带重试逻辑的函数
          window.NoteApp.initSupabaseConnection = function() {
            try {
              // 调用原始初始化函数
              const result = originalInitConnection.apply(this, arguments);
              
              // 如果是Promise对象，添加错误处理
              if (result && typeof result.catch === 'function') {
                return result.catch(err => {
                  console.error('Supabase连接初始化失败，将在5秒后重试:', err);
                  
                  // 显示重试消息
                  const status = document.getElementById('network-status');
                  if (status) {
                    status.textContent = 'Supabase连接失败 - 5秒后重试';
                    status.style.backgroundColor = '#FF9800';
                    status.style.color = 'white';
                    status.style.opacity = '1';
                  }
                  
                  // 5秒后重试
                  return new Promise((resolve) => {
                    setTimeout(() => {
                      console.log('正在重试Supabase连接...');
                      if (status) {
                        status.textContent = '正在重试连接...';
                      }
                      resolve(window.NoteApp.initSupabaseConnection());
                    }, 5000);
                  });
                });
              }
              
              return result;
            } catch (err) {
              console.error('执行Supabase连接初始化时出错:', err);
              throw err;
            }
          };
          
          console.log('已添加Supabase连接重试逻辑');
        }
      }
      
      // 在窗口加载完成后添加重试逻辑
      window.addEventListener('load', function() {
        setTimeout(addRetryLogic, 1000); // 延迟1秒添加重试逻辑，确保应用已初始化
      });
      
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
    console.log(' - 添加了网络状态指示器和连接设置功能');
    console.log(' - 增强了错误处理和自动重试功能');
    
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
- 网络状态指示器和连接设置
- 自动重试连接逻辑

## 连接问题？
如果您遇到连接问题，可以：
1. 点击页面左下角的⚙️设置按钮
2. 检查Supabase连接信息是否正确
3. 如有需要，请咨询管理员获取正确的连接信息
4. 修改后刷新页面

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