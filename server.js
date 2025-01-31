const WebSocket = require('ws')
const { exec } = require('child_process')
const http = require('http')

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('WebSocket server is running')
})

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server })

// 处理 WebSocket 连接
wss.on('connection', (ws) => {
  console.log('新的客户端连接')

  // 处理消息
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message)
      
      if (data.type === 'command') {
        // 执行命令
        exec(data.command, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
          const response = {
            type: 'command_result',
            command: data.command,
            success: !error,
            output: stdout || stderr,
            error: error ? error.message : null
          }
          
          ws.send(JSON.stringify(response))
        })
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }))
    }
  })

  // 处理关闭连接
  ws.on('close', () => {
    console.log('客户端断开连接')
  })
})

// 启动服务器
const PORT = 3000
server.listen(PORT, () => {
  console.log(`WebSocket 服务器运行在 ws://localhost:${PORT}`)
}) 