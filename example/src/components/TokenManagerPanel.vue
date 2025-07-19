<template>
  <div class="token-manager-panel">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6>Token 管理</h6>
      <button class="btn btn-primary btn-sm" @click="showAddTokenForm = true">
        <i class="bi bi-plus me-1"></i>
        添加 Token
      </button>
    </div>

    <!-- Token列表 -->
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>名称</th>
            <th>默认状态</th>
            <th>模型数量</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="token in tokens" :key="token.id">
            <td>{{ token.name }}</td>
            <td>
              <span 
                class="badge" 
                :class="token.isDefault ? 'bg-success' : 'bg-secondary'"
              >
                {{ token.isDefault ? '默认' : '普通' }}
              </span>
            </td>
            <td>
              <span class="badge bg-info">{{ getModelCount(token.id) }}</span>
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button 
                  class="btn btn-outline-secondary" 
                  @click="editToken(token)"
                >
                  <i class="bi bi-pencil me-1"></i>
                  编辑
                </button>
                <button 
                  class="btn btn-outline-primary" 
                  @click="manageModels(token)"
                >
                  <i class="bi bi-cpu me-1"></i>
                  模型
                </button>
                <button 
                  class="btn btn-outline-danger" 
                  @click="deleteToken(token.id)"
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

    <!-- 添加/编辑Token表单 -->
    <div v-if="showAddTokenForm" class="card mt-3">
      <div class="card-header">
        <h6 class="mb-0">{{ editingToken ? '编辑' : '添加' }} Token</h6>
      </div>
      <div class="card-body">
        <form @submit.prevent="saveToken">
          <div class="row">
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">Token 名称</label>
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="tokenForm.name"
                  required
                >
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">API Key</label>
                <input 
                  type="password" 
                  class="form-control" 
                  v-model="tokenForm.apiKey"
                  required
                >
              </div>
            </div>
          </div>
          
          <div class="mb-3">
            <div class="form-check">
              <input 
                class="form-check-input" 
                type="checkbox" 
                v-model="tokenForm.isDefault"
                id="isDefaultToken"
              >
              <label class="form-check-label" for="isDefaultToken">
                设为默认 Token
              </label>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" @click="cancelTokenForm">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editingToken ? '更新' : '添加' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 模型管理模态框 -->
    <div v-if="showModelModal" class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title">{{ selectedToken?.name }} - 模型管理</h6>
            <button type="button" class="btn-close" @click="closeModelModal"></button>
          </div>
          <div class="modal-body">
            <ModelManagerPanel 
              :token-id="selectedToken?.id || ''"
              @close="closeModelModal"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { modelConfigService, type TokenConfig } from '../services/ModelConfigService';
import ModelManagerPanel from './ModelManagerPanel.vue';

const props = defineProps<{
  providerId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

// 响应式数据
const tokens = ref<TokenConfig[]>([]);
const showAddTokenForm = ref(false);
const editingToken = ref<TokenConfig | null>(null);
const showModelModal = ref(false);
const selectedToken = ref<TokenConfig | null>(null);

// 表单数据
const tokenForm = reactive({
  name: '',
  apiKey: '',
  isDefault: false
});

// 初始化
const loadTokens = () => {
  tokens.value = modelConfigService.getTokensByProvider(props.providerId);
};

// 工具方法
const getModelCount = (tokenId: string) => {
  return modelConfigService.getModelsByToken(tokenId).length;
};

// Token管理方法
const saveToken = () => {
  const token: TokenConfig = {
    id: editingToken.value?.id || modelConfigService.generateId(),
    providerId: props.providerId,
    name: tokenForm.name,
    apiKey: tokenForm.apiKey,
    isDefault: tokenForm.isDefault,
    createdAt: editingToken.value?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  
  modelConfigService.saveToken(token);
  loadTokens();
  cancelTokenForm();
};

const editToken = (token: TokenConfig) => {
  editingToken.value = token;
  Object.assign(tokenForm, {
    name: token.name,
    apiKey: token.apiKey,
    isDefault: token.isDefault
  });
  showAddTokenForm.value = true;
};

const deleteToken = (id: string) => {
  if (confirm('确定要删除这个Token吗？相关的模型配置也会被删除。')) {
    modelConfigService.deleteToken(id);
    loadTokens();
  }
};

const manageModels = (token: TokenConfig) => {
  selectedToken.value = token;
  showModelModal.value = true;
};

const cancelTokenForm = () => {
  showAddTokenForm.value = false;
  editingToken.value = null;
  Object.assign(tokenForm, {
    name: '',
    apiKey: '',
    isDefault: false
  });
};

const closeModelModal = () => {
  showModelModal.value = false;
  selectedToken.value = null;
  loadTokens();
};

// 暴露方法给父组件
defineExpose({
  loadTokens
});

// 初始化
loadTokens();
</script>

<style scoped>
.token-manager-panel {
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

.modal {
  z-index: 1056;
}
</style> 