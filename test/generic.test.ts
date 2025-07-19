import { describe, it, expect, beforeEach } from 'vitest';
import { createHNSWIndex } from '../src/generic';

describe('Generic HNSW Index', () => {
  describe('向量相似性搜索', () => {
    let index: ReturnType<typeof createHNSWIndex<number[]>>;

    beforeEach(() => {
      // 余弦距离函数
      const cosineDistance = (a: number[], b: number[]): number => {
        if (a.length !== b.length) throw new Error('Vectors must have same length');
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
          dotProduct += a[i]! * b[i]!;
          normA += a[i]! * a[i]!;
          normB += b[i]! * b[i]!;
        }
        
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        
        if (normA === 0 || normB === 0) return 1.0;
        return 1.0 - dotProduct / (normA * normB);
      };

      index = createHNSWIndex({
        M: 16,
        efConstruction: 200,
        distanceFunction: cosineDistance
      });
    });

    it('应该正确处理向量相似性搜索', () => {
      // 插入测试向量
      const vectors = [
        [1, 0, 0], // 节点0
        [0, 1, 0], // 节点1
        [0, 0, 1], // 节点2
        [0.5, 0.5, 0], // 节点3
        [0.5, 0, 0.5]  // 节点4
      ];

      vectors.forEach(vector => index.insertNode(vector));

      // 搜索查询向量
      const queryVector = [0.9, 0.1, 0];
      const results = index.search(queryVector, 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.idx).toBe(0); // 应该找到最接近的节点0
    });

    it('应该支持删除功能', () => {
      const vectors = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];

      vectors.forEach(vector => index.insertNode(vector));

      // 删除节点1
      expect(index.deleteNode(1)).toBe(true);

      // 验证删除后状态
      const stats = index.getStats();
      expect(stats.activeNodeCount).toBe(2);
      expect(stats.deletedNodeCount).toBe(1);

      // 搜索应该排除已删除的节点
      const queryVector = [0, 0.9, 0];
      const results = index.search(queryVector, 2);
      
      // 确保删除的节点不在结果中
      const deletedNodeInResults = results.some(result => result.idx === 1);
      expect(deletedNodeInResults).toBe(false);
    });
  });

  describe('字符串相似性搜索', () => {
    let index: ReturnType<typeof createHNSWIndex<string>>;

    beforeEach(() => {
      // 编辑距离函数
      const editDistance = (a: string, b: string): number => {
        const matrix: number[][] = [];
        
        for (let i = 0; i <= a.length; i++) {
          matrix[i] = [];
          matrix[i]![0] = i;
        }
        
        for (let j = 0; j <= b.length; j++) {
          matrix[0]![j] = j;
        }
        
        for (let i = 1; i <= a.length; i++) {
          for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
              matrix[i]![j] = matrix[i - 1]![j - 1]!;
            } else {
              matrix[i]![j] = Math.min(
                matrix[i - 1]![j]! + 1,     // 删除
                matrix[i]![j - 1]! + 1,     // 插入
                matrix[i - 1]![j - 1]! + 1  // 替换
              );
            }
          }
        }
        
        return matrix[a.length]![b.length]!;
      };

      index = createHNSWIndex({
        M: 16,
        efConstruction: 200,
        distanceFunction: editDistance
      });
    });

    it('应该正确处理字符串相似性搜索', () => {
      // 插入测试字符串
      const strings = [
        'hello',
        'world',
        'help',
        'hell',
        'hero'
      ];

      strings.forEach(str => index.insertNode(str));

      // 搜索查询字符串
      const queryString = 'help';
      const results = index.search(queryString, 3);

      expect(results.length).toBeGreaterThan(0);
      // 应该找到编辑距离最小的字符串
      expect(results[0]!.idx).toBe(2); // 'help' 应该匹配自己
    });

    it('应该支持字符串删除功能', () => {
      const strings = ['hello', 'world', 'help'];
      strings.forEach(str => index.insertNode(str));

      // 删除一个字符串
      expect(index.deleteNode(1)).toBe(true);

      // 搜索应该排除已删除的字符串
      const results = index.search('world', 2);
      const deletedStringInResults = results.some(result => result.idx === 1);
      expect(deletedStringInResults).toBe(false);
    });
  });

  describe('自定义对象相似性搜索', () => {
    interface Point {
      x: number;
      y: number;
      label: string;
    }

    let index: ReturnType<typeof createHNSWIndex<Point>>;

    beforeEach(() => {
      // 欧几里得距离函数
      const euclideanDistance = (a: Point, b: Point): number => {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
      };

      index = createHNSWIndex({
        M: 16,
        efConstruction: 200,
        distanceFunction: euclideanDistance
      });
    });

    it('应该正确处理自定义对象相似性搜索', () => {
      // 插入测试点
      const points: Point[] = [
        { x: 0, y: 0, label: 'origin' },
        { x: 1, y: 0, label: 'right' },
        { x: 0, y: 1, label: 'up' },
        { x: 1, y: 1, label: 'diagonal' },
        { x: 0.5, y: 0.5, label: 'center' }
      ];

      points.forEach(point => index.insertNode(point));

      // 搜索查询点
      const queryPoint: Point = { x: 0.1, y: 0.1, label: 'near_origin' };
      const results = index.search(queryPoint, 3);

      expect(results.length).toBeGreaterThan(0);
      // 应该找到距离最近的点
      expect(results[0]!.idx).toBe(0); // 应该匹配原点
    });

    it('应该支持自定义对象删除功能', () => {
      const points: Point[] = [
        { x: 0, y: 0, label: 'origin' },
        { x: 1, y: 0, label: 'right' },
        { x: 0, y: 1, label: 'up' }
      ];

      points.forEach(point => index.insertNode(point));

      // 删除一个点
      expect(index.deleteNode(1)).toBe(true);

      // 搜索应该排除已删除的点
      const queryPoint: Point = { x: 1, y: 0, label: 'query' };
      const results = index.search(queryPoint, 2);
      const deletedPointInResults = results.some(result => result.idx === 1);
      expect(deletedPointInResults).toBe(false);
    });
  });

  describe('自定义距离函数优化', () => {
    let index: ReturnType<typeof createHNSWIndex<number[]>>;

    beforeEach(() => {
      // 优化的余弦距离函数，支持预计算范数
      const cosineDistanceOptimized = (a: number[], b: number[]): number => {
        if (a.length !== b.length) throw new Error('Vectors must have same length');
        
        let dotProduct = 0;
        let i = 0;

        // 循环展开优化
        for (; i < a.length - 3; i += 4) {
          dotProduct +=
            a[i]! * b[i]! +
            a[i + 1]! * b[i + 1]! +
            a[i + 2]! * b[i + 2]! +
            a[i + 3]! * b[i + 3]!;
        }

        // 处理剩余部分
        for (; i < a.length; i++) {
          dotProduct += a[i]! * b[i]!;
        }
        
        // 简化版本，假设向量已归一化
        return 1.0 - dotProduct;
      };

      index = createHNSWIndex({
        M: 16,
        efConstruction: 200,
        distanceFunction: cosineDistanceOptimized
      });
    });

    it('应该正确处理优化的距离函数', () => {
      // 插入归一化的测试向量
      const vectors = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [0.707, 0.707, 0],
        [0.707, 0, 0.707]
      ];

      vectors.forEach(vector => index.insertNode(vector));

      // 搜索查询向量
      const queryVector = [0.9, 0.1, 0];
      const results = index.search(queryVector, 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.idx).toBe(0); // 应该找到最接近的节点
    });
  });

  describe('大规模性能测试', () => {
    let index: ReturnType<typeof createHNSWIndex<number[]>>;

    beforeEach(() => {
      // 简单的欧几里得距离
      const euclideanDistance = (a: number[], b: number[]): number => {
        if (a.length !== b.length) throw new Error('Vectors must have same length');
        
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
          const diff = a[i]! - b[i]!;
          sum += diff * diff;
        }
        return sum; // 返回平方距离，避免开方运算
      };

      index = createHNSWIndex({
        M: 16,
        efConstruction: 200,
        distanceFunction: euclideanDistance
      });
    });

    it('大规模数据应该保持良好性能', () => {
      const nodeCount = 1000;
      const dimension = 64;
      
      // 插入大量测试数据
      for (let i = 0; i < nodeCount; i++) {
        const vector = new Array(dimension).fill(0).map(() => Math.random() - 0.5);
        index.insertNode(vector);
      }

      // 测试搜索性能
      const queryVector = new Array(dimension).fill(0).map(() => Math.random() - 0.5);
      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        index.search(queryVector, 10);
      }
      
      const avgTime = (performance.now() - startTime) / 10;
      console.log(`泛型版本平均搜索时间: ${avgTime.toFixed(2)}ms`);

      // 验证性能在合理范围内
      expect(avgTime).toBeLessThan(10); // 应该小于10ms

      // 测试删除性能
      const deleteStartTime = performance.now();
      for (let i = 0; i < 100; i++) {
        index.deleteNode(i);
      }
      const deleteTime = performance.now() - deleteStartTime;
      console.log(`删除100个节点耗时: ${deleteTime.toFixed(2)}ms`);

      // 验证删除后搜索仍然工作
      const afterDeleteResults = index.search(queryVector, 10);
      expect(afterDeleteResults.length).toBeGreaterThan(0);
    });
  });
}); 