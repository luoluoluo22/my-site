import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const indexPath = resolve(__dirname, 'index.html');
let indexContent = readFileSync(indexPath, 'utf8');

// 替换环境变量
indexContent = indexContent.replace(
  '<%=process.env.VITE_SUPABASE_KEY%>',
  process.env.VITE_SUPABASE_KEY || ''
);

// 写回文件
writeFileSync(indexPath, indexContent);
