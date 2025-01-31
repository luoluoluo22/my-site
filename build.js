import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const indexPath = resolve(__dirname, 'index.html')
const envPath = resolve(__dirname, '.env')

// 读取.env文件
function parseEnv(path) {
  const envContent = readFileSync(path, 'utf8')
  const env = {}
  envContent.split('\n').forEach((line) => {
    const [key, ...value] = line.split('=')
    if (key && value) {
      env[key.trim()] = value.join('=').trim()
    }
  })
  return env
}

// 读取环境变量
const env = parseEnv(envPath)
let indexContent = readFileSync(indexPath, 'utf8')

// 替换环境变量
indexContent = indexContent.replace(
  "SUPABASE_KEY: '<%=process.env.VITE_SUPABASE_KEY%>'",
  `SUPABASE_KEY: '${env.VITE_SUPABASE_KEY || ''}'`
)

// 写回文件
writeFileSync(indexPath, indexContent)
