const WebSocket = require('ws')
const { exec } = require('child_process')
const os = require('os')
const iconv = require('iconv-lite')

// 日志函数
function log(tag, message, ...args) {
  console.log(`[${tag}] ${message}`, ...args)
}

function logError(tag, message, ...args) {
  console.error(`[${tag}] ${message}`, ...args)
}

// 获取本机IP地址
function getLocalIPs() {
  const interfaces = os.networkInterfaces()
  const addresses = []
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // 跳过内部IP和非IPv4地址
      if (interface.internal || interface.family !== 'IPv4') continue
      addresses.push(interface.address)
    }
  }
  
  return addresses
}

// 执行PowerShell命令
function executePowerShell(command) {
  return new Promise((resolve, reject) => {
    // 记录完整命令
    log('命令执行', '执行命令:', command)
    
    // 处理命令：移除注释行，转义双引号
    const cleanCommand = command
      .split('\n')
      .filter(line => !line.trim().startsWith('#'))
      .join('\n')
      .replace(/"/g, '`"')
      .trim()
    
    if (!cleanCommand) {
      resolve({
        success: true,
        output: '命令为空或仅包含注释'
      })
      return
    }
    
    const cmd = `powershell.exe -NoProfile -NonInteractive -Command "${cleanCommand}"`
    
    exec(cmd, { encoding: 'buffer' }, (err, stdout, stderr) => {
      const output = iconv.decode(stdout, 'cp936')
      const errorOutput = iconv.decode(stderr, 'cp936')
      
      if (output || errorOutput) {
        log('命令执行', '命令输出:', output || errorOutput)
      }
      
      if (err) {
        logError('命令执行', '执行错误:', err)
      }
      
      resolve({
        success: !err,
        output: output || errorOutput
      })
    })
  })
}

// 创建命令执行服务器
const commandServer = new WebSocket.Server({ 
  port: 3000,
  host: '0.0.0.0'  // 允许从任何IP连接
})

// 创建服务发现服务器
const discoveryServer = new WebSocket.Server({ 
  port: 3001,
  host: '0.0.0.0'  // 允许从任何IP连接
})

// 处理命令执行
commandServer.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress
  log('WebSocket', '新的命令执行连接:', clientIP)
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message)
      log('WebSocket', '收到命令:', data.command)
      
      if (data.type === 'command') {
        const result = await executePowerShell(data.command)
        log('WebSocket', '发送命令结果:', result.success ? '成功' : '失败')
        ws.send(JSON.stringify({
          type: 'command_result',
          command: data.command,
          ...result
        }))
      }
    } catch (err) {
      logError('WebSocket', '处理命令失败:', err)
      ws.send(JSON.stringify({
        type: 'command_result',
        success: false,
        error: err.message
      }))
    }
  })
  
  ws.on('close', () => {
    log('WebSocket', '命令执行连接已关闭:', clientIP)
  })
  
  ws.on('error', (err) => {
    logError('WebSocket', '连接错误:', err)
  })
})

// 处理服务发现
discoveryServer.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress
  log('发现服务', '新的服务发现连接:', clientIP)
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      log('发现服务', '收到发现请求:', data)
      
      if (data.type === 'DISCOVER_NOTE_SERVICE') {
        const addresses = getLocalIPs()
        log('发现服务', '发送服务信息:', addresses)
        
        ws.send(JSON.stringify({
          type: 'NOTE_SERVICE_INFO',
          addresses,
          port: 3000
        }))
      }
    } catch (err) {
      logError('发现服务', '处理发现请求失败:', err)
    }
  })
  
  ws.on('close', () => {
    log('发现服务', '服务发现连接已关闭:', clientIP)
  })
  
  ws.on('error', (err) => {
    logError('发现服务', '连接错误:', err)
  })
})

// 错误处理
commandServer.on('error', (err) => {
  logError('服务器', '命令服务器错误:', err)
})

discoveryServer.on('error', (err) => {
  logError('服务器', '发现服务器错误:', err)
})

// 显示服务器信息
const addresses = getLocalIPs()
log('服务器', '命令执行服务已启动在端口 3000')
log('服务器', '服务发现服务已启动在端口 3001')
log('服务器', '本机IP地址:', addresses)
log('服务器', '服务器已启动，等待连接...') 