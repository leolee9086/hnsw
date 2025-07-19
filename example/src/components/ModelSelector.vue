<template>
  <div class="model-selector">
    <div class="model-selector-header">
      <h6 class="mb-2">
        <i class="bi bi-cpu me-1"></i>
        选择聊天模型
      </h6>
      <small class="text-muted">可多选，每个模型将创建独立的对话流</small>
    </div>
    
    <div class="model-list">
      <div 
        v-for="model in availableModels" 
        :key="model.id"
        class="model-item"
        :class="{ 'selected': selectedModels.includes(model.id) }"
      >
        <div class="model-info">
          <div class="d-flex align-items-center mb-1">
            <input 
              type="checkbox" 
              :checked="selectedModels.includes(model.id)"
              @change="toggleModel(model.id)"
              class="form-check-input me-2"
            />
            <strong>{{ model.name }}</strong>
          </div>
          <div class="text-muted small mb-1">
            <i class="bi bi-cloud me-1"></i>
            {{ model.providerName }}
          </div>
          <div class="text-muted small">
            <i class="bi bi-key me-1"></i>
            {{ model.tokenName }}
          </div>
          <code class="small text-primary">{{ model.modelName }}</code>
        </div>
        <div class="model-status">
          <span class="badge bg-outline-primary">聊天</span>
        </div>
      </div>
      
      <div v-if="availableModels.length === 0" class="text-center text-muted py-3">
        <i class="bi bi-info-circle me-1"></i>
        暂无可用的聊天模型，请先在模型配置中添加
      </div>
    </div>
    
    <div class="model-selector-footer">
      <div class="d-flex justify-content-between align-items-center">
        <small class="text-muted">
          已选择 {{ selectedModels.length }} 个模型
        </small>
        <div class="d-flex gap-2">
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="showAddModelModal"
          >
            <i class="bi bi-plus-circle me-1"></i>
            添加模型
          </button>
          <button 
            class="btn btn-primary btn-sm"
            @click="startChat"
            :disabled="selectedModels.length === 0"
          >
            <i class="bi bi-chat me-1"></i>
            开始对话
          </button>
        </div>
      </div>
    </div>

    <!-- 添加模型弹窗 -->
    <div v-if="isAddModelModalVisible" class="modal-backdrop-custom">
      <div class="modal-dialog-custom">
        <div class="modal-content-custom">
          <div class="modal-header-custom">
            <h5 class="modal-title">添加新模型</h5>
            <button type="button" class="btn-close" @click="closeAddModelModal"></button>
          </div>
          <div class="modal-body-custom">
            <form @submit.prevent="addModel">
              <div class="mb-2">
                <label class="form-label">模型名称</label>
                <input v-model="addModelForm.name" class="form-control" required maxlength="32" />
              </div>
              <div class="mb-2">
                <label class="form-label">供应商</label>
                <select v-model="addModelForm.providerId" class="form-select" required>
                  <option value="" disabled>请选择供应商</option>
                  <option v-for="provider in providers" :key="provider.id" :value="provider.id">
                    {{ provider.name }}
                  </option>
                </select>
              </div>
              <div class="mb-2">
                <label class="form-label">Token</label>
                <select v-model="addModelForm.tokenId" class="form-select" required :disabled="!addModelForm.providerId">
                  <option value="" disabled>请选择Token</option>
                  <option v-for="token in tokensForSelectedProvider" :key="token.id" :value="token.id">
                    {{ token.name }}
                  </option>
                </select>
              </div>
              <div class="mb-2">
                <label class="form-label">模型类型</label>
                <select v-model="addModelForm.type" class="form-select" required>
                  <option value="chat">聊天模型</option>
                  <option value="embedding">嵌入模型</option>
                </select>
              </div>
              <div class="mb-2">
                <label class="form-label">模型ID</label>
                <input v-model="addModelForm.modelName" class="form-control" required maxlength="64" placeholder="如 gpt-3.5-turbo" list="modelNameList" />
                <datalist id="modelNameList">
                  <option v-for="modelId in usedModelIds" :key="modelId" :value="modelId"></option>
                </datalist>
              </div>
              <div class="d-flex justify-content-end gap-2 mt-3">
                <button type="button" class="btn btn-secondary btn-sm" @click="closeAddModelModal">取消</button>
                <button type="submit" class="btn btn-primary btn-sm">保存</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { modelConfigService, type ChatModelSelection, type ProviderConfig, type TokenConfig, type ModelType } from '../services/ModelConfigService';

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  startChat: [models: ChatModelSelection[]];
}>();

// 响应式数据
const selectedModels = ref<string[]>([]);
const isAddModelModalVisible = ref(false);
const addModelForm = ref({
  name: '',
  providerId: '',
  tokenId: '',
  type: 'chat' as ModelType,
  modelName: ''
});

// 计算属性
const availableModels = computed(() => modelConfigService.getChatModelSelections());
const providers = computed<ProviderConfig[]>(() => modelConfigService.getProviders());
const tokensForSelectedProvider = computed<TokenConfig[]>(() => {
  if (!addModelForm.value.providerId) return [];
  return modelConfigService.getTokensByProvider(addModelForm.value.providerId);
});
const usedModelIds = computed(() => {
  const models = modelConfigService.getModels();
  return [...new Set(models.map(m => m.modelName))];
});

// 切换模型选择
const toggleModel = (modelId: string) => {
  const index = selectedModels.value.indexOf(modelId);
  if (index > -1) {
    selectedModels.value.splice(index, 1);
  } else {
    selectedModels.value.push(modelId);
  }
};

// 开始聊天
const startChat = () => {
  const selectedModelObjects = availableModels.value.filter(model => 
    selectedModels.value.includes(model.id)
  );
  emit('startChat', selectedModelObjects);
};

// 显示/关闭添加模型弹窗
const showAddModelModal = () => {
  addModelForm.value = {
    name: '',
    providerId: '',
    tokenId: '',
    type: 'chat',
    modelName: ''
  };
  isAddModelModalVisible.value = true;
};
const closeAddModelModal = () => {
  isAddModelModalVisible.value = false;
};

// 添加模型
const addModel = () => {
  if (!addModelForm.value.name || !addModelForm.value.providerId || !addModelForm.value.tokenId || !addModelForm.value.modelName) return;
  modelConfigService.saveModel({
    id: modelConfigService.generateId(),
    tokenId: addModelForm.value.tokenId,
    name: addModelForm.value.name,
    type: addModelForm.value.type,
    modelName: addModelForm.value.modelName,
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  isAddModelModalVisible.value = false;
};
</script>

<style scoped>
.model-selector {
  padding: 1rem;
  background: var(--bs-body-bg);
  border-radius: 0.375rem;
  border: 1px solid var(--bs-border-color);
}

.model-selector-header {
  margin-bottom: 1rem;
}

.model-list {
  max-height: 300px;
  overflow-y: auto;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.model-item:hover {
  background-color: var(--bs-light);
  border-color: var(--bs-primary);
}

.model-item.selected {
  background-color: var(--bs-primary-bg-subtle);
  border-color: var(--bs-primary);
}

.model-info {
  flex: 1;
}

.model-status {
  margin-left: 0.5rem;
}

.model-selector-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--bs-border-color);
}

/* 简易自定义弹窗样式 */
.modal-backdrop-custom {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.2);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-dialog-custom {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 32px rgba(0,0,0,0.15);
  min-width: 340px;
  max-width: 95vw;
}
.modal-content-custom {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
}
.modal-header-custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  margin-bottom: 1rem;
}
.modal-body-custom {
  padding: 0;
}
</style> 