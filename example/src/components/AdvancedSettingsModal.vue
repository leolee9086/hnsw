<template>
  <div 
    class="modal fade" 
    id="advancedSettingsModal" 
    tabindex="-1" 
    aria-labelledby="advancedSettingsModalLabel" 
    data-bs-backdrop="static" 
    data-bs-keyboard="false"
    :inert="!isVisible"
  >
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="advancedSettingsModalLabel">
            <i class="bi bi-gear me-2"></i>
            高级设置
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <!-- 导航标签 -->
          <ul class="nav nav-tabs mb-3" id="settingsTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link active" 
                id="api-tab" 
                data-bs-toggle="tab" 
                data-bs-target="#api-panel" 
                type="button" 
                role="tab"
              >
                <i class="bi bi-cloud me-1"></i>
                API 配置
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link" 
                id="app-tab" 
                data-bs-toggle="tab" 
                data-bs-target="#app-panel" 
                type="button" 
                role="tab"
              >
                <i class="bi bi-sliders me-1"></i>
                应用设置
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
          <div class="tab-content" id="settingsTabContent">
            <!-- API 配置面板 -->
            <div class="tab-pane fade show active" id="api-panel" role="tabpanel">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6>API 供应商配置</h6>
                <button class="btn btn-primary btn-sm" @click="showAddAPIForm = true">
                  <i class="bi bi-plus me-1"></i>
                  添加 API
                </button>
              </div>

              <!-- API 配置列表 -->
              <div class="table-responsive">
                <table class="table table-sm">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>供应商</th>
                      <th>状态</th>
                      <th>默认</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="config in apiConfigs" :key="config.name">
                      <td>{{ config.name }}</td>
                      <td>
                        <span class="badge bg-secondary">{{ config.provider }}</span>
                      </td>
                      <td>
                        <span 
                          class="badge" 
                          :class="config.status === 'connected' ? 'bg-success' : 'bg-danger'"
                        >
                          {{ config.status === 'connected' ? '已连接' : '未连接' }}
                        </span>
                      </td>
                      <td>
                        <div class="form-check">
                          <input 
                            class="form-check-input" 
                            type="radio" 
                            :name="'default-api'" 
                            :id="'default-' + config.name"
                            :checked="config.isDefault"
                            @change="setDefaultAPI(config.name)"
                          >
                        </div>
                      </td>
                      <td>
                        <div class="btn-group btn-group-sm">
                          <button 
                            class="btn btn-outline-primary" 
                            @click="testAPI(config)"
                            :disabled="config.testing"
                          >
                            <span v-if="config.testing" class="spinner-border spinner-border-sm me-1"></span>
                            <i v-else class="bi bi-connection me-1"></i>
                            测试
                          </button>
                          <button 
                            class="btn btn-outline-secondary" 
                            @click="editAPI(config)"
                          >
                            <i class="bi bi-pencil me-1"></i>
                            编辑
                          </button>
                          <button 
                            class="btn btn-outline-danger" 
                            @click="deleteAPI(config.name)"
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

              <!-- 添加/编辑 API 表单 -->
              <div v-if="showAddAPIForm" class="card mt-3">
                <div class="card-header">
                  <h6 class="mb-0">{{ editingAPI ? '编辑' : '添加' }} API 配置</h6>
                </div>
                <div class="card-body">
                  <form @submit.prevent="saveAPIConfig">
                    <div class="row">
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">配置名称</label>
                          <input 
                            type="text" 
                            class="form-control" 
                            v-model="apiForm.name"
                            required
                          >
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">API 供应商</label>
                          <select class="form-select" v-model="apiForm.provider" required>
                            <option value="google">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic Claude</option>
                            <option value="azure">Azure OpenAI</option>
                            <option value="custom">自定义</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div class="row">
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">API Key</label>
                          <input 
                            type="password" 
                            class="form-control" 
                            v-model="apiForm.apiKey"
                            required
                          >
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">API 端点 (可选)</label>
                          <input 
                            type="url" 
                            class="form-control" 
                            v-model="apiForm.apiEndpoint"
                            placeholder="https://api.openai.com/v1"
                          >
                        </div>
                      </div>
                    </div>

                    <div class="row">
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">聊天模型</label>
                          <input 
                            type="text" 
                            class="form-control" 
                            v-model="apiForm.chatModel"
                            :placeholder="getDefaultChatModel(apiForm.provider)"
                          >
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="mb-3">
                          <label class="form-label">嵌入模型</label>
                          <input 
                            type="text" 
                            class="form-control" 
                            v-model="apiForm.embeddingModel"
                            :placeholder="getDefaultEmbeddingModel(apiForm.provider)"
                          >
                        </div>
                      </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2">
                      <button type="button" class="btn btn-secondary" @click="cancelAPIForm">
                        取消
                      </button>
                      <button type="submit" class="btn btn-primary">
                        {{ editingAPI ? '更新' : '添加' }}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <!-- 应用设置面板 -->
            <div class="tab-pane fade" id="app-panel" role="tabpanel">
              <h6 class="mb-3">应用设置</h6>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">主题</label>
                    <select class="form-select" v-model="appSettings.theme">
                      <option value="light">浅色</option>
                      <option value="dark">深色</option>
                      <option value="auto">自动</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">语言</label>
                    <select class="form-select" v-model="appSettings.language">
                      <option value="zh">中文</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">默认嵌入模型</label>
                    <select class="form-select" v-model="appSettings.embeddingModel">
                      <option value="Xenova/all-MiniLM-L6-v2">all-MiniLM-L6-v2 (轻量级)</option>
                      <option value="Xenova/all-mpnet-base-v2">all-mpnet-base-v2 (高质量)</option>
                      <option value="Xenova/paraphrase-multilingual-MiniLM-L12-v2">multilingual-MiniLM (多语言)</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">历史记录限制</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      v-model="appSettings.maxHistory"
                      min="10"
                      max="200"
                    >
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <div class="form-check">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    v-model="appSettings.autoSave"
                    id="autoSave"
                  >
                  <label class="form-check-label" for="autoSave">
                    自动保存聊天历史
                  </label>
                </div>
              </div>

              <div class="d-flex justify-content-end">
                <button class="btn btn-primary" @click="saveAppSettings">
                  保存设置
                </button>
              </div>
            </div>

            <!-- 数据管理面板 -->
            <div class="tab-pane fade" id="data-panel" role="tabpanel">
              <h6 class="mb-3">数据管理</h6>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <h6 class="mb-0">存储信息</h6>
                    </div>
                    <div class="card-body">
                      <div class="mb-2">
                        <small class="text-muted">已使用: {{ formatBytes(storageInfo.used) }}</small>
                      </div>
                      <div class="mb-2">
                        <small class="text-muted">总容量: {{ formatBytes(storageInfo.total) }}</small>
                      </div>
                      <div class="progress mb-2" style="height: 6px;">
                        <div 
                          class="progress-bar" 
                          :class="storageInfo.percentage > 80 ? 'bg-danger' : 'bg-success'"
                          :style="{ width: storageInfo.percentage + '%' }"
                        ></div>
                      </div>
                      <small class="text-muted">使用率: {{ storageInfo.percentage.toFixed(1) }}%</small>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <h6 class="mb-0">数据操作</h6>
                    </div>
                    <div class="card-body">
                      <div class="d-grid gap-2">
                        <button class="btn btn-outline-primary btn-sm" @click="exportData">
                          <i class="bi bi-download me-1"></i>
                          导出数据
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" @click="importData">
                          <i class="bi bi-upload me-1"></i>
                          导入数据
                        </button>
                        <button class="btn btn-outline-danger btn-sm" @click="clearAllData">
                          <i class="bi bi-trash me-1"></i>
                          清空所有数据
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-3">
                <h6>聊天历史 ({{ chatHistories.length }})</h6>
                <div class="list-group">
                  <div 
                    v-for="history in chatHistories.slice(0, 5)" 
                    :key="history.id"
                    class="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{{ history.title }}</strong>
                      <br>
                      <small class="text-muted">{{ formatDate(history.updatedAt) }}</small>
                    </div>
                    <button 
                      class="btn btn-outline-danger btn-sm" 
                      @click="deleteChatHistory(history.id)"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { secureStorage, type APIConfig, type AppSettings, type ChatHistory } from '../services/SecureStorageService';

const props = defineProps<{
  isVisible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  settingsChanged: [];
}>();

// 响应式数据
const apiConfigs = ref<Array<APIConfig & { status: string; testing: boolean }>>([]);
const appSettings = ref<AppSettings>(secureStorage.getAppSettings());
const chatHistories = ref<ChatHistory[]>([]);
const storageInfo = ref({ used: 0, total: 0, percentage: 0 });

// API 表单
const showAddAPIForm = ref(false);
const editingAPI = ref<APIConfig | null>(null);
const apiForm = reactive({
  name: '',
  provider: 'google' as const,
  apiKey: '',
  apiEndpoint: '',
  chatModel: '',
  embeddingModel: ''
});

// 初始化
onMounted(() => {
  loadData();
});

const loadData = () => {
  const configs = secureStorage.getAPIConfigs();
  apiConfigs.value = configs.map(config => ({
    ...config,
    status: 'unknown',
    testing: false
  }));
  
  chatHistories.value = secureStorage.getChatHistories();
  storageInfo.value = secureStorage.getStorageInfo();
};

// API 管理方法
const getDefaultChatModel = (provider: string) => {
  switch (provider) {
    case 'google': return 'gemini-1.5-flash';
    case 'openai': return 'gpt-3.5-turbo';
    case 'anthropic': return 'claude-3-sonnet-20240229';
    default: return '';
  }
};

const getDefaultEmbeddingModel = (provider: string) => {
  switch (provider) {
    case 'google': return 'text-embedding-004';
    case 'openai': return 'text-embedding-ada-002';
    default: return '';
  }
};

const saveAPIConfig = () => {
  const config: APIConfig = {
    ...apiForm,
    createdAt: editingAPI.value?.createdAt || Date.now(),
    updatedAt: Date.now(),
    isDefault: editingAPI.value?.isDefault || false
  };
  
  secureStorage.saveAPIConfig(config);
  loadData();
  cancelAPIForm();
  emit('settingsChanged');
};

const editAPI = (config: APIConfig) => {
  editingAPI.value = config;
  Object.assign(apiForm, config);
  showAddAPIForm.value = true;
};

const deleteAPI = (name: string) => {
  if (confirm(`确定要删除 API 配置 "${name}" 吗？`)) {
    secureStorage.deleteAPIConfig(name);
    loadData();
    emit('settingsChanged');
  }
};

const setDefaultAPI = (name: string) => {
  secureStorage.setDefaultAPIConfig(name);
  loadData();
  emit('settingsChanged');
};

const testAPI = async (config: APIConfig & { status: string; testing: boolean }) => {
  config.testing = true;
  config.status = 'testing';
  
  try {
    // TODO: 实现实际的API测试
    await new Promise(resolve => setTimeout(resolve, 1000));
    config.status = 'connected';
  } catch (error) {
    config.status = 'failed';
  } finally {
    config.testing = false;
  }
};

const cancelAPIForm = () => {
  showAddAPIForm.value = false;
  editingAPI.value = null;
  Object.assign(apiForm, {
    name: '',
    provider: 'google',
    apiKey: '',
    apiEndpoint: '',
    chatModel: '',
    embeddingModel: ''
  });
};

// 应用设置方法
const saveAppSettings = () => {
  secureStorage.saveAppSettings(appSettings.value);
  emit('settingsChanged');
};

// 数据管理方法
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const exportData = () => {
  const data = secureStorage.exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hnsw-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const importData = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = secureStorage.importData(e.target?.result as string);
        if (result.success) {
          alert('数据导入成功');
          loadData();
        } else {
          alert('数据导入失败: ' + result.message);
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};

const clearAllData = () => {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    secureStorage.clearAllData();
    loadData();
    emit('settingsChanged');
    alert('所有数据已清空');
  }
};

const deleteChatHistory = (id: string) => {
  if (confirm('确定要删除这条聊天历史吗？')) {
    secureStorage.deleteChatHistory(id);
    loadData();
  }
};
</script>

<style scoped>
.nav-tabs .nav-link {
  color: var(--bs-secondary);
}

.nav-tabs .nav-link.active {
  color: var(--bs-primary);
}

.table th {
  font-size: 0.875rem;
  font-weight: 600;
}

.btn-group-sm .btn {
  font-size: 0.75rem;
}
</style> 