<template>
  <div class="knowledge-base-app">
    <!-- 标签页导航 -->
    <ul class="nav nav-tabs mb-4" role="tablist">
      <li class="nav-item" role="presentation">
        <button 
          class="nav-link" 
          :class="{ active: activeTab === 'manager' }"
          @click="activeTab = 'manager'"
          type="button"
        >
          <i class="bi bi-database me-1"></i>
          知识库管理
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button 
          class="nav-link" 
          :class="{ active: activeTab === 'search' }"
          @click="activeTab = 'search'"
          type="button"
        >
          <i class="bi bi-search me-1"></i>
          搜索
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button 
          class="nav-link" 
          :class="{ active: activeTab === 'upload' }"
          @click="activeTab = 'upload'"
          type="button"
        >
          <i class="bi bi-upload me-1"></i>
          上传文档
        </button>
      </li>
    </ul>

    <!-- 标签页内容 -->
    <div class="tab-content">
      <!-- 知识库管理 -->
      <div v-if="activeTab === 'manager'" class="tab-pane fade show active">
        <KnowledgeBaseManager 
          ref="knowledgeBaseManager"
          @knowledge-base-selected="onKnowledgeBaseSelected"
          @knowledge-base-updated="onKnowledgeBaseUpdated"
        />
      </div>

      <!-- 搜索 -->
      <div v-if="activeTab === 'search'" class="tab-pane fade show active">
        <KnowledgeBaseSearch 
          ref="knowledgeBaseSearch"
          @search-completed="onSearchCompleted"
        />
      </div>

      <!-- 上传文档 -->
      <div v-if="activeTab === 'upload'" class="tab-pane fade show active">
        <div v-if="!selectedKnowledgeBase" class="text-center py-5">
          <i class="bi bi-database display-1 text-muted"></i>
          <p class="mt-3 text-muted">请先选择一个知识库</p>
          <button class="btn btn-primary" @click="activeTab = 'manager'">
            <i class="bi bi-database me-1"></i>
            选择知识库
          </button>
        </div>
        
        <div v-else>
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h4>
              <i class="bi bi-upload me-2"></i>
              上传文档到知识库
            </h4>
            <div class="d-flex align-items-center gap-2">
              <span class="badge bg-primary">{{ selectedKnowledgeBase.name }}</span>
              <button class="btn btn-outline-secondary btn-sm" @click="activeTab = 'manager'">
                <i class="bi bi-arrow-left me-1"></i>
                选择其他知识库
              </button>
            </div>
          </div>
          
          <FileUpload 
            :knowledge-base-id="selectedKnowledgeBase.id"
            @file-processed="onFileProcessed"
            @all-files-processed="onAllFilesProcessed"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import KnowledgeBaseManager from './KnowledgeBaseManager.vue';
import KnowledgeBaseSearch from './KnowledgeBaseSearch.vue';
import FileUpload from './FileUpload.vue';
import type { KnowledgeBase, SearchResult } from '../types/knowledge-base';

// 响应式数据
const activeTab = ref<'manager' | 'search' | 'upload'>('manager');
const selectedKnowledgeBase = ref<KnowledgeBase | null>(null);

// 组件引用
const knowledgeBaseManager = ref<InstanceType<typeof KnowledgeBaseManager> | null>(null);
const knowledgeBaseSearch = ref<InstanceType<typeof KnowledgeBaseSearch> | null>(null);

// 知识库选择处理
const onKnowledgeBaseSelected = (knowledgeBase: KnowledgeBase) => {
  selectedKnowledgeBase.value = knowledgeBase;
  console.log('选择了知识库:', knowledgeBase.name);
};

// 知识库更新处理
const onKnowledgeBaseUpdated = (knowledgeBase: KnowledgeBase) => {
  if (selectedKnowledgeBase.value?.id === knowledgeBase.id) {
    selectedKnowledgeBase.value = knowledgeBase;
  }
  console.log('知识库已更新:', knowledgeBase.name);
};

// 搜索完成处理
const onSearchCompleted = (results: SearchResult[]) => {
  console.log('搜索完成，找到', results.length, '个结果');
};

// 文件处理完成处理
const onFileProcessed = (fileId: string, success: boolean) => {
  console.log('文件处理完成:', fileId, success ? '成功' : '失败');
};

// 所有文件处理完成处理
const onAllFilesProcessed = () => {
  console.log('所有文件处理完成');
  // 可以在这里刷新知识库统计信息
  if (knowledgeBaseManager.value) {
    knowledgeBaseManager.value.loadKnowledgeBases();
  }
};
</script>

<style scoped>
.knowledge-base-app {
  padding: 1rem;
  height: 100%;
  overflow-y: auto;
}

.nav-tabs .nav-link {
  border: none;
  border-bottom: 2px solid transparent;
  color: #6c757d;
  transition: all 0.2s ease;
}

.nav-tabs .nav-link:hover {
  border-bottom-color: #dee2e6;
  color: #495057;
}

.nav-tabs .nav-link.active {
  border-bottom-color: #007bff;
  color: #007bff;
  background: none;
}

.tab-content {
  min-height: 400px;
}
</style> 