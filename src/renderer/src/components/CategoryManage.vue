<script setup>
import { reactive, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EMOJIS } from '../categories'

const props = defineProps({
  categories: { type: Object, default: () => ({ expense: [], income: [] }) }
})

const emit = defineEmits(['changed'])

const group = ref('expense') // 'expense' 支出 / 'income' 收入

// 当前显示的这组分类
const currentList = computed(() => props.categories[group.value] || [])

// 新增 / 修改一级分类 的对话框状态
const dialogVisible = ref(false)
const mode = ref('add') // 'add' | 'edit'
const form = reactive({ name: '', emoji: '' })
const editOldName = ref('')

// 每个大类下面「新增小类」的输入框
const newChildren = reactive({})

function openAdd() {
  mode.value = 'add'
  form.name = ''
  form.emoji = ''
  dialogVisible.value = true
}

function openEdit(cat) {
  mode.value = 'edit'
  editOldName.value = cat.name
  form.name = cat.name
  form.emoji = cat.emoji
  dialogVisible.value = true
}

async function reload() {
  emit('changed')
}

function showApiError(res) {
  const map = {
    empty: '名称不能为空',
    duplicate: '已经存在同名的分类了',
    tooLong: '名称不能超过 10 个字',
    notFound: '没有找到这个分类',
    inUse: `这个分类下还有 ${res.count || 0} 笔记录，请先处理这些记录再删除`
  }
  ElMessage.warning(map[res.reason] || '操作失败，请重试')
}

async function confirm() {
  const name = form.name.trim()
  const emoji = form.emoji || '📦'
  if (!name) {
    ElMessage.warning('请输入分类名称')
    return
  }

  if (mode.value === 'add') {
    const res = await window.api.addCategory({ group: group.value, name, emoji })
    if (res.ok) {
      ElMessage.success('已新增分类 ✓')
      dialogVisible.value = false
      reload()
    } else {
      showApiError(res)
    }
  } else {
    const res = await window.api.updateCategory({
      group: group.value,
      oldName: editOldName.value,
      name,
      emoji
    })
    if (res.ok) {
      ElMessage.success('已保存 ✓')
      dialogVisible.value = false
      reload()
    } else {
      showApiError(res)
    }
  }
}

async function removeCategory(cat) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${cat.emoji} ${cat.name}」这个分类吗？\n（它下面的小类也会一起删除）`,
      '删除分类',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '再想想' }
    )
  } catch {
    return
  }
  const res = await window.api.deleteCategory({ group: group.value, name: cat.name })
  if (res.ok) {
    ElMessage.success('已删除 ✓')
    reload()
  } else {
    showApiError(res)
  }
}

async function addChild(cat) {
  const child = (newChildren[cat.name] || '').trim()
  if (!child) {
    ElMessage.warning('请输入小类名称')
    return
  }
  const res = await window.api.addChild({
    group: group.value,
    category: cat.name,
    child
  })
  if (res.ok) {
    newChildren[cat.name] = ''
    ElMessage.success(`已添加「${child}」 ✓`)
    reload()
  } else {
    showApiError(res)
  }
}

async function renameChild(cat, child) {
  try {
    const { value } = await ElMessageBox.prompt(
      `把「${child}」改成什么？`,
      '修改小类',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValue: child,
        inputValidator: (v) => (v && v.trim() ? true : '名称不能为空')
      }
    )
    const res = await window.api.renameChild({
      group: group.value,
      category: cat.name,
      oldChild: child,
      newChild: value.trim()
    })
    if (res.ok) {
      ElMessage.success('已保存 ✓')
      reload()
    } else {
      showApiError(res)
    }
  } catch {
    // 用户取消
  }
}

async function removeChild(cat, child) {
  try {
    await ElMessageBox.confirm(`确定删除小类「${child}」吗？`, '删除小类', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '再想想'
    })
  } catch {
    return
  }
  const res = await window.api.deleteChild({
    group: group.value,
    category: cat.name,
    child
  })
  if (res.ok) {
    ElMessage.success('已删除 ✓')
    reload()
  } else {
    showApiError(res)
  }
}
</script>

<template>
  <div class="cat-manage">
    <div class="cat-manage-header">
      <span class="cat-manage-title">分类管理</span>
      <el-button type="primary" size="small" @click="openAdd">＋ 新增一级分类</el-button>
    </div>

    <el-radio-group v-model="group" class="group-toggle" size="small">
      <el-radio-button value="expense">支出分类</el-radio-button>
      <el-radio-button value="income">收入分类</el-radio-button>
    </el-radio-group>

    <p class="cat-manage-tip">提示：分类下有记账记录时不能删除；改名后，已记的账会自动跟着变。</p>

    <div v-if="!currentList.length" class="cat-empty">这个分组下还没有分类</div>

    <div v-for="cat in currentList" :key="cat.name" class="cat-card">
      <div class="cat-head">
        <span class="cat-emoji">{{ cat.emoji }}</span>
        <span class="cat-name">{{ cat.name }}</span>
        <div class="cat-actions">
          <el-button link size="small" @click="openEdit(cat)">改名 / 换图标</el-button>
          <el-button link type="danger" size="small" @click="removeCategory(cat)">删除</el-button>
        </div>
      </div>

      <div class="cat-children">
        <el-tag
          v-for="child in cat.children"
          :key="child"
          class="child-tag"
          closable
          @click="renameChild(cat, child)"
          @close="removeChild(cat, child)"
        >
          {{ child }}
        </el-tag>
        <span v-if="!cat.children.length" class="no-child">暂无小类，在下面添加</span>

        <div class="add-child">
          <el-input
            v-model="newChildren[cat.name]"
            size="small"
            placeholder="输入小类名称，回车添加"
            @keyup.enter="addChild(cat)"
          />
          <el-button size="small" type="primary" plain @click="addChild(cat)">添加</el-button>
        </div>
      </div>
    </div>

    <!-- 新增 / 修改一级分类 -->
    <el-dialog
      v-model="dialogVisible"
      :title="mode === 'add' ? '新增一级分类' : '修改分类'"
      width="380px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <p class="emoji-label">选择图标</p>
      <div class="emoji-grid">
        <div
          v-for="e in EMOJIS"
          :key="e"
          class="emoji-opt"
          :class="{ selected: form.emoji === e }"
          @click="form.emoji = e"
        >
          {{ e }}
        </div>
      </div>
      <el-input v-model="form.name" placeholder="分类名称，比如：宠物" maxlength="10" />
      <div class="dialog-actions">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirm">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.cat-manage {
  max-height: 60vh;
  overflow-y: auto;
}

.cat-manage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cat-manage-title {
  font-size: 16px;
  font-weight: 700;
}

.group-toggle {
  margin-bottom: 10px;
}

.cat-manage-tip {
  font-size: 12px;
  color: #8a919f;
  margin: 0 0 14px;
}

.cat-empty {
  text-align: center;
  color: #8a919f;
  padding: 30px 0;
}

.cat-card {
  border: 1px solid #eef0f2;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.cat-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.cat-emoji {
  font-size: 18px;
}

.cat-name {
  font-size: 15px;
  font-weight: 600;
}

.cat-actions {
  margin-left: auto;
  display: flex;
  gap: 2px;
}

.cat-children {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.child-tag {
  cursor: pointer;
}

.no-child {
  font-size: 12px;
  color: #b0b6bf;
}

.add-child {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
}

.add-child .el-input {
  flex: 1;
}

.emoji-label {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 8px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
  margin-bottom: 16px;
}

.emoji-opt {
  font-size: 20px;
  text-align: center;
  padding: 6px 0;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.12s;
}

.emoji-opt:hover {
  background: #f5f6f8;
}

.emoji-opt.selected {
  background: #fff4ef;
  border-color: #f0643a;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
</style>
