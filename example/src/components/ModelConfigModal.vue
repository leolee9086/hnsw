<template>
  <div 
    class="modal fade" 
    id="modelConfigModal" 
    tabindex="-1" 
    aria-labelledby="modelConfigModalLabel" 
    data-bs-backdrop="static" 
    data-bs-keyboard="false"
    :inert="!isVisible"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="modelConfigModalLabel">
            <i class="bi bi-gear me-2"></i>
            模型配置管理
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <!-- 导航标签 -->
          <ul class="nav nav-tabs mb-3" id="configTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link active" 
                id="provider-tab" 
                data-bs-toggle="tab" 
                data-bs-target="#provider-panel" 
                type="button" 
                role="tab"
              >
                <i class="bi bi-cloud me-1"></i>
                供应商配置
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link" 
                id="chat-model-tab" 
                data-bs-toggle="tab" 
                data-bs-target="#chat-model-panel" 
                type="button" 
                role="tab"
              >
                <i class="bi bi-chat me-1"></i>
                聊天模型
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link" 
                id="embedding-model-tab" 
                data-bs-toggle="tab" 
                data-bs-target="#embedding-model-panel" 
                type="button" 
                role="tab"
              >
                <i class="bi bi-cpu me-1"></i>
                嵌入模型
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link" 
                id="data-tab" 
                data-bs-toggle="tab" 
                data-bs-target="#data-panel" 
                type="button" 
                role="tab"
              >
                <i class="bi bi-database me-1"></i>
                数据管理
              </button>
            </li>
          </ul>

          <!-- 标签内容 -->
          <div class="tab-content" id="configTabContent">
            <!-- 供应商配置面板 -->
            <div class="tab-pane fade show active" id="provider-panel" role="tabpanel">
              <ProviderConfigPanel @config-changed="handleConfigChanged" />
            </div>

            <!-- 聊天模型管理面板 -->
            <div class="tab-pane fade" id="chat-model-panel" role="tabpanel">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">聊天模型管理</h6>
                <div>
                  <button 
                    class="btn btn-primary btn-sm me-2" 
                    @click="showAddModelModal('chat')"
                  >
                    <i class="bi bi-plus me-1"></i>
                    添加聊天模型
                  </button>
                  <span class="badge bg-primary">{{ chatModelCount }}</span>
                </div>
              </div>
              
              <div class="list-group">
                <div 
                  v-for="model in chatModels" 
                  :key="model.id"
                  class="list-group-item"
                >
                  <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                      <div class="d-flex align-items-center mb-1">
                        <strong class="me-2">{{ model.name }}</strong>
                        <span class="badge bg-outline-primary">聊天</span>
                      </div>
                      <div class="text-muted small mb-1">
                        <i class="bi bi-cloud me-1"></i>
                        {{ model.providerName }}
                      </div>
                      <div class="text-muted small mb-1">
                        <i class="bi bi-key me-1"></i>
                        {{ model.tokenName }}
                      </div>
                      <code class="small text-primary">{{ model.modelName }}</code>
                    </div>
                    <div class="btn-group btn-group-sm">
                      <button 
                        class="btn btn-outline-secondary btn-sm" 
                        @click="editModel(model)"
                        title="编辑模型"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button 
                        class="btn btn-outline-danger btn-sm" 
                        @click="deleteModel(model)"
                        title="删除模型"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="chatModels.length === 0" class="list-group-item text-center text-muted">
                  <i class="bi bi-info-circle me-1"></i>
                  暂无聊天模型，点击"添加聊天模型"按钮创建
                </div>
              </div>
            </div>

            <!-- 嵌入模型管理面板 -->
            <div class="tab-pane fade" id="embedding-model-panel" role="tabpanel">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">嵌入模型管理</h6>
                <div>
                  <button 
                    class="btn btn-success btn-sm me-2" 
                    @click="showAddModelModal('embedding')"
                  >
                    <i class="bi bi-plus me-1"></i>
                    添加嵌入模型
                  </button>
                  <span class="badge bg-success">{{ embeddingModelCount }}</span>
                </div>
              </div>
              
              <div class="list-group">
                <div 
                  v-for="model in embeddingModels" 
                  :key="model.id"
                  class="list-group-item"
                >
                  <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                      <div class="d-flex align-items-center mb-1">
                        <strong class="me-2">{{ model.name }}</strong>
                        <span class="badge bg-outline-success">嵌入</span>
                      </div>
                      <div class="text-muted small mb-1">
                        <i class="bi bi-cloud me-1"></i>
                        {{ model.providerName }}
                      </div>
                      <div class="text-muted small mb-1">
                        <i class="bi bi-key me-1"></i>
                        {{ model.tokenName }}
                      </div>
                      <code class="small text-success">{{ model.modelName }}</code>
                    </div>
                    <div class="btn-group btn-group-sm">
                      <button 
                        class="btn btn-outline-secondary btn-sm" 
                        @click="editModel(model)"
                        title="编辑模型"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button 
                        class="btn btn-outline-danger btn-sm" 
                        @click="deleteModel(model)"
                        title="删除模型"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="embeddingModels.length === 0" class="list-group-item text-center text-muted">
                  <i class="bi bi-info-circle me-1"></i>
                  暂无嵌入模型，点击"添加嵌入模型"按钮创建
                </div>
              </div>
            </div>

            <!-- 数据管理面板 -->
            <div class="tab-pane fade" id="data-panel" role="tabpanel">
              <h6 class="mb-3">配置数据管理</h6>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <h6 class="mb-0">数据操作</h6>
                    </div>
                    <div class="card-body">
                      <div class="d-grid gap-2">
                        <button class="btn btn-outline-primary btn-sm" @click="exportConfig">
                          <i class="bi bi-download me-1"></i>
                          导出配置
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" @click="importConfig">
                          <i class="bi bi-upload me-1"></i>
                          导入配置
                        </button>
                        <button class="btn btn-outline-danger btn-sm" @click="clearAllConfig">
                          <i class="bi bi-trash me-1"></i>
                          清空所有配置
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <h6 class="mb-0">统计信息</h6>
                    </div>
                    <div class="card-body">
                      <div class="mb-2">
                        <small class="text-muted">供应商: {{ providerCount }}</small>
                      </div>
                      <div class="mb-2">
                        <small class="text-muted">Token: {{ tokenCount }}</small>
                      </div>
                      <div class="mb-2">
                        <small class="text-muted">聊天模型: {{ chatModelCount }}</small>
                      </div>
                      <div class="mb-2">
                        <small class="text-muted">嵌入模型: {{ embeddingModelCount }}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 添加模型模态框 -->
  <div 
    class="modal fade" 
    id="addModelModal" 
    tabindex="-1" 
    aria-labelledby="addModelModalLabel" 
    data-bs-backdrop="static"
    :inert="!isAddModelModalVisible"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="addModelModalLabel">
            <i class="bi bi-plus-circle me-2"></i>
            添加{{ currentModelType === 'chat' ? '聊天' : '嵌入' }}模型
          </h5>
          <button type="button" class="btn-close" @click="closeAddModelModal"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="addModel">
            <div class="mb-3">
              <label for="modelName" class="form-label">模型名称</label>
              <input 
                type="text" 
                class="form-control" 
                id="modelName" 
                v-model="newModel.name"
                placeholder="输入模型名称"
                required
              />
            </div>
            
            <div class="mb-3">
              <label for="providerSelect" class="form-label">选择供应商</label>
              <select 
                class="form-select" 
                id="providerSelect" 
                v-model="newModel.providerId"
                required
              >
                <option value="">请选择供应商</option>
                <option 
                  v-for="provider in availableProviders" 
                  :key="provider.id" 
                  :value="provider.id"
                >
                  {{ provider.name }}
                </option>
              </select>
            </div>
            
            <div class="mb-3">
              <label for="tokenSelect" class="form-label">选择Token</label>
              <select 
                class="form-select" 
                id="tokenSelect" 
                v-model="newModel.tokenId"
                required
                :disabled="!newModel.providerId"
              >
                <option value="">请先选择供应商</option>
                <option 
                  v-for="token in availableTokens" 
                  :key="token.id" 
                  :value="token.id"
                >
                  {{ token.name }}
                </option>
              </select>
            </div>
            
            <div class="mb-3">
              <label for="modelType" class="form-label">模型类型</label>
              <input 
                type="text" 
                class="form-control" 
                id="modelType" 
                v-model="newModel.modelName"
                :placeholder="currentModelType === 'chat' ? '如: gpt-3.5-turbo' : '如: text-embedding-ada-002'"
                required
              />
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeAddModelModal">
            取消
          </button>
          <button type="button" class="btn btn-primary" @click="addModel">
            添加模型
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { modelConfigService, type ChatModelSelection, type EmbeddingModelSelection } from '../services/ModelConfigService';
import ProviderConfigPanel from './ProviderConfigPanel.vue';

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  modelSelected: [type: 'chat' | 'embedding', model: any];
}>();

// 响应式数据
const chatModels = ref<ChatModelSelection[]>([]);
const embeddingModels = ref<EmbeddingModelSelection[]>([]);
const isAddModelModalVisible = ref(false);
const currentModelType = ref<'chat' | 'embedding'>('chat');

// 新模型表单数据
const newModel = ref({
  name: '',
  providerId: '',
  tokenId: '',
  modelName: ''
});

// 计算属性
const providerCount = computed(() => modelConfigService.getProviders().length);
const tokenCount = computed(() => modelConfigService.getTokens().length);
const chatModelCount = computed(() => chatModels.value.length);
const embeddingModelCount = computed(() => embeddingModels.value.length);

// 可用的供应商和Token
const availableProviders = computed(() => modelConfigService.getProviders());
const availableTokens = computed(() => {
  if (!newModel.value.providerId) return [];
  return modelConfigService.getTokensByProvider(newModel.value.providerId);
});

// 初始化
const loadModels = () => {
  chatModels.value = modelConfigService.getChatModelSelections();
  embeddingModels.value = modelConfigService.getEmbeddingModelSelections();
};

const handleConfigChanged = () => {
  loadModels();
};

// 模型管理方法
const editModel = (model: ChatModelSelection | EmbeddingModelSelection) => {
  console.log('编辑模型:', model);
  // TODO: 实现模型编辑功能
  alert('模型编辑功能开发中...');
};

const deleteModel = (model: ChatModelSelection | EmbeddingModelSelection) => {
  if (confirm(`确定要删除模型 "${model.name}" 吗？`)) {
    console.log('删除模型:', model);
    // TODO: 实现模型删除功能
    alert('模型删除功能开发中...');
  }
};

// 显示添加模型模态框
const showAddModelModal = (type: 'chat' | 'embedding') => {
  currentModelType.value = type;
  isAddModelModalVisible.value = true;
  // 重置表单
  newModel.value = {
    name: '',
    providerId: '',
    tokenId: '',
    modelName: ''
  };
  
  // 手动显示Bootstrap模态框
  nextTick(() => {
    const modalElement = document.getElementById('addModelModal');
    if (modalElement) {
      // @ts-ignore
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  });
};

// 关闭添加模型模态框
const closeAddModelModal = () => {
  isAddModelModalVisible.value = false;
  
  // 手动隐藏Bootstrap模态框
  const modalElement = document.getElementById('addModelModal');
  if (modalElement) {
    // @ts-ignore
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }
  }
};

// 添加模型
const addModel = () => {
  if (!newModel.value.name || !newModel.value.providerId || !newModel.value.tokenId || !newModel.value.modelName) {
    alert('请填写所有必填字段');
    return;
  }
  
  try {
    // 使用现有的saveModel方法
    const modelConfig = {
      id: modelConfigService.generateId(),
      tokenId: newModel.value.tokenId,
      name: newModel.value.name,
      type: currentModelType.value as 'chat' | 'embedding',
      modelName: newModel.value.modelName,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    modelConfigService.saveModel(modelConfig);
    
    // 重新加载模型列表
    loadModels();
    
    // 关闭模态框
    closeAddModelModal();
    
    alert('模型添加成功！');
  } catch (error) {
    console.error('添加模型失败:', error);
    alert('添加模型失败: ' + (error as Error).message);
  }
};

// 数据管理方法
const exportConfig = () => {
  const data = modelConfigService.exportConfig();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `model-config-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const importConfig = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = modelConfigService.importConfig(e.target?.result as string);
        if (result.success) {
          alert('配置导入成功');
          loadModels();
        } else {
          alert('配置导入失败: ' + result.message);
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};

const clearAllConfig = () => {
  if (confirm('确定要清空所有配置吗？此操作不可恢复！')) {
    modelConfigService.clearAllConfig();
    loadModels();
    alert('所有配置已清空');
  }
};

// 初始化
onMounted(() => {
  loadModels();
});
</script>

<style scoped>
.nav-tabs .nav-link {
  color: var(--bs-secondary);
}

.nav-tabs .nav-link.active {
  color: var(--bs-primary);
}

code {
  font-size: 0.75rem;
  background-color: var(--bs-light);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

.list-group-item {
  border-left: none;
  border-right: none;
}

.list-group-item:first-child {
  border-top: none;
}

.list-group-item:last-child {
  border-bottom: none;
}
</style> 