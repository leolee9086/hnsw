<template>
  <div class="model-manager-panel">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6>模型管理</h6>
      <button class="btn btn-primary btn-sm" @click="showAddModelForm = true">
        <i class="bi bi-plus me-1"></i>
        添加模型
      </button>
    </div>

    <!-- 模型列表 -->
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>模型名称</th>
            <th>默认状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="model in models" :key="model.id">
            <td>{{ model.name }}</td>
            <td>
              <span 
                class="badge" 
                :class="model.type === 'chat' ? 'bg-primary' : 'bg-success'"
              >
                {{ model.type === 'chat' ? '聊天' : '嵌入' }}
              </span>
            </td>
            <td>
              <code>{{ model.modelName }}</code>
            </td>
            <td>
              <span 
                class="badge" 
                :class="model.isDefault ? 'bg-success' : 'bg-secondary'"
              >
                {{ model.isDefault ? '默认' : '普通' }}
              </span>
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button 
                  class="btn btn-outline-secondary" 
                  @click="editModel(model)"
                >
                  <i class="bi bi-pencil me-1"></i>
                  编辑
                </button>
                <button 
                  class="btn btn-outline-danger" 
                  @click="deleteModel(model.id)"
                >
                  <i class="bi bi-trash me-1"></i>
                  删除
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 添加/编辑模型表单 -->
    <div v-if="showAddModelForm" class="card mt-3">
      <div class="card-header">
        <h6 class="mb-0">{{ editingModel ? '编辑' : '添加' }} 模型</h6>
      </div>
      <div class="card-body">
        <form @submit.prevent="saveModel">
          <div class="row">
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">模型名称</label>
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="modelForm.name"
                  required
                >
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">模型类型</label>
                <select class="form-select" v-model="modelForm.type" required>
                  <option value="chat">聊天模型</option>
                  <option value="embedding">嵌入模型</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="mb-3">
            <label class="form-label">模型标识符</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="modelForm.modelName"
              :placeholder="getDefaultModelName(modelForm.type)"
              required
            >
            <div class="form-text">
              输入模型的具体标识符，如 gpt-3.5-turbo、text-embedding-ada-002 等
            </div>
          </div>

          <div class="mb-3">
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                v-model="modelForm.isDefault"
                id="isDefaultModel"
              >
              <label class="form-check-label" for="isDefaultModel">
                设为默认 {{ modelForm.type === 'chat' ? '聊天' : '嵌入' }} 模型
              </label>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" @click="cancelModelForm">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editingModel ? '更新' : '添加' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { modelConfigService, type ModelConfig, type ModelType } from '../services/ModelConfigService';

const props = defineProps<{
  tokenId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

// 响应式数据
const models = ref<ModelConfig[]>([]);
const showAddModelForm = ref(false);
const editingModel = ref<ModelConfig | null>(null);

// 表单数据
const modelForm = reactive({
  name: '',
  type: 'chat' as ModelType,
  modelName: '',
  isDefault: false
});

// 初始化
const loadModels = () => {
  models.value = modelConfigService.getModelsByToken(props.tokenId);
};

// 工具方法
const getDefaultModelName = (type: ModelType) => {
  // 这里可以根据Token的供应商类型来提供默认模型名
  // 暂时返回通用默认值
  return type === 'chat' ? 'gpt-3.5-turbo' : 'text-embedding-ada-002';
};

// 模型管理方法
const saveModel = () => {
  const model: ModelConfig = {
    id: editingModel.value?.id || modelConfigService.generateId(),
    tokenId: props.tokenId,
    name: modelForm.name,
    type: modelForm.type,
    modelName: modelForm.modelName,
    isDefault: modelForm.isDefault,
    createdAt: editingModel.value?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  
  modelConfigService.saveModel(model);
  loadModels();
  cancelModelForm();
};

const editModel = (model: ModelConfig) => {
  editingModel.value = model;
  Object.assign(modelForm, {
    name: model.name,
    type: model.type,
    modelName: model.modelName,
    isDefault: model.isDefault
  });
  showAddModelForm.value = true;
};

const deleteModel = (id: string) => {
  if (confirm('确定要删除这个模型吗？')) {
    modelConfigService.deleteModel(id);
    loadModels();
  }
};

const cancelModelForm = () => {
  showAddModelForm.value = false;
  editingModel.value = null;
  Object.assign(modelForm, {
    name: '',
    type: 'chat',
    modelName: '',
    isDefault: false
  });
};

// 暴露方法给父组件
defineExpose({
  loadModels
});

// 初始化
loadModels();
</script>

<style scoped>
.model-manager-panel {
  height: 100%;
  overflow-y: auto;
}

.table th {
  font-size: 0.875rem;
  font-weight: 600;
}

.btn-group-sm .btn {
  font-size: 0.75rem;
}

code {
  font-size: 0.875rem;
  background-color: var(--bs-light);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
</style> 