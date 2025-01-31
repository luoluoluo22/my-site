import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// 常量定义
const SITE_PASSWORD = '123456' // 网站访问密码

// 初始化Supabase客户端
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

// 创建新笔记
async function createNewNote() {
  if (!isAuthenticated) return

  try {
    const newNote = {
      id: Date.now().toString(),
      title: '新笔记',
      content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    notes.unshift(newNote)
    currentNote = newNote
    updateNotesList()
    updateEditor()
  } catch (error) {
    console.error('创建笔记失败:', error)
  }
}

// 保存笔记
async function saveNote() {
  if (!isAuthenticated || !currentNote) return

  try {
    const titleElement = document.getElementById('noteTitle')
    const contentElement = document.getElementById('noteContent')

    const title = titleElement.value.trim()
    const content = contentElement.value.trim()

    const noteIndex = notes.findIndex((note) => note.id === currentNote.id)
    if (noteIndex > -1) {
      notes[noteIndex] = {
        ...notes[noteIndex],
        title,
        content,
        updated_at: new Date().toISOString(),
      }
      updateNotesList()
    }
  } catch (error) {
    console.error('保存笔记失败:', error)
  }
}

// 删除笔记
async function deleteNote(noteId) {
  if (!isAuthenticated) return

  try {
    notes = notes.filter((note) => note.id !== noteId)
    currentNote = notes[0] || null
    updateNotesList()
    updateEditor()
  } catch (error) {
    console.error('删除笔记失败:', error)
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
      <div class="note-item ${note.id === currentNote?.id ? 'selected' : ''}" 
           onclick="selectNote('${note.id}')">
        <div class="note-title">${note.title || '无标题'}</div>
        <div class="note-date">${new Date(
          note.updated_at
        ).toLocaleDateString()}</div>
      </div>
    `
    )
    .join('')
}

// 更新编辑器
function updateEditor() {
  const titleElement = document.getElementById('noteTitle')
  const contentElement = document.getElementById('noteContent')
  const previewElement = document.getElementById('preview')

  if (currentNote) {
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

// 加载笔记
async function loadNotes() {
  if (!isAuthenticated) return

  try {
    // 这里可以添加从localStorage加载笔记的逻辑
    const storedNotes = localStorage.getItem('notes')
    notes = storedNotes ? JSON.parse(storedNotes) : []
    currentNote = notes[0] || null
    updateNotesList()
    updateEditor()
  } catch (error) {
    console.error('加载笔记失败:', error)
  }
}

// 选择笔记
function selectNote(noteId) {
  const note = notes.find((n) => n.id === noteId)
  if (note) {
    currentNote = note
    updateEditor()
    updateNotesList()
  }
}

// 自动保存到localStorage
function saveToLocalStorage() {
  if (notes.length > 0) {
    localStorage.setItem('notes', JSON.stringify(notes))
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  // 确保帮助面板最先被隐藏
  const helpPanel = document.getElementById('helpPanel')
  if (helpPanel) {
    helpPanel.classList.add('hidden')
    helpPanel.style.visibility = 'hidden'  // 添加额外的隐藏保证
  }

  checkStoredAuth()
  restoreSidebarState()
  initializeUIState()
  initializeTheme()
  setupThemeListener()
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
}

// 将函数绑定到window对象
window.selectNote = selectNote
window.deleteNote = deleteNote
window.authenticate = authenticate
window.logout = logout
