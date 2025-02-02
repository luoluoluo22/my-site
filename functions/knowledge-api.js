const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const serverless = require('serverless-http');

const app = express();
app.use(cors());
app.use(express.json());

// 初始化Supabase客户端
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gptacdyjxmjzlmgwjmms.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('错误: 未设置SUPABASE_KEY环境变量');
}

let supabaseClient;
try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY || '');
} catch (error) {
  console.error('Supabase客户端初始化失败:', error);
}

// API密钥验证中间件
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['authorization'];
  if (!apiKey || !apiKey.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Invalid Authorization header format',
      message: '无效的Authorization头格式'
    });
  }
  
  const token = apiKey.split(' ')[1];
  if (token !== process.env.KNOWLEDGE_API_KEY) {
    return res.status(401).json({ 
      error: 'Authorization failed',
      message: '认证失败：API密钥不正确'
    });
  }
  
  next();
};

// 检索接口
app.post('/api/retrieval', validateApiKey, async (req, res) => {
  try {
    // 检查Supabase配置
    if (!SUPABASE_KEY) {
      throw new Error('未配置Supabase密钥，请在环境变量中设置SUPABASE_KEY');
    }

    const { query, top_k = 3, score_threshold = 0.5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required',
        message: '查询内容不能为空'
      });
    }
    
    // 从Supabase获取笔记内容
    const { data: notes, error } = await supabaseClient
      .from('notes')
      .select('title, content')
      .order('updated_at', { ascending: false });
      
    if (error) {
      console.error('Supabase查询错误:', error);
      throw new Error('获取笔记数据失败：' + error.message);
    }
    
    // 简单的相关性计算
    const results = notes
      .map(note => {
        const content = `${note.title}\n${note.content}`;
        const score = calculateRelevance(query, content);
        return {
          content: content,
          score: score
        };
      })
      .filter(item => item.score >= score_threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, top_k);
      
    res.json({
      query: query,
      documents: results.map(r => ({
        content: r.content,
        score: r.score
      }))
    });
    
  } catch (error) {
    console.error('API错误:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || '服务器内部错误'
    });
  }
});

// 简单的相关性计算函数
function calculateRelevance(query, content) {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const contentLower = content.toLowerCase();
  
  let score = 0;
  for (const term of queryTerms) {
    if (contentLower.includes(term)) {
      score += 1;
    }
  }
  
  return score / queryTerms.length;
}

// 本地开发时使用
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.KNOWLEDGE_API_PORT || 3002;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`知识库API服务已启动在端口 ${PORT}`);
  });
}

// Netlify Functions导出
module.exports.handler = serverless(app); 