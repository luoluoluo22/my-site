const WebSocket = require('ws')
const { exec } = require('child_process')
const os = require('os')

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

// 创建命令执行服务器
const commandServer = new WebSocket.Server({ port: 3000 })
console.log('命令执行服务已启动在端口 3000')

// 创建服务发现服务器
const discoveryServer = new WebSocket.Server({ port: 3001 })
console.log('服务发现服务已启动在端口 3001')

// 处理命令执行
commandServer.on('connection', (ws) => {
  console.log('新的命令执行客户端连接')
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message)
      
      if (data.type === 'command') {
        exec(data.command, (error, stdout, stderr) => {
          ws.send(JSON.stringify({
            type: 'command_result',
            command: data.command,
            success: !error,
            output: error ? stderr : stdout
          }))
        })
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
})

// 处理服务发现
discoveryServer.on('connection', (ws) => {
  console.log('新的服务发现客户端连接')
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      
      if (data.type === 'DISCOVER_NOTE_SERVICE') {
        ws.send(JSON.stringify({
          type: 'NOTE_SERVICE_INFO',
          addresses: getLocalIPs(),
          port: 3000
        }))
      }
    } catch (error) {
      console.error('处理发现请求失败:', error)
    }
  })
}) 