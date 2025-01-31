import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// 初始化 Supabase 客户端
const supabaseConfig = window.ENV || {}
const SUPABASE_URL = 'https://gptacdyjxmjzlmgwjmms.supabase.co'
const SUPABASE_ANON_KEY = supabaseConfig.SUPABASE_KEY || ''

let supabaseClient
let currentNote = null
let notes = []
let isAuthenticated = false
let isPreviewMode = false
let autoSaveTimeout = null

try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} catch (error) {
  console.error('Supabase 初始化失败:', error)
}

// 主题切换功能
function toggleTheme() {
  const html = document.documentElement
  const currentTheme = html.getAttribute('data-theme')
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'

  html.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
}

// 初始化主题
function initializeTheme() {
  const html = document.documentElement
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  const theme = savedTheme || (prefersDark ? 'dark' : 'light')
  html.setAttribute('data-theme', theme)
}

// 添加系统主题变化监听
function setupThemeListener() {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
        document.documentElement.setAttribute(
          'data-theme',
          e.matches ? 'dark' : 'light'
        )
      }
    })
}
// 用户认证
async function authenticate() {
  try {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.signInWithOAuth({
      provider: 'github',
    })

    if (error) {
      console.error('认证错误:', error.message)
      return false
    }

    if (user) {
      isAuthenticated = true
      localStorage.setItem('isAuthenticated', 'true')
      document.body.classList.add('authenticated')
      await loadNotes() // 加载用户的笔记
      return true
    }
  } catch (error) {
    console.error('认证过程发生错误:', error)
    return false
  }
  return false
}

// 检查存储的认证状态
async function checkStoredAuth() {
  const storedAuth = localStorage.getItem('isAuthenticated')
  if (storedAuth === 'true') {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser()
    if (user && !error) {
      isAuthenticated = true
      document.body.classList.add('authenticated')
      await loadNotes()
    } else {
      localStorage.removeItem('isAuthenticated')
    }
  }
}

// 退出登录
async function logout() {
  try {
    await supabaseClient.auth.signOut()
    isAuthenticated = false
    localStorage.removeItem('isAuthenticated')
    document.body.classList.remove('authenticated')
    notes = []
    currentNote = null
    updateNotesList()
    updateEditor()
  } catch (error) {
    console.error('退出登录失败:', error)
  }
}

// ... (保持其他现有代码不变) ...

// 导出函数
export {
  saveNote,
  deleteNote,
  createNewNote,
  updatePreview,
  authenticate,
  logout,
  togglePreview,
  toggleSidebar,
  searchNotes,
  toggleTheme,
}

// 将函数绑定到window对象
window.selectNote = selectNote
window.deleteNote = deleteNote
window.authenticate = authenticate
window.logout = logout

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  checkStoredAuth()
  restoreSidebarState()
  initializeTheme()
  setupThemeListener()
})
