<template>
  <div class="provider-config-panel">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6>供应商配置</h6>
      <button class="btn btn-primary btn-sm" @click="showAddProviderForm = true">
        <i class="bi bi-plus me-1"></i>
        添加供应商
      </button>
    </div>

    <!-- 供应商列表 -->
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>API端点</th>
            <th>Token数量</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="provider in providers" :key="provider.id">
            <td>{{ provider.name }}</td>
            <td>
              <span class="badge bg-secondary">{{ getProviderDisplayName(provider.type) }}</span>
            </td>
            <td>
              <small class="text-muted">{{ provider.apiEndpoint || '默认' }}</small>
            </td>
            <td>
              <span class="badge bg-info">{{ getTokenCount(provider.id) }}</span>
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button 
                  class="btn btn-outline-secondary" 
                  @click="editProvider(provider)"
                >
                  <i class="bi bi-pencil me-1"></i>
                  编辑
                </button>
                <button 
                  class="btn btn-outline-primary" 
                  @click="manageTokens(provider)"
                >
                  <i class="bi bi-key me-1"></i>
                  Token
                </button>
                <button 
                  class="btn btn-outline-danger" 
                  @click="deleteProvider(provider.id)"
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

    <!-- 添加/编辑供应商表单 -->
    <div v-if="showAddProviderForm" class="card mt-3">
      <div class="card-header">
        <h6 class="mb-0">{{ editingProvider ? '编辑' : '添加' }} 供应商</h6>
      </div>
      <div class="card-body">
        <form @submit.prevent="saveProvider">
          <div class="row">
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">供应商名称</label>
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="providerForm.name"
                  required
                >
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-3">
                <label class="form-label">供应商类型</label>
                <select class="form-select" v-model="providerForm.type" required>
                  <option value="google">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="azure">Azure OpenAI</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="mb-3">
            <label class="form-label">API 端点 (可选)</label>
            <input 
              type="url" 
              class="form-control" 
              v-model="providerForm.apiEndpoint"
              :placeholder="getDefaultEndpoint(providerForm.type)"
            >
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary" @click="cancelProviderForm">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editingProvider ? '更新' : '添加' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Token管理模态框 -->
    <div v-if="showTokenModal" class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h6 class="modal-title">{{ selectedProvider?.name }} - Token 管理</h6>
            <button type="button" class="btn-close" @click="closeTokenModal"></button>
          </div>
          <div class="modal-body">
            <TokenManagerPanel 
              :provider-id="selectedProvider?.id || ''"
              @close="closeTokenModal"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { modelConfigService, type ProviderConfig, type ProviderType } from '../services/ModelConfigService';
import TokenManagerPanel from './TokenManagerPanel.vue';

const emit = defineEmits<{
  configChanged: [];
}>();

// 响应式数据
const providers = ref<ProviderConfig[]>([]);
const showAddProviderForm = ref(false);
const editingProvider = ref<ProviderConfig | null>(null);
const showTokenModal = ref(false);
const selectedProvider = ref<ProviderConfig | null>(null);

// 表单数据
const providerForm = reactive({
  name: '',
  type: 'google' as ProviderType,
  apiEndpoint: ''
});

// 初始化
const loadProviders = () => {
  providers.value = modelConfigService.getProviders();
};

// 工具方法
const getProviderDisplayName = (type: ProviderType) => {
  return modelConfigService.getProviderDisplayName(type);
};

const getTokenCount = (providerId: string) => {
  return modelConfigService.getTokensByProvider(providerId).length;
};

const getDefaultEndpoint = (type: ProviderType) => {
  switch (type) {
    case 'openai': return 'https://api.openai.com/v1';
    case 'anthropic': return 'https://api.anthropic.com';
    case 'azure': return 'https://your-resource.openai.azure.com';
    default: return '';
  }
};

// 供应商管理方法
const saveProvider = () => {
  const provider: ProviderConfig = {
    id: editingProvider.value?.id || modelConfigService.generateId(),
    name: providerForm.name,
    type: providerForm.type,
    apiEndpoint: providerForm.apiEndpoint || undefined,
    createdAt: editingProvider.value?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  
  modelConfigService.saveProvider(provider);
  loadProviders();
  cancelProviderForm();
  emit('configChanged');
};

const editProvider = (provider: ProviderConfig) => {
  editingProvider.value = provider;
  Object.assign(providerForm, provider);
  showAddProviderForm.value = true;
};

const deleteProvider = (id: string) => {
  if (confirm('确定要删除这个供应商吗？相关的Token和模型配置也会被删除。')) {
    modelConfigService.deleteProvider(id);
    loadProviders();
    emit('configChanged');
  }
};

const manageTokens = (provider: ProviderConfig) => {
  selectedProvider.value = provider;
  showTokenModal.value = true;
};

const cancelProviderForm = () => {
  showAddProviderForm.value = false;
  editingProvider.value = null;
  Object.assign(providerForm, {
    name: '',
    type: 'google',
    apiEndpoint: ''
  });
};

const closeTokenModal = () => {
  showTokenModal.value = false;
  selectedProvider.value = null;
  loadProviders();
  emit('configChanged');
};

// 暴露方法给父组件
defineExpose({
  loadProviders
});

// 初始化
loadProviders();
</script>

<style scoped>
.provider-config-panel {
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
  z-index: 1055;
}
</style> 