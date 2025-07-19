<template>
  <div 
    class="modal fade" 
    id="settingsModal" 
    tabindex="-1" 
    aria-labelledby="settingsModalLabel" 
    data-bs-backdrop="static" 
    data-bs-keyboard="false"
    :inert="!isVisible"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="settingsModalLabel">AI Provider Settings</h5>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label for="apiProvider" class="form-label">AI Provider</label>
            <select id="apiProvider" class="form-select" v-model="settings.provider">
              <option value="google">Google Gemini</option>
              <option value="openai">OpenAI & Compatible</option>
            </select>
          </div>

          <div class="mb-3">
            <label for="apiKey" class="form-label">API Key</label>
            <input type="password" id="apiKey" class="form-control" v-model="settings.apiKey" placeholder="Your API Key">
          </div>
          
          <div v-if="settings.provider === 'openai'" class="mb-3">
            <label for="apiEndpoint" class="form-label">API Endpoint (Optional)</label>
            <input type="text" id="apiEndpoint" class="form-control" v-model="settings.apiEndpoint" placeholder="e.g., https://api.openai.com">
            <div class="form-text">For OpenAI-compatible services like local LLMs.</div>
          </div>

          <div class="mb-3">
            <label for="chatModel" class="form-label">Chat Model</label>
            <input type="text" id="chatModel" class="form-control" v-model="settings.chatModel">
          </div>
          
          <div class="form-text">
            Your settings are stored only in your browser for this session.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" @click="$emit('saveSettings')" :disabled="!settings.apiKey || !settings.chatModel">Save Settings</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Settings {
  provider: 'google' | 'openai';
  apiKey: string;
  apiEndpoint: string;
  chatModel: string;
}

interface Props {
  settings: Settings;
  isVisible: boolean;
}

defineProps<Props>();
defineEmits<{
  saveSettings: [];
}>();
</script>

<style scoped>
/* 模态框样式继承Bootstrap主题 */
</style> 