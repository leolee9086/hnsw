import { ref, nextTick } from 'vue';

export interface ProcessStep {
  id: string;
  title: string;
  type: 'search' | 'embedding' | 'generation';
  status: 'pending' | 'processing' | 'success' | 'error';
  time: string;
  details?: any;
}

export class ProcessStepManager {
  private steps = ref<ProcessStep[]>([]);
  private containerRef: HTMLElement | null = null;

  constructor(containerRef?: HTMLElement | null) {
    this.containerRef = containerRef || null;
  }

  setContainer(container: HTMLElement | null) {
    this.containerRef = container;
  }

  addStep(step: Omit<ProcessStep, 'id' | 'time'>): string {
    const newStep: ProcessStep = {
      ...step,
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString()
    };
    this.steps.value.push(newStep);
    this.scrollToBottom();
    return newStep.id;
  }

  updateStep(id: string, updates: Partial<ProcessStep>) {
    const step = this.steps.value.find(s => s.id === id);
    if (step) {
      Object.assign(step, updates);
    }
  }

  clearSteps() {
    this.steps.value = [];
  }

  getSteps() {
    return this.steps;
  }

  private scrollToBottom() {
    nextTick(() => {
      this.containerRef?.scrollTo({ 
        top: this.containerRef.scrollHeight, 
        behavior: 'smooth' 
      });
    });
  }

  // 便捷方法
  addSearchStep(query: string): string {
    return this.addStep({
      title: '搜索相关文档片段',
      type: 'search',
      status: 'processing',
      details: { query }
    });
  }

  addEmbeddingStep(text: string): string {
    return this.addStep({
      title: '向量化文本',
      type: 'embedding',
      status: 'processing',
      details: { text }
    });
  }

  addGenerationStep(): string {
    return this.addStep({
      title: '生成AI回复',
      type: 'generation',
      status: 'processing'
    });
  }

  updateSearchResults(stepId: string, results: any[]) {
    this.updateStep(stepId, {
      status: 'success',
      details: {
        results: results.map(result => ({
          text: result.text,
          score: result.score,
          file: result.file || 'document'
        }))
      }
    });
  }

  updateEmbeddingResults(stepId: string, dimensions: number, duration: number) {
    this.updateStep(stepId, {
      status: 'success',
      details: {
        dimensions,
        duration
      }
    });
  }

  updateGenerationResults(stepId: string, text: string) {
    this.updateStep(stepId, {
      status: 'success',
      details: { text }
    });
  }

  markStepAsError(stepId: string, error: string) {
    this.updateStep(stepId, {
      status: 'error',
      details: { error }
    });
  }
} 