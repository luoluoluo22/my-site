const WebSocket = require('ws')
const { exec } = require('child_process')
const os = require('os')
const dgram = require('dgram')

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

// 创建UDP服务用于服务发现
const discoverySocket = dgram.createSocket('udp4')

discoverySocket.on('message', (msg, rinfo) => {
  try {
    const data = JSON.parse(msg.toString())
    if (data.type === 'DISCOVER_NOTE_SERVICE') {
      // 响应服务发现请求
      const response = JSON.stringify({
        type: 'NOTE_SERVICE_INFO',
        port: 3000,
        addresses: getLocalIPs()
      })
      discoverySocket.send(response, rinfo.port, rinfo.address)
    }
  } catch (error) {
    console.error('处理发现请求失败:', error)
  }
})

discoverySocket.bind(3001, () => {
  discoverySocket.setBroadcast(true)
  console.log('服务发现已启动在端口 3001')
})

// WebSocket服务器
const wss = new WebSocket.Server({ port: 3000 })

wss.on('connection', (ws) => {
  console.log('新的客户端连接')
  
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
      console.error('处理消息失败:', error)
      ws.send(JSON.stringify({
        type: 'command_result',
        success: false,
        error: error.message
      }))
    }
  })
})

console.log('WebSocket服务器已启动在端口 3000') 