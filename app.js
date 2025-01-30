import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// 初始化 Supabase 客户端
const supabaseConfig = window.ENV || {}
const SUPABASE_URL = 'https://gptacdyjxmjzlmgwjmms.supabase.co'
const SUPABASE_ANON_KEY = supabaseConfig.SUPABASE_KEY || ''

// 将 supabaseClient 声明移到全局作用域
let supabaseClient

try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} catch (error) {
  console.error('Supabase 初始化失败:', error)
}

let notes = []

// 获取所有笔记
async function fetchNotes() {
  try {
    const { data, error } = await supabaseClient
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    notes = data
    displayNotes()
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
    const { data, error } = await supabaseClient
      .from('notes')
      .insert([{ title, content }])
      .select()

    if (error) throw error
    await fetchNotes()
    clearForm()
  } catch (error) {
    console.error('Error saving note:', error)
    alert('保存笔记失败')
  }
}

// 删除笔记
async function deleteNote(id) {
  try {
    const { error } = await supabaseClient.from('notes').delete().eq('id', id)

    if (error) throw error
    await fetchNotes()
  } catch (error) {
    console.error('Error deleting note:', error)
    alert('删除笔记失败')
  }
}

function displayNotes() {
  const notesList = document.getElementById('notesList')
  notesList.innerHTML = notes
    .map(
      (note) => `
        <div class="note-item">
            <h3>${note.title}</h3>
            <p>${note.content}</p>
            <small>${new Date(note.created_at).toLocaleString()}</small>
            <button onclick="deleteNote(${
              note.id
            })" style="background: #ff4444">删除</button>
        </div>
    `
    )
    .join('')
}

function clearForm() {
  document.getElementById('noteTitle').value = ''
  document.getElementById('noteContent').value = ''
}

// 导出函数
export { saveNote, deleteNote }

// 将函数绑定到 window 对象使其全局可用
window.saveNote = saveNote
window.deleteNote = deleteNote

// 页面加载时获取笔记
fetchNotes()
