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
// 创建新笔记
async function createNewNote() {
  if (!isAuthenticated) return

  try {
    const { data, error } = await supabaseClient
      .from('notes')
      .insert([
        {
          title: '新笔记',
          content: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) throw error

    const newNote = data[0]
    notes.unshift(newNote)
    currentNote = newNote
    updateNotesList()
    updateEditor()
  } catch (error) {
    console.error('创建笔记失败:', error)
  }
}

// 保存笔记
async function saveNote(noteId, title, content) {
  if (!isAuthenticated) return

  try {
    const { error } = await supabaseClient
      .from('notes')
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)

    if (error) throw error

    const noteIndex = notes.findIndex((note) => note.id === noteId)
    if (noteIndex > -1) {
      notes[noteIndex] = { ...notes[noteIndex], title, content }
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
    const { error } = await supabaseClient
      .from('notes')
      .delete()
      .eq('id', noteId)

    if (error) throw error

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
  if (!previewElement || !currentNote) return

  const content = currentNote.content || ''
  // 这里可以添加Markdown渲染逻辑
  previewElement.innerHTML = content
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
    const { data, error } = await supabaseClient
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    notes = data
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
