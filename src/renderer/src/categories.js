// 分类现在存放在 data.json 里（可通过「分类管理」增删改），
// 这个文件只负责：常用图标 + 数据转换的辅助函数。

// 常用图标，供「新增/修改分类」时选择
export const EMOJIS = [
  '🍜', '🍔', '☕', '🍎', '🚗', '🚌', '🚕', '✈️',
  '🛍️', '👗', '💻', '📱', '🏠', '💡', '🎮', '🎬',
  '🏀', '💊', '🏥', '📚', '✏️', '🎁', '🐾', '💼',
  '🎂', '🧸', '🚬', '🍺', '🏦', '📦'
]

// 根据一级分类名找到对应的图标（找不到时给默认图标）
export function findEmoji(categories, categoryName) {
  const c = categories.find((c) => c.name === categoryName)
  return c ? c.emoji : '📦'
}

// 生成给「记一笔」表单的级联选择器用的选项
export function buildCategoryOptions(categories) {
  return categories.map((c) => ({
    value: c.name,
    label: `${c.emoji} ${c.name}`,
    children: (c.children || []).map((s) => ({ value: s, label: s }))
  }))
}
