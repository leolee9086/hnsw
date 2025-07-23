<template>
  <div class="knowledge-base-search">
    <!-- 搜索工具栏 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">
        <i class="bi bi-search me-2"></i>
        知识库搜索
      </h4>
      
      <div class="d-flex align-items-center gap-2">
        <div class="d-flex align-items-center gap-1">
          <label class="form-label mb-0 fs-6 text-muted">知识库:</label>
          <select 
            v-model="selectedKnowledgeBaseId" 
            @change="onKnowledgeBaseChange"
            class="form-select form-select-sm"
            style="width: auto; min-width: 200px;"
          >
            <option value="">所有知识库</option>
            <option 
              v-for="kb in knowledgeBases" 
              :key="kb.id" 
              :value="kb.id"
            >
              {{ kb.name }}
            </option>
          </select>
        </div>
        
        <div class="d-flex align-items-center gap-1">
          <label class="form-label mb-0 fs-6 text-muted">搜索类型:</label>
          <select 
            v-model="searchType" 
            class="form-select form-select-sm"
            style="width: auto; min-width: 120px;"
          >
            <option value="both">文本 + 向量</option>
            <option value="text">仅文本</option>
            <option value="vector">仅向量</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 搜索输入 -->
    <div class="mb-4">
      <div class="input-group">
        <input 
          type="text" 
          class="form-control" 
          placeholder="输入搜索内容..." 
          v-model="searchQuery"
          @keyup.enter="performSearch"
        >
        <button 
          class="btn btn-primary" 
          type="button"
          @click="performSearch"
          :disabled="isLoading || !searchQuery.trim()"
        >
          <span v-if="isLoading" class="spinner-border spinner-border-sm me-1"></span>
          搜索
        </button>
        <button 
          class="btn btn-outline-secondary" 
          type="button"
          @click="showAdvancedSettings = !showAdvancedSettings"
          title="高级设置"
        >
          <i class="bi bi-gear"></i>
        </button>
      </div>
    </div>

    <!-- 高级搜索设置 -->
    <div v-if="showAdvancedSettings" class="mb-4">
      <div class="card">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="bi bi-gear me-2"></i>
            高级搜索设置
          </h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">相似度阈值</label>
              <div class="d-flex align-items-center gap-2">
                <input 
                  type="range" 
                  class="form-range flex-grow-1" 
                  v-model.number="searchThreshold"
                  min="0.1" 
                  max="1.0" 
                  step="0.1"
                >
                <span class="text-muted small" style="min-width: 50px;">
                  {{ (searchThreshold * 100).toFixed(0) }}%
                </span>
              </div>
              <small class="text-muted">值越低，搜索结果越精确但数量越少</small>
            </div>
            
            <div class="col-md-6">
              <label class="form-label">最大结果数量</label>
              <input 
                type="number" 
                class="form-control" 
                v-model.number="maxResults"
                min="1" 
                max="100"
              >
              <small class="text-muted">限制返回的搜索结果数量</small>
            </div>
            
            <div class="col-md-6">
              <label class="form-label">搜索类型</label>
              <select class="form-select" v-model="searchType">
                <option value="both">文本 + 向量</option>
                <option value="text">仅文本</option>
                <option value="vector">仅向量</option>
              </select>
              <small class="text-muted">选择搜索方式</small>
            </div>
            
            <div class="col-md-6">
              <label class="form-label">排序方式</label>
              <select class="form-select" v-model="sortBy">
                <option value="score">按相似度排序</option>
                <option value="relevance">按相关性排序</option>
                <option value="date">按日期排序</option>
              </select>
              <small class="text-muted">选择结果排序方式</small>
            </div>
          </div>
          
          <div class="mt-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" v-model="enableFuzzySearch" id="fuzzySearch">
              <label class="form-check-label" for="fuzzySearch">
                启用模糊搜索
              </label>
            </div>
            <small class="text-muted">允许部分匹配和拼写错误</small>
          </div>

          <div class="mt-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" v-model="showAllResults" id="showAllResults">
              <label class="form-check-label" for="showAllResults">
                显示所有结果 (不按阈值过滤)
              </label>
            </div>
            <small class="text-muted">如果勾选，将显示所有符合条件的搜索结果，不考虑相似度阈值。</small>
          </div>

          <div class="mt-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" v-model="showLowQualityResults" id="showLowQualityResults">
              <label class="form-check-label" for="showLowQualityResults">
                显示低质量结果
              </label>
            </div>
            <small class="text-muted">如果勾选，将显示相似度低于阈值但仍然符合条件的搜索结果。</small>
          </div>
          
          <div class="mt-3 d-flex gap-2">
            <button 
              type="button" 
              class="btn btn-outline-secondary btn-sm"
              @click="resetSearchSettings"
            >
              <i class="bi bi-arrow-clockwise me-1"></i>
              重置设置
            </button>
            <button 
              type="button" 
              class="btn btn-outline-primary btn-sm"
              @click="saveSearchSettings"
            >
              <i class="bi bi-save me-1"></i>
              保存设置
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchResults.length > 0" class="mb-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h5>搜索结果 ({{ searchResults.length }})</h5>
        <small class="text-muted">搜索耗时: {{ searchTime.toFixed(2) }}ms</small>
      </div>
      
      <div class="list-group">
        <div 
          v-for="(result, index) in searchResults" 
          :key="`${result.chunk.id}-${result.type}`"
          class="list-group-item"
          :class="getResultItemClass(result)"
        >
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2 mb-2">
                <h6 class="mb-0">{{ result.document.fileName }}</h6>
                <span class="badge" :class="getTypeBadgeClass(result.type)">
                  {{ result.type === 'text' ? '文本' : '向量' }}
                </span>
                <span class="badge" :class="getScoreBadgeClass(result.score)">
                  相似度: {{ (result.score * 100).toFixed(1) }}%
                </span>
                <span v-if="result.score < searchThreshold" class="badge bg-warning">
                  低质量
                </span>
              </div>
              
              <p class="mb-2" :class="getTextClass(result.score)">{{ result.chunk.text }}</p>
              
              <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">
                  知识库: {{ getKnowledgeBaseName(result.chunk.knowledgeBaseId) }} | 
                  分块大小: {{ result.chunk.text.length }} 字符 |
                  距离: {{ result.distance.toFixed(4) }}
                </small>
                <button 
                  class="btn btn-outline-primary btn-sm"
                  @click="copyToClipboard(result.chunk.text)"
                >
                  <i class="bi bi-clipboard me-1"></i>
                  复制
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="hasSearched && !isLoading" class="text-center py-5">
      <i class="bi bi-search display-1 text-muted"></i>
      <p class="mt-3 text-muted">没有找到相关结果</p>
      <p class="text-muted small">尝试调整搜索关键词或搜索类型</p>
    </div>

    <!-- 初始状态 -->
    <div v-else-if="!hasSearched" class="text-center py-5">
      <i class="bi bi-search display-1 text-muted"></i>
      <p class="mt-3 text-muted">输入关键词开始搜索</p>
      <p class="text-muted small">支持文本搜索和向量语义搜索</p>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">搜索中...</span>
      </div>
      <p class="mt-3 text-muted">正在搜索...</p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { createKnowledgeBaseService, KnowledgeBaseService } from '../services/KnowledgeBaseService';
import type { KnowledgeBase, SearchResult, SearchOptions } from '../types/knowledge-base';

// 定义事件发射器
const emit = defineEmits<{
  'search-completed': [results: SearchResult[]];
}>();

// 服务实例
const knowledgeBaseService = createKnowledgeBaseService();

// 响应式数据
const knowledgeBases = ref<KnowledgeBase[]>([]);
const selectedKnowledgeBaseId = ref<string>('');
const searchQuery = ref('');
const searchType = ref<'text' | 'vector' | 'both'>('both');
const searchResults = ref<SearchResult[]>([]);
const isLoading = ref(false);
const hasSearched = ref(false);
const searchTime = ref(0);

// 高级搜索设置
const showAdvancedSettings = ref(false);
const searchThreshold = ref(0.8); // 默认相似度阈值
const maxResults = ref(20); // 默认最大结果数量
const enableFuzzySearch = ref(false); // 默认不启用模糊搜索
const sortBy = ref<'score' | 'relevance' | 'date'>('score'); // 默认按相似度排序
const showAllResults = ref(false); // 显示所有结果，不按阈值过滤
const showLowQualityResults = ref(true); // 显示低质量结果

// 生命周期
onMounted(async () => {
  await loadKnowledgeBases();
  await initializeEmbedder();
});

// 加载知识库列表
const loadKnowledgeBases = async () => {
  try {
    knowledgeBases.value = await knowledgeBaseService.getKnowledgeBases();
  } catch (error) {
    console.error('加载知识库失败:', error);
  }
};

// 初始化嵌入模型
const initializeEmbedder = async () => {
  try {
    await knowledgeBaseService.initializeEmbedder('Xenova/all-MiniLM-L6-v2');
  } catch (error) {
    console.error('初始化嵌入模型失败:', error);
  }
};

// 知识库变化处理
const onKnowledgeBaseChange = () => {
  // 可以在这里添加知识库切换的逻辑
  console.log('选择的知识库:', selectedKnowledgeBaseId.value);
};

// 执行搜索
const performSearch = async () => {
  if (!searchQuery.value.trim()) return;

  isLoading.value = true;
  hasSearched.value = true;
  const startTime = performance.now();

  try {
    // 调试：检查数据状态
    console.log('搜索前数据状态:');
    console.log('- 知识库数量:', knowledgeBases.value.length);
    console.log('- 选择的知识库:', selectedKnowledgeBaseId.value);
    console.log('- 搜索查询:', searchQuery.value);
    console.log('- 搜索类型:', searchType.value);
    
    // 检查知识库数据
    if (selectedKnowledgeBaseId.value) {
      const debugInfo = await knowledgeBaseService.getKnowledgeBaseDebugInfo(selectedKnowledgeBaseId.value);
      console.log('- 知识库分块数量:', debugInfo.chunksCount);
      console.log('- 知识库文档数量:', debugInfo.documentsCount);
      console.log('- 有向量的分块数量:', debugInfo.vectorChunksCount);
    }

    const options: SearchOptions = {
      query: searchQuery.value,
      knowledgeBaseId: selectedKnowledgeBaseId.value || undefined,
      type: searchType.value,
      limit: maxResults.value, // 使用 maxResults
      threshold: searchThreshold.value, // 使用 searchThreshold
      enableFuzzySearch: enableFuzzySearch.value, // 使用 enableFuzzySearch
      sortBy: sortBy.value, // 使用 sortBy
      showAllResults: showAllResults.value, // 使用 showAllResults
      showLowQualityResults: showLowQualityResults.value // 使用 showLowQualityResults
    };

    const results = await knowledgeBaseService.search(options);
    console.log('搜索结果:', results.length);
    searchResults.value = results;
    emit('search-completed', results);
  } catch (error) {
    console.error('搜索失败:', error);
    alert('搜索失败: ' + (error instanceof Error ? error.message : '未知错误'));
  } finally {
    isLoading.value = false;
    searchTime.value = performance.now() - startTime;
  }
};

// 获取知识库名称
const getKnowledgeBaseName = (knowledgeBaseId: string): string => {
  const kb = knowledgeBases.value.find(k => k.id === knowledgeBaseId);
  return kb?.name || '未知知识库';
};

// 获取类型徽章样式
const getTypeBadgeClass = (type: 'text' | 'vector'): string => {
  return type === 'text' ? 'bg-info' : 'bg-success';
};

// 获取相似度徽章样式
const getScoreBadgeClass = (score: number): string => {
  if (score >= searchThreshold.value) {
    return 'bg-success';
  } else {
    return 'bg-warning';
  }
};

// 获取文本样式
const getTextClass = (score: number): string => {
  if (score < searchThreshold.value) {
    return 'text-muted';
  }
  return '';
};

// 获取结果项的样式类
const getResultItemClass = (result: SearchResult): string => {
  let classes = '';
  if (result.score < searchThreshold.value) {
    classes += 'bg-warning text-dark ';
  }
  if (result.type === 'vector') {
    classes += 'bg-info text-white ';
  }
  return classes;
};

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // 可以添加一个临时的成功提示
    console.log('已复制到剪贴板');
  } catch (error) {
    console.error('复制失败:', error);
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

// 重置搜索设置
const resetSearchSettings = () => {
  searchThreshold.value = 0.8;
  maxResults.value = 20;
  enableFuzzySearch.value = false;
  sortBy.value = 'score';
  searchType.value = 'both';
  showAllResults.value = false;
  showLowQualityResults.value = true;
  console.log('搜索设置已重置');
};

// 保存搜索设置
const saveSearchSettings = () => {
  // 这里可以保存到本地存储
  const settings = {
    searchThreshold: searchThreshold.value,
    maxResults: maxResults.value,
    enableFuzzySearch: enableFuzzySearch.value,
    sortBy: sortBy.value,
    searchType: searchType.value,
    showAllResults: showAllResults.value,
    showLowQualityResults: showLowQualityResults.value
  };
  localStorage.setItem('searchSettings', JSON.stringify(settings));
  console.log('搜索设置已保存');
};

// 暴露方法给父组件
defineExpose({
  performSearch,
  loadKnowledgeBases
});
</script>

<style scoped>
.knowledge-base-search {
  padding: 1rem;
}

.list-group-item {
  transition: all 0.2s ease;
  border-left: 4px solid transparent;
}

.list-group-item:hover {
  background-color: rgba(0, 123, 255, 0.05);
  transform: translateX(2px);
}

.list-group-item.bg-warning {
  border-left-color: #ffc107;
}

.list-group-item.bg-info {
  border-left-color: #17a2b8;
}

.badge {
  font-size: 0.75rem;
}

.text-muted {
  opacity: 0.7;
}

/* 搜索结果质量指示器 */
.quality-indicator {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, #28a745, #ffc107, #dc3545);
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.list-group-item {
  animation: fadeIn 0.3s ease-out;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .knowledge-base-search {
    padding: 0.5rem;
  }
  
  .list-group-item {
    margin-bottom: 0.5rem;
  }
}
</style> 