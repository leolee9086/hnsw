<template>
  <header class="app-header">
    <div class="header-content">
      <div class="d-flex align-items-center">
        <i class="bi bi-robot fs-4 me-2"></i>
        <h5 class="mb-0">HNSW RAG Demo</h5>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button 
          v-if="!chatProvider" 
          class="btn btn-outline-primary btn-sm" 
          @click="$emit('showSettings')"
          title="配置AI提供者"
        >
          <i class="bi bi-gear me-1"></i>
          配置AI
        </button>
        <span class="badge rounded-pill" :class="status.badgeClass">{{ status.text }}</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">

import type { ChatProvider } from '../services/AIProviderService';

interface Props {
  chatProvider?: ChatProvider | null;
  status: {
    text: string;
    badgeClass: string;
  };
}

defineProps<Props>();
defineEmits<{
  showSettings: [];
}>();
</script>

<style scoped>
.app-header {
  background: var(--bs-body-bg);
  border-bottom: 1px solid var(--bs-border-color);
  padding: 0.75rem 1rem;
  flex-shrink: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style> 