const WebSocket = require('ws')
const { exec } = require('child_process')
const os = require('os')
const iconv = require('iconv-lite')

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
    // 转义双引号
    const escapedCommand = command.replace(/"/g, '`"')
    const cmd = `powershell.exe -NoProfile -NonInteractive -Command "& { ${escapedCommand} }"`
    
    exec(cmd, { encoding: 'buffer' }, (error, stdout, stderr) => {
      const output = iconv.decode(stdout, 'cp936')
      const errorOutput = iconv.decode(stderr, 'cp936')
      
      resolve({
        success: !error,
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
console.log('命令执行服务已启动在端口 3000')

// 创建服务发现服务器
const discoveryServer = new WebSocket.Server({ 
  port: 3001,
  host: '0.0.0.0'  // 允许从任何IP连接
})
console.log('服务发现服务已启动在端口 3001')

// 处理命令执行
commandServer.on('connection', (ws) => {
  console.log('新的命令执行客户端连接')
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message)
      console.log('收到命令:', data)
      
      if (data.type === 'command') {
        const result = await executePowerShell(data.command)
        ws.send(JSON.stringify({
          type: 'command_result',
          command: data.command,
          ...result
        }))
      }
    } catch (error) {
      console.error('处理命令失败:', error)
      ws.send(JSON.stringify({
        type: 'command_result',
        success: false,
        error: error.message
      }))
    }
  })
  
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error)
  })
})

// 处理服务发现
discoveryServer.on('connection', (ws) => {
  console.log('新的服务发现客户端连接')
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      console.log('收到发现请求:', data)
      
      if (data.type === 'DISCOVER_NOTE_SERVICE') {
        const addresses = getLocalIPs()
        console.log('发送服务信息:', addresses)
        
        ws.send(JSON.stringify({
          type: 'NOTE_SERVICE_INFO',
          addresses,
          port: 3000
        }))
      }
    } catch (error) {
      console.error('处理发现请求失败:', error)
    }
  })
  
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error)
  })
})

// 错误处理
commandServer.on('error', (error) => {
  console.error('命令服务器错误:', error)
})

discoveryServer.on('error', (error) => {
  console.error('发现服务器错误:', error)
})

// 显示服务器信息
console.log('本机IP地址:', getLocalIPs())
console.log('服务器已启动，等待连接...') 