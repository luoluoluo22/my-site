import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const indexPath = resolve(__dirname, 'index.html')

// 获取环境变量（优先使用process.env）
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || ''

let indexContent = readFileSync(indexPath, 'utf8')

// 替换环境变量
indexContent = indexContent.replace(
  "SUPABASE_KEY: '<%=process.env.VITE_SUPABASE_KEY%>'",
  `SUPABASE_KEY: '${SUPABASE_KEY}'`
)

// 写回文件
writeFileSync(indexPath, indexContent)
