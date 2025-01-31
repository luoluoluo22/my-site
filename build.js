const fs = require('fs')
const path = require('path')

// 读取环境变量
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gptacdyjxmjzlmgwjmms.supabase.co'

// 检查环境变量
if (!SUPABASE_KEY) {
  console.error('错误: 未找到 SUPABASE_KEY 环境变量')
  console.log('环境变量:', process.env)
  process.exit(1)
}

console.log('构建环境变量:', {
  SUPABASE_KEY: SUPABASE_KEY ? '已设置' : '未设置',
  SUPABASE_URL,
  NODE_ENV: process.env.NODE_ENV
})

// 读取 index.html
const indexPath = path.join(__dirname, 'index.html')
let content = fs.readFileSync(indexPath, 'utf8')

// 替换环境变量
content = content.replace(
  /SUPABASE_URL: '.*?'/,
  `SUPABASE_URL: '${SUPABASE_URL}'`
)

content = content.replace(
  /SUPABASE_KEY: '.*?'/,
  `SUPABASE_KEY: '${SUPABASE_KEY}'`
)

// 写回文件
fs.writeFileSync(indexPath, content)

console.log('构建完成！')
