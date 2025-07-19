<template>
  <div v-if="isVisible" class="modal-backdrop-custom">
    <div class="modal-dialog-custom">
      <div class="modal-content-custom">
        <div class="modal-header-custom">
          <h5 class="modal-title">编辑消息</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body-custom">
          <form @submit.prevent="$emit('save', editText)">
            <div class="mb-3">
              <label class="form-label">消息内容</label>
              <textarea 
                v-model="editText" 
                class="form-control" 
                rows="4" 
                required
                placeholder="输入消息内容..."
              ></textarea>
            </div>
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-secondary btn-sm" @click="$emit('close')">取消</button>
              <button type="submit" class="btn btn-primary btn-sm">保存</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

/**
 * 编辑消息弹窗组件
 * 提供消息编辑功能
 */
interface Props {
  /** 是否显示弹窗 */
  isVisible: boolean;
  /** 要编辑的消息内容 */
  messageText: string;
}

interface Emits {
  /** 关闭弹窗 */
  'close': [];
  /** 保存编辑 */
  'save': [newText: string];
}

const props = defineProps<Props>();
defineEmits<Emits>();

const editText = ref(props.messageText);

// 监听消息内容变化
watch(() => props.messageText, (newValue) => {
  editText.value = newValue;
});
</script>

<style scoped>
/* 编辑消息弹窗样式 */
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
  min-width: 400px;
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