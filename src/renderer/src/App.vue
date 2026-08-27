<script setup>
import { ref, computed, onMounted } from 'vue'
import RecordForm from './components/RecordForm.vue'
import RecordList from './components/RecordList.vue'
import CategoryManage from './components/CategoryManage.vue'

const records = ref([])
const categories = ref([])
const dialogVisible = ref(false)
const editing = ref(null)
const dialogKey = ref(0)
const showCategories = ref(false)

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function sum(list) {
  return list.reduce((s, r) => s + Number(r.amount || 0), 0)
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2)
}

const monthTotal = computed(() => {
  const prefix = todayStr().slice(0, 7)
  return sum(records.value.filter((r) => (r.date || '').startsWith(prefix) && r.type !== 'income'))
})

const monthIncome = computed(() => {
  const prefix = todayStr().slice(0, 7)
  return sum(records.value.filter((r) => (r.date || '').startsWith(prefix) && r.type === 'income'))
})

const monthBalance = computed(() => monthIncome.value - monthTotal.value)

async function loadData() {
  const data = await window.api.loadData()
  records.value = data.records || []
  categories.value = data.categories || { expense: [], income: [] }
}

function openAdd() {
  editing.value = null
  dialogKey.value++
  dialogVisible.value = true
}

function openEdit(record) {
  editing.value = record
  dialogKey.value++
  dialogVisible.value = true
}

function onSubmit() {
  dialogVisible.value = false
  loadData()
}

function onCategoriesChanged() {
  loadData()
}

onMounted(loadData)
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="logo">
        <span class="logo-icon">🐴</span>
        <span class="logo-name">黑马记账</span>
      </div>
      <div class="header-actions">
        <el-button @click="showCategories = true">⚙️ 分类管理</el-button>
        <el-button type="primary" size="large" round @click="openAdd">
          ＋ 记一笔
        </el-button>
      </div>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">本月支出</div>
        <div class="stat-value stat-expense">{{ formatMoney(monthTotal) }}<span class="stat-unit">元</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月收入</div>
        <div class="stat-value stat-income">{{ formatMoney(monthIncome) }}<span class="stat-unit">元</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月结余</div>
        <div class="stat-value" :class="monthBalance >= 0 ? 'stat-income' : 'stat-expense'">
          {{ monthBalance >= 0 ? '+' : '' }}{{ formatMoney(monthBalance) }}<span class="stat-unit">元</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">记账笔数</div>
        <div class="stat-value">{{ records.length }}<span class="stat-unit">笔</span></div>
      </div>
    </div>

    <div class="list-area">
      <RecordList :records="records" :categories="categories" @edit="openEdit" @changed="loadData" />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑这笔' : '记一笔'"
      width="460px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <RecordForm
        :key="dialogKey"
        :initial="editing"
        :categories="categories"
        @submit="onSubmit"
        @cancel="dialogVisible = false"
      />
    </el-dialog>

    <el-dialog
      v-model="showCategories"
      title="分类管理"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <CategoryManage :categories="categories" @changed="onCategoriesChanged" />
    </el-dialog>
  </div>
</template>

<style>
:root {
  --primary: #f0643a;
  --primary-light: #ff8a5c;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f5f6f8;
}

.app {
  min-height: 100vh;
  max-width: 760px;
  margin: 0 auto;
  padding: 20px 24px 60px;
  box-sizing: border-box;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 30px;
}

.logo-name {
  font-size: 22px;
  font-weight: 700;
  color: #1f2329;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.stat-expense {
  color: #f0643a;
}

.stat-income {
  color: #07c160;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.stat-label {
  font-size: 13px;
  color: #8a919f;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #1f2329;
  font-variant-numeric: tabular-nums;
}

.stat-unit {
  font-size: 13px;
  font-weight: 400;
  color: #8a919f;
  margin-left: 4px;
}

.list-area {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
</style>
