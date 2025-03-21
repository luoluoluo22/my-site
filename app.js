import { createClient } from 'https://esm.sh/@supabase/supabase-js'

// 常量定义
const SITE_PASSWORD = '123456' // 网站访问密码
const PAGE_SIZE = 10 // 每页加载的笔记数量
const MAX_VISIBLE_NOTES = 50 // 最大可见笔记数量

// 初始化Supabase客户端
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://gptacdyjxmjzlmgwjmms.supabase.co'
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_KEY || ''

let supabaseClient
let currentNote = null
let notes = []
let isAuthenticated = false
let isPreviewMode = false
let autoSaveTimeout = null

// 命令执行方式
const EXECUTION_MODE = {
  WEBVIEW: 'webview',
  WEBSOCKET: 'websocket'
}

let currentExecutionMode = null

// 服务发现和连接管理
const CommandService = {
  endpoints: ['ws://localhost:3000'],
  currentWs: null,
  lastSuccessfulEndpoint: null,
  
  async discoverServices() {
    return new Promise((resolve) => {
      const foundEndpoints = new Set()
      
      foundEndpoints.add('ws://localhost:3000')
      const savedEndpoints = JSON.parse(localStorage.getItem('wsEndpoints') || '[]')
      savedEndpoints.forEach(endpoint => foundEndpoints.add(endpoint))
      
      const promises = []
      for (let i = 1; i < 255; i++) {
        promises.push(this.testEndpoint(`ws://192.168.1.${i}:3000`, 500))
      }
      
      Promise.all(promises).then(results => {
        results.forEach((isAvailable, index) => {
          if (isAvailable) {
            foundEndpoints.add(`ws://192.168.1.${index + 1}:3000`)
          }
        })
        resolve([...foundEndpoints])
      })
      
      setTimeout(() => {
        resolve([...foundEndpoints])
      }, 3000)
    })
  },
  
  async updateEndpoints() {
    const discoveredEndpoints = await this.discoverServices()
    this.endpoints = discoveredEndpoints
    localStorage.setItem('wsEndpoints', JSON.stringify(this.endpoints))
  },
  
  async testEndpoint(endpoint, timeout = 2000) {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(endpoint)
        const timer = setTimeout(() => {
          ws.close()
          resolve(false)
        }, timeout)
        
        ws.onopen = () => {
          clearTimeout(timer)
          ws.close()
          resolve(true)
        }
        
        ws.onerror = () => {
          clearTimeout(timer)
          resolve(false)
        }
      } catch (error) {
        resolve(false)
      }
    })
  },
  
  async connectToBestEndpoint() {
    await this.updateEndpoints()
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      const remoteEndpoints = this.endpoints.filter(ep => !ep.includes('localhost'))
      for (const endpoint of remoteEndpoints) {
        const isAvailable = await this.testEndpoint(endpoint)
        if (isAvailable) {
          return this.connect(endpoint)
        }
      }
    }
    
    for (const endpoint of this.endpoints) {
      const isAvailable = await this.testEndpoint(endpoint)
      if (isAvailable) {
        return this.connect(endpoint)
      }
    }
    
    throw new Error('未找到可用的命令执行服务，请确保本地服务已启动')
  },
  
  connect(endpoint) {
    return new Promise((resolve, reject) => {
      try {
        if (this.currentWs) {
          this.currentWs.close()
        }
        
        const ws = new WebSocket(endpoint)
        
        ws.onopen = () => {
          this.currentWs = ws
          this.lastSuccessfulEndpoint = endpoint
          localStorage.setItem('lastWsEndpoint', endpoint)
          resolve(ws)
        }
        
        ws.onclose = () => {
          if (this.currentWs === ws) {
            this.currentWs = null
          }
        }
        
        ws.onerror = (error) => {
          reject(error)
        }
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'command_result') {
              handleCommandResult(data)
            }
          } catch (error) {
            console.error('处理消息失败:', error)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  },
  
  addEndpoint(endpoint) {
    if (!this.endpoints.includes(endpoint)) {
      this.endpoints.push(endpoint)
      localStorage.setItem('wsEndpoints', JSON.stringify(this.endpoints))
    }
  },
  
  getCurrentConnection() {
    return this.currentWs
  }
}

// 初始化 Supabase
async function initSupabase() {
  try {
    if (!SUPABASE_ANON_KEY) {
      throw new Error('Supabase key not found. Please check your environment variables.')
    }
    
    console.log('初始化 Supabase:', {
      url: SUPABASE_URL,
      key: SUPABASE_ANON_KEY ? '已设置' : '未设置',
      env: window.ENV
    })
    
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // 测试连接
    const { error } = await supabaseClient.from('notes').select('count')
    if (error) throw error
    
    console.log('Supabase 连接成功')
    return true
  } catch (error) {
    console.error('Supabase 初始化失败:', error)
    showMessage('数据库连接失败: ' + error.message, 'error')
    return false
  }
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
  if (!isAuthenticated || !supabaseClient) return

  try {
    const { data: notes_data, error } = await supabaseClient
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    
    console.log('加载的笔记:', notes_data)
    notes = notes_data
    currentNote = notes[0] || null
    updateNotesList()
    updateEditor()
  } catch (error) {
    console.error('加载笔记失败:', error)
    showMessage('加载笔记失败: ' + error.message, 'error')
  }
}

// 自动保存功能
function setupAutoSave() {
  const contentElement = document.getElementById('noteContent')
  const titleElement = document.getElementById('noteTitle')

  let isSaving = false

  async function performAutoSave() {
    if (isSaving || !isAuthenticated || !currentNote) return
    
    try {
      isSaving = true
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
        const { error } = await supabaseClient
          .from('notes')
          .update(noteData)
          .eq('id', currentNote.id)

        if (error) throw error
      }
      
      // 不显示保存成功的消息，静默保存
      console.log('自动保存成功')
    } catch (error) {
      console.error('自动保存失败:', error)
      // 自动保存失败时也不显示错误消息，避免打扰用户
    } finally {
      isSaving = false
    }
  }

  if (contentElement && titleElement) {
    contentElement.addEventListener('input', () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
      autoSaveTimeout = setTimeout(performAutoSave, 3000) // 增加到3秒
    })

    titleElement.addEventListener('input', () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
      autoSaveTimeout = setTimeout(performAutoSave, 3000) // 增加到3秒
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
  
  // 使用marked解析Markdown
  const rendered = marked.parse(content)
  previewElement.innerHTML = rendered

  // 增强代码块
  enhanceCodeBlocks(previewElement)

  // 切换预览/编辑区域的显示状态
  previewElement.classList.toggle('hidden', !isPreviewMode)
  editArea.classList.toggle('hidden', isPreviewMode)
}

// 检测可用的命令执行方式
function detectExecutionMode() {
  if (window.chrome?.webview) {
    currentExecutionMode = EXECUTION_MODE.WEBVIEW
    return
  }
  currentExecutionMode = EXECUTION_MODE.WEBSOCKET
}

// 执行命令
async function executeCommand(command) {
  if (currentExecutionMode === EXECUTION_MODE.WEBVIEW) {
    try {
      const result = await window.chrome.webview.hostObjects.powershell.executeCommand(command)
      handleCommandResult({
        type: 'command_result',
        command,
        success: true,
        output: result
      })
    } catch (error) {
      handleCommandResult({
        type: 'command_result',
        command,
        success: false,
        error: error.message
      })
    }
  } else if (currentExecutionMode === EXECUTION_MODE.WEBSOCKET) {
    try {
      if (!CommandService.getCurrentConnection()) {
        await CommandService.connectToBestEndpoint()
      }
      
      const ws = CommandService.getCurrentConnection()
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error('无法连接到命令执行服务')
      }
      
      ws.send(JSON.stringify({
        type: 'command',
        command
      }))
    } catch (error) {
      handleCommandResult({
        type: 'command_result',
        command,
        success: false,
        error: error.message
      })
    }
  } else {
    handleCommandResult({
      type: 'command_result',
      command,
      success: false,
      error: '未找到可用的命令执行方式'
    })
  }
}

// 处理命令执行结果
function handleCommandResult(data) {
  const { command, success, output, error } = data
  
  // 在预览区域显示结果
  const resultHtml = `
    <div class="command-result ${success ? 'success' : 'error'}">
      <div class="command-header">
        <span class="command-text">${command}</span>
        <span class="command-status">${success ? '成功' : '失败'}</span>
      </div>
      <pre class="command-output">${output || error || '无输出'}</pre>
      ${!success ? `
        <div class="command-error-help">
          <button onclick="downloadLocal()" class="download-local-btn">
            下载本地版本
          </button>
        </div>
      ` : ''}
    </div>
  `
  
  // 创建或获取命令结果容器
  let resultContainer = document.getElementById('commandResults')
  if (!resultContainer) {
    resultContainer = document.createElement('div')
    resultContainer.id = 'commandResults'
    resultContainer.className = 'command-results-container'
    
    // 添加清除按钮
    const clearButton = document.createElement('button')
    clearButton.className = 'clear-results-btn'
    clearButton.innerHTML = '清除'
    clearButton.onclick = () => {
      resultContainer.innerHTML = ''
      // 重新添加清除按钮
      resultContainer.appendChild(clearButton)
    }
    resultContainer.appendChild(clearButton)
    
    // 添加到编辑器容器中
    const editorContainer = document.querySelector('.editor-container')
    if (editorContainer) {
      editorContainer.appendChild(resultContainer)
    }
  }
  
  // 添加结果到容器
  const clearButton = resultContainer.querySelector('.clear-results-btn')
  if (clearButton) {
    clearButton.insertAdjacentHTML('afterend', resultHtml)
  } else {
    resultContainer.insertAdjacentHTML('beforeend', resultHtml)
  }
  resultContainer.scrollTop = resultContainer.scrollHeight
  
  // 同时也添加到预览区域
  const previewElement = document.getElementById('preview')
  if (previewElement) {
    previewElement.insertAdjacentHTML('beforeend', resultHtml)
    previewElement.scrollTop = previewElement.scrollHeight
  }
}

// 增强代码块功能
function enhanceCodeBlocks(previewElement) {
  const codeBlocks = previewElement.querySelectorAll('pre code')
  let orderCount = 1

  codeBlocks.forEach(codeBlock => {
    const pre = codeBlock.parentElement
    
    // 创建工具栏
    const toolbar = document.createElement('div')
    toolbar.className = 'code-toolbar'
    
    // 创建复制按钮
    const copyButton = document.createElement('button')
    copyButton.className = 'copy-button'
    copyButton.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
      </svg>
      复制
    `

    // 创建执行按钮（仅对 PowerShell 代码块）
    const isPowerShell = codeBlock.className.includes('language-powershell')
    if (isPowerShell) {
      const executeButton = document.createElement('button')
      executeButton.className = 'execute-button'
      executeButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
        </svg>
        执行
      `
      executeButton.addEventListener('click', () => {
        const command = codeBlock.textContent.trim()
        executeCommand(command)
      })
      toolbar.appendChild(executeButton)
    }
    
    // 添加复制功能
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codeBlock.textContent)
        copyButton.classList.add('copy-success')
        copyButton.textContent = '已复制!'
        setTimeout(() => {
          copyButton.classList.remove('copy-success')
          copyButton.innerHTML = `
            <svg viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
            </svg>
            复制
          `
        }, 2000)
      } catch (err) {
        console.error('复制失败:', err)
        showMessage('复制失败', 'error')
      }
    })

    toolbar.appendChild(copyButton)
    pre.appendChild(toolbar)
    
    // 检测是否是PowerShell命令
    if (isPowerShell) {
      pre.setAttribute('data-type', 'powershell')
      pre.setAttribute('data-order', orderCount++)
      
      // 检测是否需要管理员权限
      const needsAdmin = codeBlock.textContent.includes('#requires admin') ||
                        codeBlock.textContent.toLowerCase().includes('administrator')
      if (needsAdmin) {
        pre.setAttribute('data-admin', 'true')
      }
    }
  })
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
document.addEventListener('DOMContentLoaded', async () => {
  // 确保帮助面板最先被隐藏
  const helpPanel = document.getElementById('helpPanel')
  if (helpPanel) {
    helpPanel.classList.add('hidden')
    helpPanel.style.visibility = 'hidden'
  }

  // 初始化 Supabase
  const supabaseInitialized = await initSupabase()
  if (supabaseInitialized) {
    await checkStoredAuth()
  }

  restoreSidebarState()
  initializeUIState()
  initializeTheme()
  setupThemeListener()
  setupAutoSave()
  
  // 检测并初始化命令执行方式
  detectExecutionMode()

  // 加载初始笔记
  await loadInitialNotesWithCache()
  setupInfiniteScroll()
})

// 下载本地版本
async function downloadLocal() {
  try {
    const response = await fetch('public/downloads/command-server.zip')
    if (!response.ok) {
      throw new Error('下载失败')
    }
    
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'command-server.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showMessage('下载完成！请解压后以管理员身份运行 start.bat')
  } catch (error) {
    console.error('下载失败:', error)
    showMessage('下载失败，请稍后重试', 'error')
  }
}

// 添加分页加载函数
async function loadNotesWithPagination(page = 0, searchTerm = '') {
  try {
    showLoading('加载笔记中...');
    let query = supabaseClient
      .from('notes')
      .select('id, title, content, updated_at')
      .order('updated_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (page === 0) {
      notes = data || [];
    } else {
      notes = [...notes, ...data];
    }
    
    renderNotesList();
    hideLoading();
    
    // 缓存首页数据
    if (page === 0) {
      localStorage.setItem('cachedNotes', JSON.stringify(notes));
      localStorage.setItem('notesLastUpdated', new Date().toISOString());
    }
    
    return data.length === PAGE_SIZE; // 返回是否有更多数据
  } catch (error) {
    console.error('加载笔记失败:', error);
    hideLoading();
    showNotification('加载笔记失败，请检查网络连接', 'error');
    return false;
  }
}

// 添加"加载更多"功能
function setupInfiniteScroll() {
  let currentPage = 0;
  let hasMore = true;
  let isLoading = false;
  const notesList = document.getElementById('notesList');
  
  // 添加滚动监听
  notesList.addEventListener('scroll', async () => {
    if (!hasMore || isLoading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = notesList;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      isLoading = true;
      currentPage++;
      hasMore = await loadNotesWithPagination(currentPage);
      isLoading = false;
    }
  });
  
  // 添加"加载更多"按钮
  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.innerText = '加载更多';
  loadMoreBtn.className = 'load-more-btn';
  loadMoreBtn.onclick = async () => {
    if (!hasMore || isLoading) return;
    isLoading = true;
    currentPage++;
    hasMore = await loadNotesWithPagination(currentPage);
    isLoading = false;
    
    if (!hasMore) {
      loadMoreBtn.innerText = '已加载全部';
      loadMoreBtn.disabled = true;
    }
  };
  notesList.parentNode.appendChild(loadMoreBtn);
}

// 使用缓存数据快速加载首屏
function loadInitialNotesWithCache() {
  const cachedNotes = JSON.parse(localStorage.getItem('cachedNotes') || '[]');
  const lastUpdated = localStorage.getItem('notesLastUpdated');
  const cacheAge = lastUpdated ? (new Date() - new Date(lastUpdated)) / 1000 / 60 : 999;
  
  if (cachedNotes.length > 0 && cacheAge < 30) { // 缓存不超过30分钟
    notes = cachedNotes;
    renderNotesList();
    console.log('从缓存加载首屏数据');
  }
  
  // 无论是否使用缓存，都加载最新数据
  loadNotesWithPagination(0);
}

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
  selectNote,
  downloadLocal  // 导出下载函数
}

// 将必要的函数绑定到 window 对象
window.deleteNote = deleteNote
window.authenticate = authenticate
window.logout = logout
window.handleNoteClick = handleNoteClick
window.downloadLocal = downloadLocal  // 添加到全局对象
