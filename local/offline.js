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
      
      // 全局变量
      let connectionWizardShown = false;
      
      // 网页加载完成后初始化
      window.addEventListener('DOMContentLoaded', function() {
        console.log("===== 离线网页模式已启动 =====");
        console.log("这个页面的UI资源可以离线使用，数据将实时从云端获取");
        
        // 添加连接向导按钮
        addConnectionButton();
        
        // 监听网络状态变化
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);
        
        // 初始检查网络状态
        updateNetworkStatus();
        
        // 添加离线提示
        setTimeout(function() {
          if (!localStorage.getItem('hasShownOfflineIntro')) {
            alert("离线网页笔记已准备就绪！\\n\\n - 网页界面可离线加载\\n - 数据将实时从云端获取\\n - 如需帮助请点击左下角向导按钮");
            localStorage.setItem('hasShownOfflineIntro', 'true');
          }
          
          // 检查是否有连接信息，如果没有则自动显示设置向导
          checkAndShowConnectionWizard();
        }, 1000);
      });
      
      // 添加连接向导按钮
      function addConnectionButton() {
        // 添加设置按钮
        const connectionBtn = document.createElement('button');
        connectionBtn.id = 'connection-wizard-btn';
        connectionBtn.innerText = '🔌 连接向导';
        connectionBtn.title = '打开Supabase连接向导';
        connectionBtn.style.position = 'fixed';
        connectionBtn.style.bottom = '10px';
        connectionBtn.style.left = '10px';
        connectionBtn.style.padding = '8px 12px';
        connectionBtn.style.fontSize = '14px';
        connectionBtn.style.borderRadius = '4px';
        connectionBtn.style.backgroundColor = '#4CAF50';
        connectionBtn.style.color = 'white';
        connectionBtn.style.border = 'none';
        connectionBtn.style.cursor = 'pointer';
        connectionBtn.style.zIndex = '9999';
        
        connectionBtn.addEventListener('click', showConnectionWizard);
        document.body.appendChild(connectionBtn);
      }
      
      // 检查并显示连接向导
      function checkAndShowConnectionWizard() {
        // 如果没有有效的连接信息且向导尚未显示，则显示连接向导
        const hasUrl = localStorage.getItem('supabaseUrl');
        const hasKey = localStorage.getItem('supabaseKey');
        
        if ((!hasUrl || !hasKey) && !connectionWizardShown) {
          connectionWizardShown = true;
          showConnectionWizard();
        }
      }
      
      // 显示连接向导
      function showConnectionWizard() {
        // 创建向导背景
        const wizardOverlay = document.createElement('div');
        wizardOverlay.id = 'connection-wizard-overlay';
        wizardOverlay.style.position = 'fixed';
        wizardOverlay.style.top = '0';
        wizardOverlay.style.left = '0';
        wizardOverlay.style.width = '100%';
        wizardOverlay.style.height = '100%';
        wizardOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
        wizardOverlay.style.zIndex = '10000';
        wizardOverlay.style.display = 'flex';
        wizardOverlay.style.justifyContent = 'center';
        wizardOverlay.style.alignItems = 'center';
        
        // 创建向导面板
        const wizardPanel = document.createElement('div');
        wizardPanel.style.width = '500px';
        wizardPanel.style.maxWidth = '90%';
        wizardPanel.style.backgroundColor = 'white';
        wizardPanel.style.borderRadius = '8px';
        wizardPanel.style.padding = '20px';
        wizardPanel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        
        // 获取当前的Supabase配置
        const currentUrl = localStorage.getItem('supabaseUrl') || DEFAULT_SUPABASE_URL;
        const currentKey = localStorage.getItem('supabaseKey') || DEFAULT_SUPABASE_KEY;
        
        // 创建向导内容
        wizardPanel.innerHTML = \`
          <div style="text-align:center;margin-bottom:20px;">
            <h2 style="margin-top:0;color:#333;">笔记连接向导</h2>
            <p style="color:#666;">请设置Supabase连接信息以访问您的笔记数据</p>
          </div>
          
          <div style="margin-bottom:15px;">
            <label for="wizard-url" style="display:block;margin-bottom:5px;font-weight:bold;">Supabase URL:</label>
            <input type="text" id="wizard-url" value="\${currentUrl}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
          </div>
          
          <div style="margin-bottom:20px;">
            <label for="wizard-key" style="display:block;margin-bottom:5px;font-weight:bold;">Supabase Key:</label>
            <input type="text" id="wizard-key" value="\${currentKey}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
          </div>
          
          <div style="display:flex;justify-content:space-between;margin-bottom:15px;">
            <div>
              <button id="wizard-test" style="padding:10px 15px;background-color:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer;">测试连接</button>
              <span id="test-result" style="margin-left:10px;font-size:14px;"></span>
            </div>
            <button id="wizard-reset" style="padding:10px 15px;background-color:#f0f0f0;border:none;border-radius:4px;cursor:pointer;">重置</button>
          </div>
          
          <div style="margin-bottom:15px;">
            <div id="connection-options" style="display:flex;flex-direction:column;gap:10px;">
              <button id="option-default" style="padding:10px;text-align:left;background-color:#f9f9f9;border:1px solid #ddd;border-radius:4px;cursor:pointer;">
                <strong>使用默认连接</strong><br>
                <span style="font-size:13px;color:#666;">使用预设的Supabase连接信息</span>
              </button>
              <button id="option-custom" style="padding:10px;text-align:left;background-color:#f9f9f9;border:1px solid #ddd;border-radius:4px;cursor:pointer;">
                <strong>使用自定义连接</strong><br>
                <span style="font-size:13px;color:#666;">使用自己的Supabase项目信息</span>
              </button>
              <button id="option-offline" style="padding:10px;text-align:left;background-color:#f9f9f9;border:1px solid #ddd;border-radius:4px;cursor:pointer;">
                <strong>仅使用本地功能</strong><br>
                <span style="font-size:13px;color:#666;">不连接云端，仅使用浏览器本地存储</span>
              </button>
            </div>
          </div>
          
          <div style="text-align:center;margin-top:15px;">
            <button id="wizard-save" style="padding:10px 20px;background-color:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">保存并连接</button>
            <button id="wizard-close" style="padding:10px 20px;margin-left:10px;background-color:#f0f0f0;border:none;border-radius:4px;cursor:pointer;">稍后设置</button>
          </div>
          
          <div style="margin-top:15px;padding-top:15px;border-top:1px solid #eee;font-size:13px;color:#666;">
            <p>提示：设置保存后需要刷新页面才能生效。如有问题请联系管理员。</p>
          </div>
        \`;
        
        // 添加向导到页面
        wizardOverlay.appendChild(wizardPanel);
        document.body.appendChild(wizardOverlay);
        
        // 添加事件处理
        document.getElementById('wizard-test').addEventListener('click', function() {
          const testUrl = document.getElementById('wizard-url').value.trim();
          const testKey = document.getElementById('wizard-key').value.trim();
          const resultSpan = document.getElementById('test-result');
          
          resultSpan.textContent = '正在测试...';
          resultSpan.style.color = '#2196F3';
          
          // 执行测试连接
          testSupabaseConnection(testUrl, testKey)
            .then(isValid => {
              if (isValid) {
                resultSpan.textContent = '连接成功!';
                resultSpan.style.color = '#4CAF50';
              } else {
                resultSpan.textContent = '连接失败';
                resultSpan.style.color = '#F44336';
              }
            })
            .catch(error => {
              resultSpan.textContent = '测试出错: ' + error.message;
              resultSpan.style.color = '#F44336';
            });
        });
        
        document.getElementById('wizard-reset').addEventListener('click', function() {
          document.getElementById('wizard-url').value = DEFAULT_SUPABASE_URL;
          document.getElementById('wizard-key').value = DEFAULT_SUPABASE_KEY;
        });
        
        document.getElementById('option-default').addEventListener('click', function() {
          document.getElementById('wizard-url').value = DEFAULT_SUPABASE_URL;
          document.getElementById('wizard-key').value = DEFAULT_SUPABASE_KEY;
        });
        
        document.getElementById('option-custom').addEventListener('click', function() {
          if (document.getElementById('wizard-url').value === DEFAULT_SUPABASE_URL) {
            document.getElementById('wizard-url').value = '';
          }
          if (document.getElementById('wizard-key').value === DEFAULT_SUPABASE_KEY) {
            document.getElementById('wizard-key').value = '';
          }
          document.getElementById('wizard-url').focus();
        });
        
        document.getElementById('option-offline').addEventListener('click', function() {
          document.getElementById('wizard-url').value = '';
          document.getElementById('wizard-key').value = '';
          
          const resultSpan = document.getElementById('test-result');
          resultSpan.textContent = '已选择仅本地模式';
          resultSpan.style.color = '#FF9800';
        });
        
        document.getElementById('wizard-save').addEventListener('click', function() {
          const newUrl = document.getElementById('wizard-url').value.trim();
          const newKey = document.getElementById('wizard-key').value.trim();
          
          // 保存到localStorage
          if (newUrl && newKey) {
            localStorage.setItem('supabaseUrl', newUrl);
            localStorage.setItem('supabaseKey', newKey);
            localStorage.setItem('connectionMode', 'cloud');
          } else {
            // 如果URL和Key为空，则设置为本地模式
            localStorage.removeItem('supabaseUrl');
            localStorage.removeItem('supabaseKey');
            localStorage.setItem('connectionMode', 'local');
          }
          
          // 显示成功消息并刷新页面
          alert('设置已保存，页面将刷新以应用新的连接设置');
          wizardOverlay.remove();
          location.reload();
        });
        
        document.getElementById('wizard-close').addEventListener('click', function() {
          wizardOverlay.remove();
        });
      }
      
      // 测试Supabase连接
      async function testSupabaseConnection(url, key) {
        if (!url || !key) return false;
        
        try {
          const response = await fetch(\`\${url}/rest/v1/notes?select=count\`, {
            method: 'GET',
            headers: {
              'apikey': key,
              'Authorization': \`Bearer \${key}\`
            }
          });
          
          return response.ok;
        } catch (error) {
          console.error('测试连接失败:', error);
          return false;
        }
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
            if (url && typeof url === 'string' && url.includes('supabase')) {
              // 显示友好的错误提示
              const status = document.getElementById('network-status');
              if (status) {
                status.textContent = '连接问题 - 点击设置';
                status.style.backgroundColor = '#F44336';
                status.style.color = 'white';
                status.style.opacity = '1';
                status.style.cursor = 'pointer';
                
                // 添加点击打开设置面板的功能
                status.onclick = function() {
                  showConnectionWizard();
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
      
      // 修复初始化问题
      function fixInitializationIssues() {
        // 等待页面上的元素加载完成
        const checkInterval = setInterval(function() {
          // 检查是否有导入按钮
          const importBtn = document.querySelector('button[data-action="import"]');
          if (importBtn) {
            clearInterval(checkInterval);
            
            // 修改导入按钮行为
            const originalClick = importBtn.onclick;
            importBtn.onclick = function(e) {
              // 检查是否有Supabase配置
              const hasUrl = localStorage.getItem('supabaseUrl');
              const hasKey = localStorage.getItem('supabaseKey');
              
              if (!hasUrl || !hasKey) {
                e.preventDefault();
                e.stopPropagation();
                showConnectionWizard();
                return false;
              }
              
              // 如果有配置，则使用原始点击处理
              if (originalClick) {
                return originalClick.call(this, e);
              }
            };
            
            console.log('已修复导入按钮行为');
          }
          
          // 如果5秒后仍未找到，则停止检查
        }, 200);
        
        setTimeout(function() {
          clearInterval(checkInterval);
        }, 5000);
      }
      
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
      
      // 修复导入的错误处理
      function fixImportErrorHandling() {
        // 如果存在NoteApp对象，修改其导入函数
        if (window.NoteApp && typeof window.NoteApp.importOnlineNotes === 'function') {
          const originalImport = window.NoteApp.importOnlineNotes;
          
          window.NoteApp.importOnlineNotes = function() {
            try {
              // 检查是否有连接信息
              const hasUrl = localStorage.getItem('supabaseUrl');
              const hasKey = localStorage.getItem('supabaseKey');
              
              if (!hasUrl || !hasKey) {
                console.warn('未找到Supabase连接信息，显示连接向导');
                showConnectionWizard();
                return Promise.reject(new Error('请先设置连接信息'));
              }
              
              return originalImport.apply(this, arguments).catch(err => {
                console.error('导入失败:', err);
                
                // 显示连接向导
                setTimeout(() => {
                  showConnectionWizard();
                }, 500);
                
                throw err;
              });
            } catch (err) {
              console.error('执行导入函数时出错:', err);
              setTimeout(() => {
                showConnectionWizard();
              }, 500);
              return Promise.reject(err);
            }
          };
          
          console.log('已修复导入错误处理');
        }
      }
      
      // 在窗口加载完成后添加各种修复
      window.addEventListener('load', function() {
        setTimeout(function() {
          // 添加重试逻辑
          addRetryLogic();
          
          // 修复初始化问题
          fixInitializationIssues();
          
          // 修复导入错误处理
          fixImportErrorHandling();
          
          console.log('已应用所有修复和增强功能');
        }, 1000); // 延迟1秒添加修复逻辑，确保应用已初始化
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
    console.log(' - 添加了连接向导和网络状态指示器');
    console.log(' - 增强了错误处理和自动重试功能');
    console.log(' - 提供了更好的初始化体验');
    
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
3. 第一次使用时会显示连接向导，按提示完成设置

## 主要功能
- 网页界面离线加载，加快访问速度
- 数据实时从云端获取
- 响应式设计，适配各种设备
- 主题切换功能
- 支持Markdown格式编辑预览
- 网络状态指示器和连接向导
- 自动重试连接逻辑

## 连接问题？
如果您遇到连接问题，可以：
1. 点击页面左下角的"🔌 连接向导"按钮
2. 选择适合您的连接方式：
   - 使用默认连接
   - 使用自定义连接（需管理员提供信息）
   - 仅使用本地功能（不需网络）
3. 根据提示设置并保存

## 离线说明
- 此版本仅将网页界面资源离线化
- 数据部分仍需要网络连接（除非选择仅本地模式）
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