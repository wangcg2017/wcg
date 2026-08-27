const { contextBridge, ipcRenderer } = require('electron')

// 把数据读写能力安全地暴露给界面，界面里通过 window.api.xxx 调用
contextBridge.exposeInMainWorld('api', {
  // 账本记录
  loadData: () => ipcRenderer.invoke('data:load'),
  addRecord: (record) => ipcRenderer.invoke('record:add', record),
  updateRecord: (record) => ipcRenderer.invoke('record:update', record),
  deleteRecord: (id) => ipcRenderer.invoke('record:delete', id),

  // 分类管理（payload 里带 group：'expense' 支出 / 'income' 收入）
  addCategory: (payload) => ipcRenderer.invoke('category:add', payload),
  updateCategory: (payload) => ipcRenderer.invoke('category:update', payload),
  deleteCategory: (payload) => ipcRenderer.invoke('category:delete', payload),
  addChild: (payload) => ipcRenderer.invoke('category:addChild', payload),
  renameChild: (payload) => ipcRenderer.invoke('category:renameChild', payload),
  deleteChild: (payload) => ipcRenderer.invoke('category:deleteChild', payload)
})
