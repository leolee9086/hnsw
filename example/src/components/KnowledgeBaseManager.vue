<template>
  <div class="knowledge-base-manager">
    <!-- 顶部工具栏 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">
        <i class="bi bi-database me-2"></i>
        知识库管理
      </h4>
      <div class="d-flex gap-2">
        <button class="btn btn-primary btn-sm" @click="showCreateModal">
          <i class="bi bi-plus me-1"></i>
          创建知识库
        </button>
        <button class="btn btn-outline-secondary btn-sm" @click="refreshKnowledgeBases">
          <i class="bi bi-arrow-clockwise me-1"></i>
          刷新
        </button>
        <button class="btn btn-outline-info btn-sm" @click="refreshStats">
          <i class="bi bi-database-check me-1"></i>
          刷新统计
        </button>
      </div>
    </div>

    <!-- 知识库列表 -->
    <div v-if="knowledgeBases.length === 0" class="text-center py-5">
      <i class="bi bi-database display-1 text-muted"></i>
      <p class="mt-3 text-muted">还没有创建任何知识库</p>
      <button class="btn btn-primary" @click="showCreateModal">
        <i class="bi bi-plus me-1"></i>
        创建第一个知识库
      </button>
    </div>

    <div v-else class="row g-3">
      <div 
        v-for="kb in knowledgeBases" 
        :key="kb.id"
        class="col-md-6 col-lg-4"
      >
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="card-title mb-0">{{ kb.name }}</h6>
              <div class="dropdown">
                <button 
                  class="btn btn-sm btn-outline-secondary dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                >
                  <i class="bi bi-three-dots"></i>
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" href="#" @click="editKnowledgeBase(kb)">
                    <i class="bi bi-pencil me-2"></i>编辑
                  </a></li>
                  <li><a class="dropdown-item" href="#" @click="viewDocuments(kb)">
                    <i class="bi bi-file-text me-2"></i>查看文档
                  </a></li>
                  <li><a class="dropdown-item" href="#" @click="rebuildIndex(kb)">
                    <i class="bi bi-arrow-clockwise me-2"></i>重建索引
                  </a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger" href="#" @click="deleteKnowledgeBase(kb)">
                    <i class="bi bi-trash me-2"></i>删除
                  </a></li>
                </ul>
              </div>
            </div>
            
            <p class="card-text text-muted small mb-3">{{ kb.description }}</p>
            
            <div class="row g-2 mb-3">
              <div class="col-6">
                <div class="text-center">
                  <div class="text-primary fw-bold">{{ kb.stats.totalDocuments }}</div>
                  <div class="text-muted small">文档</div>
                </div>
              </div>
              <div class="col-6">
                <div class="text-center">
                  <div class="text-success fw-bold">{{ kb.stats.totalChunks }}</div>
                  <div class="text-muted small">分块</div>
                </div>
              </div>
            </div>
            
            <div class="d-flex justify-content-between align-items-center">
              <small class="text-muted">
                创建于 {{ formatDate(kb.createdAt) }}
              </small>
              <button 
                class="btn btn-primary btn-sm"
                @click="selectKnowledgeBase(kb)"
                :disabled="selectedKnowledgeBaseId === kb.id"
              >
                {{ selectedKnowledgeBaseId === kb.id ? '已选择' : '选择' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑知识库模态框 -->
    <div class="modal fade" id="knowledgeBaseModal" tabindex="-1" role="dialog" aria-labelledby="knowledgeBaseModalLabel">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="knowledgeBaseModalLabel">
              {{ editingKnowledgeBase ? '编辑知识库' : '创建知识库' }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveKnowledgeBase" id="knowledgeBaseForm">
              <div class="mb-3">
                <label class="form-label">知识库名称 *</label>
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="formData.name"
                  required
                  placeholder="输入知识库名称"
                >
              </div>
              
              <div class="mb-3">
                <label class="form-label">描述</label>
                <textarea 
                  class="form-control" 
                  v-model="formData.description"
                  rows="3"
                  placeholder="输入知识库描述"
                ></textarea>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">分块大小</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      v-model.number="formData.settings.chunkSize"
                      min="50"
                      max="1000"
                    >
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">重叠大小</label>
                    <input 
                      type="number" 
                      class="form-control" 
                      v-model.number="formData.settings.overlapSize"
                      min="0"
                      max="200"
                    >
                  </div>
                </div>
              </div>
              
              <div class="mb-3">
                <label class="form-label">嵌入模型</label>
                <select class="form-select" v-model="formData.settings.embeddingModel">
                  <option value="Xenova/all-MiniLM-L6-v2">all-MiniLM-L6-v2 (轻量级)</option>
                  <option value="Xenova/all-mpnet-base-v2">all-mpnet-base-v2 (高质量)</option>
                  <option value="Xenova/paraphrase-multilingual-MiniLM-L12-v2">multilingual-MiniLM (多语言)</option>
                  <option value="Xenova/BAAI/bge-small-zh-v1.5">bge-small-zh-v1.5 (中文专用)</option>
                  <option value="Xenova/BAAI/bge-base-zh-v1.5">bge-base-zh-v1.5 (中文专用)</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label class="form-label">搜索类型</label>
                <select class="form-select" v-model="formData.settings.searchType">
                  <option value="both">文本 + 向量</option>
                  <option value="text">仅文本</option>
                  <option value="vector">仅向量</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label class="form-label">最大搜索结果</label>
                <input 
                  type="number" 
                  class="form-control" 
                  v-model.number="formData.settings.maxSearchResults"
                  min="1"
                  max="50"
                >
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              form="knowledgeBaseForm"
              :disabled="isSaving"
            >
              <span v-if="isSaving" class="spinner-border spinner-border-sm me-1"></span>
              {{ editingKnowledgeBase ? '更新' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 文档管理模态框 -->
    <div class="modal fade" id="documentsModal" tabindex="-1" role="dialog" aria-labelledby="documentsModalLabel">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="documentsModalLabel">
              文档管理 - {{ currentKnowledgeBase?.name }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
          </div>
          <div class="modal-body">
            <div v-if="documents.length === 0" class="text-center py-4">
              <i class="bi bi-file-earmark-text display-4 text-muted"></i>
              <p class="mt-3 text-muted">还没有上传任何文档</p>
            </div>
            
            <div v-else class="list-group">
              <div 
                v-for="doc in documents" 
                :key="doc.id"
                class="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <h6 class="mb-1">{{ doc.fileName }}</h6>
                                     <small class="text-muted">
                     {{ formatFileSize(doc.fileSize) }} | 
                     {{ doc.fileType }} | 
                     上传于 {{ formatDate(doc.createdAt) }}
                   </small>
                </div>
                <button 
                  class="btn btn-outline-danger btn-sm"
                  @click="deleteDocument(doc.id)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { createKnowledgeBaseService, KnowledgeBaseService } from '../services/KnowledgeBaseService';
import type { KnowledgeBase, Document } from '../types/knowledge-base';

// 定义事件发射器
const emit = defineEmits<{
  'knowledge-base-selected': [knowledgeBase: KnowledgeBase];
  'knowledge-base-updated': [knowledgeBase: KnowledgeBase];
}>();

// 服务实例
const knowledgeBaseService = createKnowledgeBaseService();

// 响应式数据
const knowledgeBases = ref<KnowledgeBase[]>([]);
const selectedKnowledgeBaseId = ref<string>('');
const documents = ref<Document[]>([]);
const currentKnowledgeBase = ref<KnowledgeBase | null>(null);
const isSaving = ref(false);

// 表单数据
const editingKnowledgeBase = ref<KnowledgeBase | null>(null);
const formData = reactive({
  name: '',
  description: '',
  settings: {
    chunkSize: 200,
    overlapSize: 50,
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    searchType: 'both' as 'text' | 'vector' | 'both',
    maxSearchResults: 10
  }
});

// 模态框实例
let knowledgeBaseModal: any = null;
let documentsModal: any = null;

  // 生命周期
  onMounted(async () => {
    await loadKnowledgeBases();
    
    // 初始化模态框
    // @ts-ignore
    knowledgeBaseModal = new bootstrap.Modal(document.getElementById('knowledgeBaseModal'));
    // @ts-ignore
    documentsModal = new bootstrap.Modal(document.getElementById('documentsModal'));
    
    // 监听模态框隐藏事件，清理焦点
    const knowledgeBaseModalElement = document.getElementById('knowledgeBaseModal');
    const documentsModalElement = document.getElementById('documentsModal');
    
    if (knowledgeBaseModalElement) {
      knowledgeBaseModalElement.addEventListener('hidden.bs.modal', () => {
        // 将焦点移回页面主体
        document.body.focus();
      });
    }
    
    if (documentsModalElement) {
      documentsModalElement.addEventListener('hidden.bs.modal', () => {
        // 将焦点移回页面主体
        document.body.focus();
      });
    }
  });

// 加载知识库列表
const loadKnowledgeBases = async () => {
  try {
    console.log('开始加载知识库列表...');
    knowledgeBases.value = await knowledgeBaseService.getKnowledgeBases();
    
    // 自动刷新所有知识库的统计信息
    console.log('开始刷新统计信息...');
    for (const kb of knowledgeBases.value) {
      try {
        // 获取知识库的实际数据
        const documents = await knowledgeBaseService.getDocuments(kb.id);
        const chunks = await knowledgeBaseService.getKnowledgeBaseChunks(kb.id);
        
        // 计算总大小
        const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
        
        // 更新统计信息
        const updatedStats = {
          totalDocuments: documents.length,
          totalChunks: chunks.length,
          totalSize: totalSize,
          lastUpdated: new Date()
        };
        
        console.log(`知识库 ${kb.name} 统计信息:`, updatedStats);
        
        await knowledgeBaseService.updateKnowledgeBase(kb.id, { 
          stats: updatedStats
        });
      } catch (error) {
        console.error(`更新知识库 ${kb.name} 统计信息失败:`, error);
      }
    }
    
    // 重新加载知识库列表以获取更新的统计信息
    knowledgeBases.value = await knowledgeBaseService.getKnowledgeBases();
    console.log('知识库列表加载完成');
  } catch (error) {
    console.error('加载知识库失败:', error);
  }
};

// 刷新知识库列表
const refreshKnowledgeBases = async () => {
  await loadKnowledgeBases();
};

// 手动刷新统计信息
const refreshStats = async () => {
  try {
    console.log('手动刷新统计信息...');
    await loadKnowledgeBases();
    console.log('统计信息刷新完成');
  } catch (error) {
    console.error('刷新统计信息失败:', error);
  }
};

// 显示创建模态框
const showCreateModal = () => {
  editingKnowledgeBase.value = null;
  resetFormData();
  knowledgeBaseModal.show();
};

// 编辑知识库
const editKnowledgeBase = (kb: KnowledgeBase) => {
  editingKnowledgeBase.value = kb;
  formData.name = kb.name;
  formData.description = kb.description;
  formData.settings = { ...kb.settings };
  knowledgeBaseModal.show();
};

// 保存知识库
const saveKnowledgeBase = async () => {
  if (!formData.name.trim()) return;
  
  isSaving.value = true;
  
  try {
    if (editingKnowledgeBase.value) {
      // 更新知识库
      const updated = await knowledgeBaseService.updateKnowledgeBase(
        editingKnowledgeBase.value.id,
        {
          name: formData.name,
          description: formData.description,
          settings: formData.settings
        }
      );
      
      if (updated) {
        emit('knowledge-base-updated', updated);
        await loadKnowledgeBases();
        knowledgeBaseModal.hide();
      }
    } else {
      // 创建知识库
      const newKb = await knowledgeBaseService.createKnowledgeBase(
        formData.name,
        formData.description,
        formData.settings
      );
      
      await loadKnowledgeBases();
      knowledgeBaseModal.hide();
    }
  } catch (error) {
    console.error('保存知识库失败:', error);
    alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
  } finally {
    isSaving.value = false;
  }
};

// 删除知识库
const deleteKnowledgeBase = async (kb: KnowledgeBase) => {
  if (!confirm(`确定要删除知识库 "${kb.name}" 吗？此操作不可恢复。`)) return;
  
  try {
    const success = await knowledgeBaseService.deleteKnowledgeBase(kb.id);
    if (success) {
      await loadKnowledgeBases();
      if (selectedKnowledgeBaseId.value === kb.id) {
        selectedKnowledgeBaseId.value = '';
      }
    }
  } catch (error) {
    console.error('删除知识库失败:', error);
    alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 选择知识库
const selectKnowledgeBase = (kb: KnowledgeBase) => {
  selectedKnowledgeBaseId.value = kb.id;
  emit('knowledge-base-selected', kb);
};

// 查看文档
const viewDocuments = async (kb: KnowledgeBase) => {
  currentKnowledgeBase.value = kb;
  try {
    documents.value = await knowledgeBaseService.getDocuments(kb.id);
    documentsModal.show();
  } catch (error) {
    console.error('加载文档失败:', error);
  }
};

// 删除文档
const deleteDocument = async (documentId: string) => {
  if (!confirm('确定要删除这个文档吗？')) return;
  
  try {
    const success = await knowledgeBaseService.deleteDocument(documentId);
    if (success) {
      documents.value = documents.value.filter(d => d.id !== documentId);
    }
  } catch (error) {
    console.error('删除文档失败:', error);
    alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 重建索引
const rebuildIndex = async (kb: KnowledgeBase) => {
  if (!confirm(`确定要重建知识库 "${kb.name}" 的索引吗？这可能需要一些时间。`)) return;
  
  try {
    const success = await knowledgeBaseService.rebuildIndex(kb.id);
    if (success) {
      alert('索引重建完成！');
      await loadKnowledgeBases();
    } else {
      alert('索引重建失败，请检查控制台错误信息。');
    }
  } catch (error) {
    console.error('重建索引失败:', error);
    alert('重建失败: ' + (error instanceof Error ? error.message : '未知错误'));
  }
};

// 重置表单数据
const resetFormData = () => {
  formData.name = '';
  formData.description = '';
  formData.settings = {
    chunkSize: 200,
    overlapSize: 50,
    embeddingModel: 'Xenova/all-MiniLM-L6-v2',
    searchType: 'both',
    maxSearchResults: 10
  };
};

// 格式化日期
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 暴露方法给父组件
defineExpose({
  loadKnowledgeBases,
  selectKnowledgeBase
});
</script>

<style scoped>
.knowledge-base-manager {
  padding: 1rem;
}

.card {
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.dropdown-toggle::after {
  display: none;
}
</style> 