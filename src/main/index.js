const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// 首次使用时写入的默认分类（支出）
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: '餐饮', emoji: '🍜', children: ['早餐', '午餐', '晚餐', '外卖', '零食', '咖啡茶饮', '聚餐'] },
  { name: '交通', emoji: '🚗', children: ['公交地铁', '打车', '加油', '停车', '高铁火车', '机票', '共享单车'] },
  { name: '购物', emoji: '🛍️', children: ['服饰鞋包', '日用品', '数码家电', '美妆护肤', '母婴', '其他'] },
  { name: '居住', emoji: '🏠', children: ['房租', '水电燃气', '物业', '维修', '宽带'] },
  { name: '娱乐', emoji: '🎮', children: ['电影', '游戏', '会员订阅', '旅游', '运动健身'] },
  { name: '医疗', emoji: '💊', children: ['药品', '门诊', '体检', '保健'] },
  { name: '教育', emoji: '📚', children: ['书籍', '课程培训', '考试报名'] },
  { name: '人情往来', emoji: '🎁', children: ['红包礼金', '请客送礼'] },
  { name: '通讯', emoji: '📱', children: ['话费', '流量', '快递'] },
  { name: '其他', emoji: '📦', children: ['其他'] }
]

// 首次使用时写入的默认分类（收入）
const DEFAULT_INCOME_CATEGORIES = [
  { name: '工资', emoji: '💰', children: ['基本工资', '奖金', '绩效', '补贴'] },
  { name: '红包', emoji: '🧧', children: ['微信红包', '生日红包', '结婚礼金'] },
  { name: '投资', emoji: '📈', children: ['基金', '股票', '利息'] },
  { name: '兼职', emoji: '💼', children: ['兼职', '副业', '稿费'] },
  { name: '二手闲置', emoji: '🏷️', children: ['二手出售', '旧物回收'] },
  { name: '其他收入', emoji: '📦', children: ['其他'] }
]

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function defaultCategories() {
  return {
    expense: clone(DEFAULT_EXPENSE_CATEGORIES),
    income: clone(DEFAULT_INCOME_CATEGORIES)
  }
}

// 账本数据文件：保存在系统「用户数据」目录下的 data.json
function dataFile() {
  return path.join(app.getPath('userData'), 'data.json')
}

function loadData() {
  try {
    const raw = fs.readFileSync(dataFile(), 'utf-8')
    const data = JSON.parse(raw)
    if (!Array.isArray(data.records)) data.records = []

    // 老记录没有 type 字段 → 默认是支出
    for (const r of data.records) {
      if (!r.type) r.type = 'expense'
    }

    // 老格式：categories 是数组 → 迁移成 { expense, income }
    if (Array.isArray(data.categories)) {
      data.categories = {
        expense: data.categories,
        income: clone(DEFAULT_INCOME_CATEGORIES)
      }
      saveData(data)
    }

    // 全新数据：写入默认分类
    if (!data.categories || !Array.isArray(data.categories.expense)) {
      data.categories = defaultCategories()
      saveData(data)
    }

    return data
  } catch (err) {
    // 文件不存在或损坏时，返回空账本 + 默认分类
    const data = { records: [], categories: defaultCategories() }
    saveData(data)
    return data
  }
}

function saveData(data) {
  const file = dataFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 780,
    minHeight: 600,
    title: '黑马记账',
    backgroundColor: '#f5f6f8',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // 开发模式：加载 Vite 热更新服务器；生产模式：加载打包后的文件
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ---------- 工具函数 ----------

// 取某一组分类列表（'expense' 支出 / 'income' 收入）
function catList(data, group) {
  return data.categories && Array.isArray(data.categories[group]) ? data.categories[group] : []
}

// 校验名称是否可用（非空、不重复、不太长）
function nameError(list, name, ignoreName) {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'empty'
  if (trimmed.length > 10) return 'tooLong'
  if (list.some((c) => c.name === trimmed && trimmed !== ignoreName)) return 'duplicate'
  return null
}

// 统计某条记录是否使用了某个分类/小类（按收支类型区分）
function usedByRecords(records, type, category, subcategory) {
  const filtered = records.filter((r) => r.type === type)
  if (subcategory) {
    return filtered.filter((r) => r.category === category && r.subcategory === subcategory).length
  }
  return filtered.filter((r) => r.category === category).length
}

// 返回统一结果：成功则带上最新完整数据，失败则带上原因
function ok(data) {
  return { ok: true, data }
}

function fail(reason, extra = {}) {
  return { ok: false, reason, ...extra }
}

// ---------- IPC：账本记录 ----------

ipcMain.handle('data:load', () => loadData())

ipcMain.handle('record:add', (_event, record) => {
  const data = loadData()
  if (!record.type) record.type = 'expense'
  data.records.unshift(record)
  saveData(data)
  return data.records
})

ipcMain.handle('record:update', (_event, record) => {
  const data = loadData()
  const idx = data.records.findIndex((r) => r.id === record.id)
  if (idx >= 0) {
    data.records[idx] = record
    saveData(data)
  }
  return data.records
})

ipcMain.handle('record:delete', (_event, id) => {
  const data = loadData()
  data.records = data.records.filter((r) => r.id !== id)
  saveData(data)
  return data.records
})

// ---------- IPC：分类管理（group: 'expense' 支出 / 'income' 收入） ----------

// 新增一级分类
ipcMain.handle('category:add', (_event, { group, name, emoji }) => {
  const data = loadData()
  const list = catList(data, group)
  const err = nameError(list, name)
  if (err) return fail(err)
  list.push({ name: name.trim(), emoji: emoji || '📦', children: [] })
  saveData(data)
  return ok(data)
})

// 修改一级分类（改名 / 换图标）
ipcMain.handle('category:update', (_event, { group, oldName, name, emoji }) => {
  const data = loadData()
  const list = catList(data, group)
  const cat = list.find((c) => c.name === oldName)
  if (!cat) return fail('notFound')
  const err = nameError(list, name, oldName)
  if (err) return fail(err)

  if (name.trim() !== oldName) {
    // 已记账的也要跟着改
    for (const r of data.records) {
      if (r.type === group && r.category === oldName) r.category = name.trim()
    }
    cat.name = name.trim()
  }
  if (emoji) cat.emoji = emoji
  saveData(data)
  return ok(data)
})

// 删除一级分类（该分类下还有记录时不允许删除）
ipcMain.handle('category:delete', (_event, { group, name }) => {
  const data = loadData()
  const count = usedByRecords(data.records, group, name)
  if (count > 0) return fail('inUse', { count })
  data.categories[group] = catList(data, group).filter((c) => c.name !== name)
  saveData(data)
  return ok(data)
})

// 新增二级分类
ipcMain.handle('category:addChild', (_event, { group, category, child }) => {
  const data = loadData()
  const cat = catList(data, group).find((c) => c.name === category)
  if (!cat) return fail('notFound')
  const trimmed = (child || '').trim()
  if (!trimmed) return fail('empty')
  if (trimmed.length > 10) return fail('tooLong')
  if (cat.children.includes(trimmed)) return fail('duplicate')
  cat.children.push(trimmed)
  saveData(data)
  return ok(data)
})

// 修改二级分类（改名）
ipcMain.handle('category:renameChild', (_event, { group, category, oldChild, newChild }) => {
  const data = loadData()
  const cat = catList(data, group).find((c) => c.name === category)
  if (!cat) return fail('notFound')
  const trimmed = (newChild || '').trim()
  if (!trimmed) return fail('empty')
  if (trimmed.length > 10) return fail('tooLong')
  if (trimmed !== oldChild && cat.children.includes(trimmed)) return fail('duplicate')

  const idx = cat.children.indexOf(oldChild)
  if (idx < 0) return fail('notFound')
  cat.children[idx] = trimmed

  // 已记账的也要跟着改
  for (const r of data.records) {
    if (r.type === group && r.category === category && r.subcategory === oldChild) {
      r.subcategory = trimmed
    }
  }
  saveData(data)
  return ok(data)
})

// 删除二级分类（该小类下还有记录时不允许删除）
ipcMain.handle('category:deleteChild', (_event, { group, category, child }) => {
  const data = loadData()
  const cat = catList(data, group).find((c) => c.name === category)
  if (!cat) return fail('notFound')
  const count = usedByRecords(data.records, group, category, child)
  if (count > 0) return fail('inUse', { count })
  cat.children = cat.children.filter((c) => c !== child)
  saveData(data)
  return ok(data)
})
