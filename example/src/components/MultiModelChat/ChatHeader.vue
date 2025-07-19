<template>
  <div class="chat-header">
    <div class="d-flex justify-content-between align-items-center">
      <h6 class="mb-0">
        <i class="bi bi-chat-dots me-1"></i>
        多模型并行对话 ({{ activeChatsCount }}个模型)
      </h6>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-secondary btn-sm"
          @click="$emit('add-more-models')"
          :disabled="isProcessing"
          title="添加更多模型"
        >
          <i class="bi bi-plus-circle me-1"></i>
          添加模型
        </button>
        <button 
          class="btn btn-outline-danger btn-sm"
          @click="$emit('close-all-chats')"
          title="关闭所有对话"
        >
          <i class="bi bi-x-circle me-1"></i>
          关闭所有
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 聊天头部组件
 * 显示多模型聊天的标题和控制按钮
 */
interface Props {
  /** 活跃聊天数量 */
  activeChatsCount: number;
  /** 是否正在处理中 */
  isProcessing: boolean;
}

interface Emits {
  /** 添加更多模型 */
  'add-more-models': [];
  /** 关闭所有聊天 */
  'close-all-chats': [];
}

defineProps<Props>();
defineEmits<Emits>();
</script>

<style scoped>
.chat-header {
  border-bottom: 1px solid var(--bs-border-color);
  padding: 1rem;
  background: var(--bs-body-bg);
  flex-shrink: 0;
}
</style> 