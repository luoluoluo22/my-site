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

// 检查存储的身份验证状态
async function checkStoredAuth() {
  const storedPassword = localStorage.getItem('noteAppPassword')
  if (storedPassword) {
    await authenticate(storedPassword, false)
  } else {
    showLoginPanel()
  }
  document.getElementById('loading').style.display = 'none'
}

// 显示登录面板
function showLoginPanel() {
  document.getElementById('loginPanel').style.visibility = 'visible'
  document.getElementById('mainContent').style.visibility = 'hidden'
}

// 显示主内容
function showMainContent() {
  document.getElementById('loginPanel').style.visibility = 'hidden'
  document.getElementById('mainContent').style.visibility = 'visible'
}

// 身份验证
async function authenticate(password, shouldStore = true) {
  try {
    const { data, error } = await supabaseClient
      .from('auth_settings')
      .select('password')
      .single()

    if (error) throw error

    if (data.password === password) {
      isAuthenticated = true
      if (shouldStore) {
        localStorage.setItem('noteAppPassword', password)
      }
      showMainContent()
      await fetchNotes()
      handleUrlRoute()
      setupEditorKeyBindings()
    } else {
      showLoginPanel()
      if (shouldStore) {
        alert('密码错误')
      }
    }
  } catch (error) {
    console.error('Authentication error:', error)
    showLoginPanel()
    if (shouldStore) {
      alert('验证失败')
    }
  }
}

// 退出登录
function logout() {
  isAuthenticated = false
  localStorage.removeItem('noteAppPassword')
  showLoginPanel()
  currentNote = null
  notes = []
}

// 设置编辑器快捷键
function setupEditorKeyBindings() {
  const editor = document.getElementById('noteContent')

  editor.addEventListener('keydown', (e) => {
    // 如果按下了Ctrl键（Windows）或Command键（Mac）
    if (e.ctrlKey || e.metaKey) {
      const start = editor.selectionStart
      const end = editor.selectionEnd
      const selectedText = editor.value.substring(start, end)

      switch (e.key.toLowerCase()) {
        case 'b': // 加粗
          e.preventDefault()
          insertMarkdown('**', '**', selectedText)
          break
        case 'i': // 斜体
          e.preventDefault()
          insertMarkdown('*', '*', selectedText)
          break
        case 'k': // 链接
          e.preventDefault()
          if (selectedText) {
            insertMarkdown('[', '](url)', selectedText)
          } else {
            insertMarkdown('[', '](url)', 'link text')
          }
          break
        case 'h': // 高亮
          e.preventDefault()
          insertMarkdown('==', '==', selectedText)
          break
        case 's': // 保存
          e.preventDefault()
          saveNote()
          break
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      insertText('  ') // 插入两个空格
    }
  })

  // 设置自动保存
  editor.addEventListener('input', () => {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(autoSave, 2000) // 2秒后自动保存
  })

  document.getElementById('noteTitle').addEventListener('input', () => {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(autoSave, 2000)
  })
}

// 插入Markdown标记
function insertMarkdown(prefix, suffix, selected) {
  const editor = document.getElementById('noteContent')
  const start = editor.selectionStart
  const end = editor.selectionEnd

  const before = editor.value.substring(0, start)
  const after = editor.value.substring(end)

  editor.value = before + prefix + (selected || '') + suffix + after

  const newCursorPos = selected
    ? start + prefix.length + selected.length + suffix.length
    : start + prefix.length

  editor.focus()
  editor.selectionStart = newCursorPos
  editor.selectionEnd = newCursorPos

  updatePreview()
}

// 插入文本
function insertText(text) {
  const editor = document.getElementById('noteContent')
  const start = editor.selectionStart

  editor.value =
    editor.value.substring(0, start) + text + editor.value.substring(start)
  editor.selectionStart = editor.selectionEnd = start + text.length

  updatePreview()
}

// 自动保存
async function autoSave() {
  if (!isAuthenticated || !document.getElementById('noteTitle').value) return

  const saveBtn = document.getElementById('saveButton')
  const originalText = saveBtn.textContent

  try {
    await saveNote(true) // true表示这是自动保存
    saveBtn.textContent = '已自动保存'
    setTimeout(() => (saveBtn.textContent = originalText), 2000)
  } catch (error) {
    console.error('Auto save failed:', error)
    saveBtn.textContent = '自动保存失败'
    setTimeout(() => (saveBtn.textContent = originalText), 2000)
  }
}

// 切换预览模式
function togglePreview() {
  const editArea = document.getElementById('editArea')
  const preview = document.getElementById('preview')
  const previewBtn = document.getElementById('previewToggle')

  isPreviewMode = !isPreviewMode

  if (isPreviewMode) {
    editArea.classList.add('hidden')
    preview.classList.remove('hidden')
    previewBtn.classList.add('active')
    updatePreview()
  } else {
    editArea.classList.remove('hidden')
    preview.classList.add('hidden')
    previewBtn.classList.remove('active')
  }
}

// 获取所有笔记
async function fetchNotes() {
  if (!isAuthenticated) return

  try {
    const { data, error } = await supabaseClient
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    notes = data
    displayNotesList()
  } catch (error) {
    console.error('Error fetching notes:', error)
    alert('获取笔记失败')
  }
}

// URL路由处理
async function handleUrlRoute() {
  if (!isAuthenticated) return

  const path = window.location.pathname
  const noteName = path.substring(1)

  if (noteName) {
    const existingNote = notes.find((note) => note.title === noteName)
    if (existingNote) {
      selectNote(existingNote.id)
    } else {
      await createNewNoteWithTitle(noteName)
    }
  }
}

// 使用指定标题创建新笔记
async function createNewNoteWithTitle(title) {
  try {
    const { data, error } = await supabaseClient
      .from('notes')
      .insert([{ title, content: '' }])
      .select()

    if (error) throw error
    await fetchNotes()
    if (data && data[0]) {
      selectNote(data[0].id)
    }
  } catch (error) {
    console.error('Error creating note:', error)
    alert('创建笔记失败')
  }
}

// 保存笔记
async function saveNote(isAutoSave = false) {
  if (!isAuthenticated) return

  const title = document.getElementById('noteTitle').value
  const content = document.getElementById('noteContent').value

  if (!title) {
    if (!isAutoSave) alert('请输入标题')
    return
  }

  try {
    if (currentNote) {
      const { data, error } = await supabaseClient
        .from('notes')
        .update({ title, content })
        .eq('id', currentNote.id)
        .select()

      if (error) throw error

      history.pushState({}, '', `/${title}`)
    } else {
      const { data, error } = await supabaseClient
        .from('notes')
        .insert([{ title, content }])
        .select()

      if (error) throw error

      history.pushState({}, '', `/${title}`)
    }

    if (!isAutoSave) {
      await fetchNotes()
    }
  } catch (error) {
    console.error('Error saving note:', error)
    if (!isAutoSave) {
      alert('保存笔记失败')
    }
    throw error
  }
}

// 删除笔记
async function deleteNote(id) {
  if (!isAuthenticated) return

  if (!confirm('确定要删除这条笔记吗？')) return

  try {
    const { error } = await supabaseClient.from('notes').delete().eq('id', id)

    if (error) throw error

    if (currentNote && currentNote.id === id) {
      currentNote = null
      clearEditor()
      history.pushState({}, '', '/')
    }

    await fetchNotes()
  } catch (error) {
    console.error('Error deleting note:', error)
    alert('删除笔记失败')
  }
}

// 显示笔记列表
function displayNotesList() {
  const notesList = document.getElementById('notesList')
  notesList.innerHTML = notes
    .map(
      (note) => `
        <div class="note-item ${
          currentNote && currentNote.id === note.id ? 'active' : ''
        }" 
             onclick="selectNote(${note.id})">
          <div class="note-title">${note.title}</div>
          <div class="note-meta">
            <small>${new Date(note.created_at).toLocaleDateString()}</small>
            <button onclick="deleteNote(${note.id}); event.stopPropagation();" 
                    class="delete-btn">删除</button>
          </div>
        </div>
      `
    )
    .join('')
}

// 选择笔记
function selectNote(id) {
  if (!isAuthenticated) return

  currentNote = notes.find((note) => note.id === id)
  if (!currentNote) return

  document.getElementById('noteTitle').value = currentNote.title
  document.getElementById('noteContent').value = currentNote.content
  updatePreview()
  displayNotesList()

  history.pushState({}, '', `/${currentNote.title}`)
}

// 创建新笔记
function createNewNote() {
  if (!isAuthenticated) return

  currentNote = null
  clearEditor()
  history.pushState({}, '', '/')
}

// 清空编辑器
function clearEditor() {
  document.getElementById('noteTitle').value = ''
  document.getElementById('noteContent').value = ''
  document.getElementById('preview').innerHTML = ''
  displayNotesList()
}

// 更新Markdown预览
function updatePreview() {
  if (!isPreviewMode) return
  const content = document.getElementById('noteContent').value
  const preview = document.getElementById('preview')
  preview.innerHTML = marked.parse(content)
}

// 处理浏览器后退/前进按钮
window.onpopstate = handleUrlRoute

// 导出函数
export {
  saveNote,
  deleteNote,
  createNewNote,
  updatePreview,
  authenticate,
  logout,
  togglePreview,
}

// 将函数绑定到window对象
window.selectNote = selectNote
window.deleteNote = deleteNote
window.authenticate = authenticate
window.logout = logout

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  checkStoredAuth()
})
