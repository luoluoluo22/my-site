const fs = require('fs')
const path = require('path')

// 读取环境变量
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || ''

// 读取 index.html
const indexPath = path.join(__dirname, 'index.html')
let content = fs.readFileSync(indexPath, 'utf8')

// 替换 Supabase key
content = content.replace(
  /SUPABASE_KEY: '.*?'/,
  `SUPABASE_KEY: '${SUPABASE_KEY}'`
)

// 写回文件
fs.writeFileSync(indexPath, content)

console.log('构建完成！')
