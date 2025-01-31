const fs = require('fs')
const path = require('path')

console.log('开始构建...')
console.log('当前工作目录:', process.cwd())
console.log('Node.js 版本:', process.version)

// 读取环境变量
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || ''
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gptacdyjxmjzlmgwjmms.supabase.co'

// 检查环境变量
console.log('环境变量检查:')
console.log('- VITE_SUPABASE_KEY:', SUPABASE_KEY ? '已设置' : '未设置')
console.log('- VITE_SUPABASE_URL:', SUPABASE_URL)
console.log('- NODE_ENV:', process.env.NODE_ENV)

if (!SUPABASE_KEY) {
  console.error('\n错误: 未找到 SUPABASE_KEY 环境变量')
  console.error('请确保在 Netlify 的环境变量设置中添加了 VITE_SUPABASE_KEY')
  console.error('当前可用的环境变量:', Object.keys(process.env).join(', '))
  process.exit(1)
}

// 读取 index.html
console.log('\n读取 index.html...')
const indexPath = path.join(__dirname, 'index.html')

try {
  let content = fs.readFileSync(indexPath, 'utf8')
  console.log('成功读取 index.html')

  // 替换环境变量
  console.log('替换环境变量...')
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
  console.log('成功写入 index.html')
  console.log('\n构建完成！')
} catch (error) {
  console.error('\n构建失败:', error)
  process.exit(1)
}
