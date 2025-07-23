<template>
  <div class="file-upload">
    <!-- 上传区域 -->
    <div 
      class="upload-area"
      :class="{ 'drag-over': isDragOver }"
      @drop="handleFileDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
    >
      <div class="upload-content text-center">
        <i class="bi bi-cloud-upload display-1 text-muted mb-3"></i>
        <h5>拖拽文件到此处或点击上传</h5>
        <p class="text-muted">支持多种文本格式：TXT, MD, JSON, CSV, XML, HTML, 代码文件等</p>
        <button class="btn btn-primary" @click="showFileInput">
          <i class="bi bi-upload me-1"></i>
          选择文件
        </button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div v-if="uploadedFiles.length > 0" class="mt-4">
      <h6>已上传文件 ({{ uploadedFiles.length }})</h6>
      <div class="list-group">
        <div 
          v-for="file in uploadedFiles" 
          :key="file.id"
          class="list-group-item d-flex justify-content-between align-items-center"
        >
          <div class="d-flex align-items-center">
            <i class="bi bi-file-earmark-text me-2 text-primary"></i>
            <div>
              <h6 class="mb-0">{{ file.name }}</h6>
              <small class="text-muted">
                {{ formatFileSize(file.size) }} | {{ file.type }}
              </small>
            </div>
          </div>
          
          <div class="d-flex align-items-center gap-2">
            <span v-if="file.status === 'processing'" class="text-warning">
              <i class="bi bi-hourglass-split me-1"></i>
              处理中...
            </span>
            <span v-else-if="file.status === 'success'" class="text-success">
              <i class="bi bi-check-circle me-1"></i>
              成功
            </span>
            <span v-else-if="file.status === 'error'" class="text-danger">
              <i class="bi bi-x-circle me-1"></i>
              失败
            </span>
            
            <button 
              class="btn btn-outline-danger btn-sm"
              @click="removeFile(file.id)"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 处理进度 -->
    <div v-if="isProcessing" class="mt-4">
      <div class="alert alert-info">
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2"></div>
          <span>{{ processingStep }} - {{ processingFile }}</span>
        </div>
        <div class="progress mt-2" style="height: 4px;">
          <div 
            class="progress-bar" 
            :style="{ width: processingProgress + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input 
      type="file" 
      ref="fileInput" 
      @change="handleFileSelect" 
      multiple 
      accept=".txt,.md,.json,.csv,.xml,.html,.htm,.log,.sql,.py,.js,.ts,.java,.cpp,.c,.h,.hpp,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.r,.m,.pl,.sh,.bat,.ps1,.yml,.yaml,.toml,.ini,.cfg,.conf,.properties,.xml,.json,.csv,.tsv,.xlsx,.xls,.doc,.docx,.pdf"
      style="display: none;"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { createKnowledgeBaseService, KnowledgeBaseService } from '../services/KnowledgeBaseService';
import type { KnowledgeBase } from '../types/knowledge-base';

// 定义事件发射器
const emit = defineEmits<{
  'file-processed': [fileId: string, success: boolean];
  'all-files-processed': [];
}>();

// 定义props
const props = defineProps<{
  knowledgeBaseId: string;
}>();

// 服务实例
const knowledgeBaseService = createKnowledgeBaseService();

// 响应式数据
const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);
const isProcessing = ref(false);
const processingFile = ref('');
const processingStep = ref('');
const processingProgress = ref(0);

// 上传的文件列表
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

const uploadedFiles = ref<UploadedFile[]>([]);

// 显示文件选择器
const showFileInput = () => {
  fileInput.value?.click();
};

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  if (!files) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    await addFile(file);
  }

  // 处理所有文件
  await processAllFiles();
};

// 处理文件拖拽
const handleFileDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;

  const files = event.dataTransfer?.files;
  if (!files) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    await addFile(file);
  }

  // 处理所有文件
  await processAllFiles();
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
};

// 添加文件到列表
const addFile = async (file: File) => {
  const fileId = generateId();
  
  const uploadedFile: UploadedFile = {
    id: fileId,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    file,
    status: 'pending'
  };

  uploadedFiles.value.push(uploadedFile);
};

// 处理所有文件
const processAllFiles = async () => {
  if (uploadedFiles.value.length === 0) return;

  isProcessing.value = true;
  let processedCount = 0;

  for (const uploadedFile of uploadedFiles.value) {
    if (uploadedFile.status === 'pending') {
      await processFile(uploadedFile);
      processedCount++;
      
      // 更新进度
      processingProgress.value = (processedCount / uploadedFiles.value.length) * 100;
    }
  }

  isProcessing.value = false;
  processingFile.value = '';
  processingStep.value = '';
  processingProgress.value = 0;

  emit('all-files-processed');
};

// 处理单个文件
const processFile = async (uploadedFile: UploadedFile) => {
  uploadedFile.status = 'processing';
  processingFile.value = uploadedFile.name;
  processingStep.value = '处理文件';

  try {
    const result = await knowledgeBaseService.processFile(
      props.knowledgeBaseId,
      uploadedFile.file
    );

    if (result.success) {
      uploadedFile.status = 'success';
      emit('file-processed', uploadedFile.id, true);
    } else {
      uploadedFile.status = 'error';
      uploadedFile.error = result.error;
      emit('file-processed', uploadedFile.id, false);
    }
  } catch (error) {
    uploadedFile.status = 'error';
    uploadedFile.error = error instanceof Error ? error.message : '未知错误';
    emit('file-processed', uploadedFile.id, false);
  }
};

// 移除文件
const removeFile = (fileId: string) => {
  const index = uploadedFiles.value.findIndex(f => f.id === fileId);
  if (index !== -1) {
    uploadedFiles.value.splice(index, 1);
  }
};

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
  addFile,
  processAllFiles,
  clearFiles: () => {
    uploadedFiles.value = [];
  }
});
</script>

<style scoped>
.file-upload {
  padding: 1rem;
}

.upload-area {
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 2rem;
  transition: all 0.2s ease;
  background-color: #f8f9fa;
}

.upload-area.drag-over {
  border-color: #007bff;
  background-color: rgba(0, 123, 255, 0.05);
}

.upload-content {
  pointer-events: none;
}

.upload-content .btn {
  pointer-events: auto;
}

.list-group-item {
  transition: all 0.2s ease;
}

.list-group-item:hover {
  background-color: rgba(0, 123, 255, 0.05);
}
</style> 