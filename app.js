import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// 初始化 Supabase 客户端
const supabaseConfig = window.ENV || {}
const SUPABASE_URL = 'https://gptacdyjxmjzlmgwjmms.supabase.co'
const SUPABASE_ANON_KEY = supabaseConfig.SUPABASE_KEY || ''

let supabaseClient
let currentNote = null
let notes = []

try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} catch (error) {
  console.error('Supabase 初始化失败:', error)
}

// 获取所有笔记
async function fetchNotes() {
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

// 保存笔记
async function saveNote() {
  const title = document.getElementById('noteTitle').value
  const content = document.getElementById('noteContent').value

  if (!title || !content) {
    alert('请输入标题和内容')
    return
  }

  try {
    if (currentNote) {
      // 更新现有笔记
      const { data, error } = await supabaseClient
        .from('notes')
        .update({ title, content })
        .eq('id', currentNote.id)
        .select()

      if (error) throw error
    } else {
      // 创建新笔记
      const { data, error } = await supabaseClient
        .from('notes')
        .insert([{ title, content }])
        .select()

      if (error) throw error
    }

    await fetchNotes()
  } catch (error) {
    console.error('Error saving note:', error)
    alert('保存笔记失败')
  }
}

// 删除笔记
async function deleteNote(id) {
  if (!confirm('确定要删除这条笔记吗？')) return

  try {
    const { error } = await supabaseClient.from('notes').delete().eq('id', id)

    if (error) throw error

    if (currentNote && currentNote.id === id) {
      currentNote = null
      clearEditor()
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
  currentNote = notes.find((note) => note.id === id)
  if (!currentNote) return

  document.getElementById('noteTitle').value = currentNote.title
  document.getElementById('noteContent').value = currentNote.content
  updatePreview()
  displayNotesList() // 更新选中状态
}

// 创建新笔记
function createNewNote() {
  currentNote = null
  clearEditor()
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

// 自动保存功能
let autoSaveTimer
function setupAutoSave() {
  const noteContent = document.getElementById('noteContent')
  const noteTitle = document.getElementById('noteTitle')

  function triggerAutoSave() {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      if (noteTitle.value && noteContent.value) {
        saveNote()
      }
    }, 2000) // 2秒后自动保存
  }

  noteContent.addEventListener('input', triggerAutoSave)
  noteTitle.addEventListener('input', triggerAutoSave)
}

// 导出函数
export { saveNote, deleteNote, createNewNote, updatePreview }

// 将函数绑定到window对象
window.selectNote = selectNote
window.deleteNote = deleteNote

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  fetchNotes()
  setupAutoSave()
})
