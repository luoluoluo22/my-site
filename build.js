const fs = require('fs')
const path = require('path')

// 读取环境变量
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gptacdyjxmjzlmgwjmms.supabase.co'

console.log('构建环境变量:', {
  SUPABASE_KEY: SUPABASE_KEY ? '已设置' : '未设置',
  SUPABASE_URL
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
