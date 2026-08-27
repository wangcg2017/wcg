<script setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { findEmoji } from '../categories'

const props = defineProps({
  records: { type: Array, default: () => [] },
  categories: { type: Object, default: () => ({ expense: [], income: [] }) }
})

const emit = defineEmits(['edit', 'changed'])

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

function formatDate(dateStr) {
  const today = new Date()
  const y = String(today.getFullYear())
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`

  if (dateStr === todayStr) return '今天'
  if (dateStr === yesterdayStr()) return '昨天'

  const [, mm, dd] = dateStr.split('-')
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date(dateStr + 'T00:00:00').getDay()]
  return `${Number(mm)}月${Number(dd)}日 星期${weekday}`
}

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function sum(list) {
  return list.reduce((s, r) => s + Number(r.amount || 0), 0)
}

const grouped = computed(() => {
  const map = new Map()
  for (const r of props.records) {
    if (!map.has(r.date)) map.set(r.date, [])
    map.get(r.date).push(r)
  }
  const arr = [...map.entries()].map(([date, list]) => {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    const expenseList = list.filter((r) => r.type !== 'income')
    const incomeList = list.filter((r) => r.type === 'income')
    return {
      date,
      records: list,
      expenseTotal: sum(expenseList),
      incomeTotal: sum(incomeList)
    }
  })
  arr.sort((a, b) => b.date.localeCompare(a.date))
  return arr
})

async function remove(record) {
  try {
    await ElMessageBox.confirm(
      `确定删除这笔 ${record.type === 'income' ? '收入' : '支出'} ¥${formatMoney(record.amount)} 的「${record.subcategory}」吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '再想想' }
    )
  } catch {
    return
  }
  await window.api.deleteRecord(record.id)
  ElMessage.success('已删除')
  emit('changed')
}
</script>

<template>
  <div class="record-list">
    <div v-if="!grouped.length" class="empty">
      <div class="empty-icon">📒</div>
      <p>还没有记账记录</p>
      <p class="empty-sub">点右上角「＋ 记一笔」开始记账吧</p>
    </div>

    <div v-for="group in grouped" :key="group.date" class="day-group">
      <div class="day-header">
        <span class="day-date">{{ formatDate(group.date) }}</span>
        <span class="day-sums">
          <span v-if="group.expenseTotal" class="day-expense">支 ¥{{ formatMoney(group.expenseTotal) }}</span>
          <span v-if="group.incomeTotal" class="day-income">收 +¥{{ formatMoney(group.incomeTotal) }}</span>
        </span>
      </div>

      <div
        v-for="r in group.records"
        :key="r.id"
        class="record-row"
        @click="emit('edit', r)"
      >
        <div class="record-emoji" :class="r.type === 'income' ? 'emoji-income' : 'emoji-expense'">
          {{ findEmoji(props.categories[r.type] || [], r.category) }}
        </div>
        <div class="record-info">
          <div class="record-title">
            {{ r.subcategory }}
            <span class="record-cat">{{ r.category }}</span>
          </div>
          <div v-if="r.note" class="record-note">{{ r.note }}</div>
        </div>
        <div class="record-amount" :class="r.type === 'income' ? 'amount-income' : 'amount-expense'">
          {{ r.type === 'income' ? '+' : '' }}¥{{ formatMoney(r.amount) }}
        </div>
        <el-button
          class="delete-btn"
          link
          type="danger"
          size="small"
          @click.stop="remove(r)"
        >
          删除
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty {
  padding: 70px 0;
  text-align: center;
  color: #8a919f;
}

.empty-icon {
  font-size: 46px;
  margin-bottom: 12px;
}

.empty p {
  margin: 4px 0;
  font-size: 15px;
}

.empty-sub {
  font-size: 13px;
  opacity: 0.7;
}

.day-group {
  border-bottom: 1px solid #f2f3f5;
}

.day-group:last-child {
  border-bottom: none;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fafbfc;
  font-size: 13px;
  color: #6b7280;
}

.day-sums {
  display: flex;
  gap: 12px;
  font-weight: 600;
}

.day-expense {
  color: #f0643a;
}

.day-income {
  color: #07c160;
}

.record-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.15s;
}

.record-row:hover {
  background: #f7f8fa;
}

.record-emoji {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 20px;
  flex-shrink: 0;
}

.emoji-expense {
  background: #fff4ef;
}

.emoji-income {
  background: #e9f9ef;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-title {
  font-size: 15px;
  color: #1f2329;
}

.record-cat {
  font-size: 12px;
  color: #8a919f;
  margin-left: 6px;
}

.record-note {
  font-size: 12px;
  color: #9aa1ad;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-amount {
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.amount-income {
  color: #07c160;
}

.amount-expense {
  color: #1f2329;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.record-row:hover .delete-btn {
  opacity: 1;
}
</style>
