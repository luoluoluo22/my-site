import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// 常量定义
const SITE_PASSWORD = '123456' // 网站访问密码

// 初始化Supabase客户端
const SUPABASE_URL = 'https://gptacdyjxmjzlmgwjmms.supabase.co'
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_KEY || ''

let supabaseClient
let currentNote = null
let notes = []
let isAuthenticated = false
let isPreviewMode = false
let autoSaveTimeout = null

try {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase key not found. Please check your environment variables.')
  }
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} catch (error) {
  console.error('Supabase 初始化失败:', error)
  // 延迟显示错误消息，确保 DOM 已加载
  setTimeout(() => {
    showMessage('数据库连接失败: ' + error.message, 'error')
  }, 0)
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

// 初始化UI显示状态
function initializeUIState() {
  // 隐藏加载动画
  const loadingElement = document.getElementById('loading')
  if (loadingElement) {
    loadingElement.style.display = 'none'
  }

  // 确保帮助面板初始化时是隐藏的
  const helpPanel = document.getElementById('helpPanel')
  if (helpPanel) {
    helpPanel.classList.add('hidden')
    helpPanel.style.visibility = 'hidden'  // 添加额外的隐藏保证
  }

  // 根据认证状态显示相应面板
  const loginPanel = document.getElementById('loginPanel')
  const mainContent = document.getElementById('mainContent')

  if (isAuthenticated) {
    if (loginPanel) loginPanel.style.visibility = 'hidden'
    if (mainContent) mainContent.style.visibility = 'visible'
  } else {
    if (loginPanel) loginPanel.style.visibility = 'visible'
    if (mainContent) mainContent.style.visibility = 'hidden'
  }
}

// 密码认证
async function authenticate(password) {
  if (!password) {
    return false
  }

  if (password === SITE_PASSWORD) {
    isAuthenticated = true
    localStorage.setItem('isAuthenticated', 'true')
    initializeUIState()
    await loadNotes() // 加载用户的笔记
    return true
  }
  return false
}

// 检查存储的认证状态
async function checkStoredAuth() {
  const storedAuth = localStorage.getItem('isAuthenticated')
  if (storedAuth === 'true') {
    isAuthenticated = true
    initializeUIState()
    await loadNotes()
  }
}

// 退出登录
async function logout() {
  isAuthenticated = false
  localStorage.removeItem('isAuthenticated')
  initializeUIState()
  notes = []
  currentNote = null
  updateNotesList()
  updateEditor()
}

// 加载笔记
async function loadNotes() {
  if (!isAuthenticated) return

  try {
    const { data: notes_data, error } = await supabaseClient
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    
    console.log('加载的笔记:', notes_data) // 添加调试日志
    notes = notes_data
    currentNote = notes[0] || null
    updateNotesList()
    updateEditor()
  } catch (error) {
    console.error('加载笔记失败:', error)
  }
}

// 自动保存功能
function setupAutoSave() {
  const contentElement = document.getElementById('noteContent')
  const titleElement = document.getElementById('noteTitle')

  if (contentElement && titleElement) {
    contentElement.addEventListener('input', () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
      autoSaveTimeout = setTimeout(() => saveNote(true), 2000)
    })

    titleElement.addEventListener('input', () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
      autoSaveTimeout = setTimeout(() => saveNote(true), 2000)
    })
  }
}

// 保存笔记
async function saveNote(isAutoSave = false) {
  if (!isAuthenticated || !currentNote) return

  try {
    const titleElement = document.getElementById('noteTitle')
    const contentElement = document.getElementById('noteContent')

    const title = titleElement.value.trim()
    const content = contentElement.value.trim()
    const now = new Date().toISOString()

    let noteData = {
      title,
      content,
      updated_at: now
    }

    if (currentNote.id) {
      // 更新现有笔记
      const { error } = await supabaseClient
        .from('notes')
        .update(noteData)
        .eq('id', currentNote.id)

      if (error) throw error
    } else {
      // 创建新笔记
      noteData.created_at = now
      const { data, error } = await supabaseClient
        .from('notes')
        .insert([noteData])
        .select()

      if (error) throw error
      if (data && data[0]) {
        currentNote = data[0]
      }
    }

    // 重新加载笔记列表
    await loadNotes()
    
    // 显示保存成功提示（非自动保存时）
    if (!isAutoSave) {
      showMessage('笔记已保存')
    }
  } catch (error) {
    console.error('保存笔记失败:', error)
    showMessage('保存失败: ' + error.message, 'error')
  }
}

// 显示消息提示
function showMessage(message, type = 'success') {
  const messageElement = document.createElement('div')
  messageElement.className = `message ${type}`
  messageElement.textContent = message
  document.body.appendChild(messageElement)

  // 2秒后自动消失
  setTimeout(() => {
    messageElement.classList.add('fade-out')
    setTimeout(() => messageElement.remove(), 300)
  }, 2000)
}

// 创建新笔记
async function createNewNote() {
  if (!isAuthenticated) return

  try {
    const now = new Date().toISOString()
    const newNote = {
      title: '新笔记',
      content: '',
      created_at: now,
      updated_at: now
    }

    const { data, error } = await supabaseClient
      .from('notes')
      .insert([newNote])
      .select()

    if (error) throw error
    if (data && data[0]) {
      currentNote = data[0]
      await loadNotes()
    }
  } catch (error) {
    console.error('创建笔记失败:', error)
  }
}

// 删除笔记
async function deleteNote(noteId) {
  if (!isAuthenticated) return

  // 显示确认弹窗
  if (!confirm('确定要删除这条笔记吗？此操作不可恢复。')) {
    return
  }

  try {
    const { error } = await supabaseClient
      .from('notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error

    showMessage('笔记已删除')
    await loadNotes()
  } catch (error) {
    console.error('删除笔记失败:', error)
    showMessage('删除失败: ' + error.message, 'error')
  }
}

// 切换预览模式
function togglePreview() {
  isPreviewMode = !isPreviewMode
  updatePreview()
  document.body.classList.toggle('preview-mode', isPreviewMode)
}

// 更新预览
function updatePreview() {
  const previewElement = document.getElementById('preview')
  const editArea = document.getElementById('editArea')
  const contentElement = document.getElementById('noteContent')

  if (!previewElement || !editArea || !contentElement) return

  const content = contentElement.value || ''
  previewElement.innerHTML = marked.parse(content)

  // 切换预览/编辑区域的显示状态
  previewElement.classList.toggle('hidden', !isPreviewMode)
  editArea.classList.toggle('hidden', isPreviewMode)
}

// 切换侧边栏
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar')
  if (sidebar) {
    sidebar.classList.toggle('collapsed')
    localStorage.setItem(
      'sidebarCollapsed',
      sidebar.classList.contains('collapsed')
    )
  }
}

// 恢复侧边栏状态
function restoreSidebarState() {
  const sidebar = document.querySelector('.sidebar')
  if (sidebar) {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
    sidebar.classList.toggle('collapsed', isCollapsed)
  }
}

// 搜索笔记
function searchNotes(query) {
  const searchQuery = query.toLowerCase()
  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery) ||
      note.content.toLowerCase().includes(searchQuery)
  )
  updateNotesList(filteredNotes)
}

// 更新笔记列表
function updateNotesList(filteredNotes = null) {
  const notesListElement = document.getElementById('notesList')
  if (!notesListElement) return

  const displayNotes = filteredNotes || notes
  notesListElement.innerHTML = displayNotes
    .map(
      (note) => `
      <div class="note-item ${note.id === currentNote?.id ? 'selected' : ''}">
        <div class="note-content" onclick="window.handleNoteClick(${note.id})">
          <div class="note-title">${note.title || '无标题'}</div>
          <div class="note-date">${new Date(
            note.updated_at
          ).toLocaleDateString()}</div>
        </div>
        <button class="delete-note-btn" onclick="window.deleteNote(${note.id})" title="删除笔记">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    `
    )
    .join('')
}

// 更新编辑器
function updateEditor() {
  console.log('更新编辑器，当前笔记:', currentNote) // 添加调试日志
  
  const titleElement = document.getElementById('noteTitle')
  const contentElement = document.getElementById('noteContent')
  const previewElement = document.getElementById('preview')

  if (!titleElement || !contentElement || !previewElement) {
    console.error('找不到编辑器元素')
    return
  }

  if (currentNote) {
    console.log('设置笔记内容:', {
      title: currentNote.title,
      content: currentNote.content
    })
    titleElement.value = currentNote.title || ''
    contentElement.value = currentNote.content || ''
    updatePreview()
    document.body.classList.add('note-selected')
  } else {
    titleElement.value = ''
    contentElement.value = ''
    previewElement.innerHTML = ''
    document.body.classList.remove('note-selected')
  }
}

// 选择笔记
function selectNote(noteId) {
  console.log('选择笔记:', noteId)
  console.log('当前笔记列表:', notes) // 添加笔记列表日志
  
  // 确保 ID 类型一致（Supabase 返回的是数字类型）
  const searchId = parseInt(noteId, 10)
  const note = notes.find((n) => n.id === searchId)
  
  console.log('找到笔记:', note) // 添加调试日志
  
  if (note) {
    currentNote = { ...note } // 创建笔记对象的副本
    console.log('设置当前笔记:', currentNote)
    updateEditor()
    updateNotesList()
  } else {
    console.error('未找到笔记:', noteId)
  }
}

// 处理笔记点击
function handleNoteClick(noteId) {
  console.log('点击笔记:', noteId) // 添加调试日志
  selectNote(noteId)
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  // 确保帮助面板最先被隐藏
  const helpPanel = document.getElementById('helpPanel')
  if (helpPanel) {
    helpPanel.classList.add('hidden')
    helpPanel.style.visibility = 'hidden'
  }

  checkStoredAuth()
  restoreSidebarState()
  initializeUIState()
  initializeTheme()
  setupThemeListener()
  setupAutoSave()  // 添加自动保存
})

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
  selectNote,  // 导出 selectNote
}

// 将必要的函数绑定到 window 对象
window.deleteNote = deleteNote
window.authenticate = authenticate
window.logout = logout
window.handleNoteClick = handleNoteClick  // 添加点击处理函数到全局
