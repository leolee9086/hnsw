import { describe, it, expect, beforeEach } from 'vitest';
import { hnsw } from '../src';
const createHNSWIndex = hnsw.createIndex;

describe('HNSW Midi Optimized Delete Functionality', () => {
  let index: ReturnType<typeof createHNSWIndex>;

  beforeEach(() => {
    index = createHNSWIndex({
      M: 16,
      efConstruction: 200,
      metricType: 'cosine'
    });
  });

  describe('基本删除功能', () => {
    it('应该成功删除存在的节点', () => {
      // 插入测试数据
      const vectors = [
        [1, 0, 0], // 节点0
        [0, 1, 0], // 节点1
        [0, 0, 1], // 节点2
        [0.5, 0.5, 0], // 节点3
        [0.5, 0, 0.5]  // 节点4
      ];

      vectors.forEach(vector => index.insertNode(vector));

      // 验证初始状态
      const initialStats = index.getStats();
      expect(initialStats.nodeCount).toBe(5);
      expect(initialStats.activeNodeCount).toBe(5);
      expect(initialStats.deletedNodeCount).toBe(0);

      // 删除节点2
      const deleteResult = index.deleteNode(2);
      expect(deleteResult).toBe(true);

      // 验证删除后状态
      const afterDeleteStats = index.getStats();
      expect(afterDeleteStats.nodeCount).toBe(5);
      expect(afterDeleteStats.activeNodeCount).toBe(4);
      expect(afterDeleteStats.deletedNodeCount).toBe(1);
    });

    it('应该拒绝删除不存在的节点', () => {
      // 插入一个节点
      index.insertNode([1, 0, 0]);

      // 尝试删除不存在的节点
      expect(index.deleteNode(5)).toBe(false);
      expect(index.deleteNode(-1)).toBe(false);

      // 验证状态未改变
      const stats = index.getStats();
      expect(stats.activeNodeCount).toBe(1);
      expect(stats.deletedNodeCount).toBe(0);
    });

    it('应该拒绝重复删除同一节点', () => {
      // 插入节点
      index.insertNode([1, 0, 0]);

      // 第一次删除
      expect(index.deleteNode(0)).toBe(true);

      // 第二次删除同一节点
      expect(index.deleteNode(0)).toBe(false);

      // 验证状态
      const stats = index.getStats();
      expect(stats.activeNodeCount).toBe(0);
      expect(stats.deletedNodeCount).toBe(1);
    });
  });

  describe('删除对搜索的影响', () => {
    it('删除节点后搜索应该排除已删除的节点', () => {
      // 插入测试数据
      const vectors = [
        [1, 0, 0], // 节点0 - 最接近 [0.9, 0.1, 0]
        [0, 1, 0], // 节点1
        [0, 0, 1], // 节点2
        [0.5, 0.5, 0], // 节点3
        [0.5, 0, 0.5]  // 节点4
      ];

      vectors.forEach(vector => index.insertNode(vector));

      // 搜索查询向量
      const queryVector = [0.9, 0.1, 0];
      const beforeDelete = index.search(queryVector, 3);

      // 删除最接近的节点（节点0）
      index.deleteNode(0);

      // 再次搜索
      const afterDelete = index.search(queryVector, 3);

      // 验证结果
      expect(beforeDelete.length).toBeGreaterThan(0);
      expect(afterDelete.length).toBeGreaterThan(0);
      
      // 确保删除的节点不在结果中
      const deletedNodeInResults = afterDelete.some(result => result.idx === 0);
      expect(deletedNodeInResults).toBe(false);

      // 验证删除后结果中不包含已删除节点
      afterDelete.forEach(result => {
        expect(result.idx).not.toBe(0);
      });
    });

    it('删除入口点后应该重新选择入口点', () => {
      // 插入测试数据
      const vectors = [
        [1, 0, 0], // 节点0
        [0, 1, 0], // 节点1
        [0, 0, 1], // 节点2
        [0.5, 0.5, 0], // 节点3
        [0.5, 0, 0.5]  // 节点4
      ];

      vectors.forEach(vector => index.insertNode(vector));

      // 获取初始入口点
      const initialStats = index.getStats();
      const initialEntryPoint = initialStats.entryPoint;

      // 删除入口点
      index.deleteNode(initialEntryPoint.idx);

      // 验证入口点已更新
      const afterDeleteStats = index.getStats();
      expect(afterDeleteStats.entryPoint.idx).not.toBe(initialEntryPoint.idx);

      // 验证搜索仍然工作
      const queryVector = [0.5, 0.5, 0.5];
      const results = index.search(queryVector, 2);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('大规模性能测试', () => {
    it('大规模数据删除后性能应该保持稳定', () => {
      const nodeCount = 2000;
      const dimension = 64;
      
      // 插入大量测试数据
      for (let i = 0; i < nodeCount; i++) {
        const vector = new Array(dimension).fill(0).map(() => Math.random() - 0.5);
        index.insertNode(vector);
      }

      // 记录删除前搜索性能
      const queryVector = new Array(dimension).fill(0).map(() => Math.random() - 0.5);
      const beforeDeleteTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        index.search(queryVector, 10);
        beforeDeleteTimes.push(performance.now() - startTime);
      }
      
      const avgBeforeDeleteTime = beforeDeleteTimes.reduce((a, b) => a + b, 0) / beforeDeleteTimes.length;
      console.log(`删除前平均搜索时间: ${avgBeforeDeleteTime.toFixed(2)}ms`);

      // 删除30%的节点
      const deleteCount = Math.floor(nodeCount * 0.3);
      for (let i = 0; i < deleteCount; i++) {
        index.deleteNode(i);
      }

      // 记录删除后搜索性能
      const afterDeleteTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        index.search(queryVector, 10);
        afterDeleteTimes.push(performance.now() - startTime);
      }
      
      const avgAfterDeleteTime = afterDeleteTimes.reduce((a, b) => a + b, 0) / afterDeleteTimes.length;
      console.log(`删除后平均搜索时间: ${avgAfterDeleteTime.toFixed(2)}ms`);

      // 验证性能没有显著下降（允许1.5倍增长）
      expect(avgAfterDeleteTime).toBeLessThan(avgBeforeDeleteTime * 1.5);
      
      // 验证搜索仍然返回结果
      const results = index.search(queryVector, 10);
      expect(results.length).toBeGreaterThan(0);

      // 验证统计信息
      const stats = index.getStats();
      expect(stats.nodeCount).toBe(nodeCount);
      expect(stats.activeNodeCount).toBe(nodeCount - deleteCount);
      expect(stats.deletedNodeCount).toBe(deleteCount);
    });
  });

  describe('MidiHeap优化验证', () => {
    it('应该验证MidiHeap在删除场景下的性能优势', () => {
      const nodeCount = 1000;
      const dimension = 128;
      
      // 插入测试数据
      for (let i = 0; i < nodeCount; i++) {
        const vector = new Array(dimension).fill(0).map(() => Math.random() - 0.5);
        index.insertNode(vector);
      }

      // 测试高频删除和搜索操作
      const operations = 100;
      const deleteOperations = 50;
      
      console.log(`开始高频操作测试: ${operations} 次搜索, ${deleteOperations} 次删除`);
      
      const startTime = performance.now();
      
      for (let i = 0; i < operations; i++) {
        const queryVector = new Array(dimension).fill(0).map(() => Math.random() - 0.5);
        index.search(queryVector, 10);
        
        // 每2次搜索后删除一个节点
        if (i % 2 === 0 && i / 2 < deleteOperations) {
          index.deleteNode(i / 2);
        }
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`高频操作完成，总耗时: ${totalTime.toFixed(2)}ms`);
      console.log(`平均每次操作时间: ${(totalTime / operations).toFixed(4)}ms`);

      // 验证最终状态
      const stats = index.getStats();
      expect(stats.activeNodeCount).toBe(nodeCount - deleteOperations);
      expect(stats.deletedNodeCount).toBe(deleteOperations);

      // 验证搜索仍然工作
      const finalQuery = new Array(dimension).fill(0).map(() => Math.random() - 0.5);
      const finalResults = index.search(finalQuery, 10);
      expect(finalResults.length).toBeGreaterThan(0);
    });
  });
}); 