import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// 初始化 Supabase 客户端
const supabaseConfig = window.ENV || {}
const SUPABASE_URL = 'https://gptacdyjxmjzlmgwjmms.supabase.co'
const SUPABASE_ANON_KEY = supabaseConfig.SUPABASE_KEY || ''

let supabaseClient
let currentNote = null
let notes = []
let isAuthenticated = false

try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} catch (error) {
  console.error('Supabase 初始化失败:', error)
}

// 身份验证
async function authenticate(password) {
  try {
    const { data, error } = await supabaseClient
      .from('auth_settings')
      .select('password')
      .single()

    if (error) throw error

    if (data.password === password) {
      isAuthenticated = true
      document.getElementById('loginPanel').style.display = 'none'
      document.getElementById('mainContent').style.display = 'flex'
      await fetchNotes()
      handleUrlRoute()
    } else {
      alert('密码错误')
    }
  } catch (error) {
    console.error('Authentication error:', error)
    alert('验证失败')
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
  const noteName = path.substring(1) // 移除开头的/

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
async function saveNote() {
  if (!isAuthenticated) return

  const title = document.getElementById('noteTitle').value
  const content = document.getElementById('noteContent').value

  if (!title) {
    alert('请输入标题')
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

      // 更新URL
      history.pushState({}, '', `/${title}`)
    } else {
      const { data, error } = await supabaseClient
        .from('notes')
        .insert([{ title, content }])
        .select()

      if (error) throw error

      // 更新URL
      history.pushState({}, '', `/${title}`)
    }

    await fetchNotes()
  } catch (error) {
    console.error('Error saving note:', error)
    alert('保存笔记失败')
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

  // 更新URL
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
  const content = document.getElementById('noteContent').value
  const preview = document.getElementById('preview')
  preview.innerHTML = marked.parse(content)
}

// 处理浏览器后退/前进按钮
window.onpopstate = handleUrlRoute

// 导出函数
export { saveNote, deleteNote, createNewNote, updatePreview, authenticate }

// 将函数绑定到window对象
window.selectNote = selectNote
window.deleteNote = deleteNote
window.authenticate = authenticate

// 页面加载时检查URL路由
document.addEventListener('DOMContentLoaded', () => {
  // 首次加载时显示登录面板，隐藏主内容
  document.getElementById('loginPanel').style.display = 'flex'
  document.getElementById('mainContent').style.display = 'none'
})
