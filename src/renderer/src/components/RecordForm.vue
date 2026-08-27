<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { buildCategoryOptions } from '../categories'

const props = defineProps({
  // 传入则代表编辑，否则是新增
  initial: { type: Object, default: null },
  // 当前所有分类（动态，来自 data.json）: { expense: [...], income: [...] }
  categories: { type: Object, default: () => ({ expense: [], income: [] }) }
})

const emit = defineEmits(['submit', 'cancel'])

function todayStr() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const form = reactive({
  type: props.initial ? props.initial.type || 'expense' : 'expense',
  amount: props.initial ? Number(props.initial.amount) : null,
  categoryPath: props.initial ? [props.initial.category, props.initial.subcategory] : [],
  date: props.initial ? props.initial.date : todayStr(),
  note: props.initial ? props.initial.note : ''
})

// 分类选项根据「支出/收入」切换
const options = computed(() => buildCategoryOptions(props.categories[form.type] || []))

// 切换收支类型时，清空已选分类
watch(
  () => form.type,
  () => {
    form.categoryPath = []
  }
)

const saving = ref(false)

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

async function submit() {
  if (!form.amount || form.amount <= 0) {
    ElMessage.warning('请输入金额')
    return
  }
  if (form.categoryPath.length !== 2) {
    ElMessage.warning('请选择分类')
    return
  }

  const payload = {
    type: form.type,
    amount: Math.round(form.amount * 100) / 100,
    category: form.categoryPath[0],
    subcategory: form.categoryPath[1],
    date: form.date,
    note: (form.note || '').trim()
  }

  saving.value = true
  try {
    if (props.initial) {
      await window.api.updateRecord({
        ...payload,
        id: props.initial.id,
        createdAt: props.initial.createdAt
      })
      ElMessage.success('已保存 ✓')
    } else {
      await window.api.addRecord({
        ...payload,
        id: genId(),
        createdAt: Date.now()
      })
      ElMessage.success('已记账 ✓')
    }
    emit('submit')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-form :model="form" label-position="top" @submit.prevent>
    <el-form-item label="类型">
      <el-radio-group v-model="form.type" class="type-toggle">
        <el-radio-button value="expense">支出</el-radio-button>
        <el-radio-button value="income">收入</el-radio-button>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="金额（元）" required>
      <el-input-number
        v-model="form.amount"
        :min="0.01"
        :precision="2"
        :step="1"
        :controls="false"
        placeholder="0.00"
        class="amount-input"
      />
    </el-form-item>

    <el-form-item label="分类" required>
      <el-cascader
        v-model="form.categoryPath"
        :options="options"
        :props="{ expandTrigger: 'hover' }"
        :placeholder="form.type === 'expense' ? '选支出分类' : '选收入分类'"
        clearable
        style="width: 100%"
      />
    </el-form-item>

    <el-form-item label="日期">
      <el-date-picker
        v-model="form.date"
        type="date"
        value-format="YYYY-MM-DD"
        style="width: 100%"
      />
    </el-form-item>

    <el-form-item label="备注（选填）">
      <el-input v-model="form.note" maxlength="50" placeholder="比如：和同事聚餐" />
    </el-form-item>

    <div class="form-actions">
      <el-button @click="emit('cancel')">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
    </div>
  </el-form>
</template>

<style scoped>
.type-toggle {
  width: 100%;
}

.type-toggle :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 10px 0;
}

.type-toggle :deep(.el-radio-group) {
  display: flex;
  width: 100%;
}

.type-toggle :deep(.el-radio-button) {
  flex: 1;
}

.amount-input {
  width: 100%;
}

.amount-input :deep(.el-input__inner) {
  font-size: 22px;
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}
</style>
