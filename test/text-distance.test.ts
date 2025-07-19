import { describe, it, expect, beforeEach } from 'vitest';
import { createHNSWIndex } from '../src/generic';

describe('Text Distance HNSW Index', () => {
  describe('编辑距离测试', () => {
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

    it('应该正确处理编辑距离搜索', () => {
      // 插入测试字符串
      const strings = [
        'hello',
        'world',
        'help',
        'hell',
        'hero',
        'helpful',
        'helper',
        'helicopter'
      ];

      strings.forEach(str => index.insertNode(str));

      // 测试1: 搜索'help'
      const results1 = index.search('help', 3);
      expect(results1.length).toBeGreaterThan(0);
      expect(results1[0]!.idx).toBe(2); // 'help' 应该匹配自己
      expect(results1[0]!.distance).toBe(0);

      // 测试2: 搜索'helo' (编辑距离为1)
      const results2 = index.search('helo', 3);
      expect(results2.length).toBeGreaterThan(0);
      // 应该找到编辑距离为1的字符串
      const hasDistance1 = results2.some(result => result.distance === 1);
      expect(hasDistance1).toBe(true);

      // 测试3: 搜索'helicopter' (编辑距离较大的字符串)
      const results3 = index.search('helicopter', 3);
      expect(results3.length).toBeGreaterThan(0);
      // 应该找到编辑距离最小的字符串
      expect(results3[0]!.distance).toBeLessThanOrEqual(results3[1]!.distance);
    });

    it('应该支持删除功能', () => {
      const strings = ['hello', 'world', 'help', 'hell', 'hero'];
      strings.forEach(str => index.insertNode(str));

      // 删除'help'
      expect(index.deleteNode(2)).toBe(true);

      // 搜索'help'应该排除已删除的字符串
      const results = index.search('help', 3);
      const deletedStringInResults = results.some(result => result.idx === 2);
      expect(deletedStringInResults).toBe(false);

      // 验证统计信息
      const stats = index.getStats();
      expect(stats.activeNodeCount).toBe(4);
      expect(stats.deletedNodeCount).toBe(1);
    });

    it('应该处理空字符串', () => {
      const strings = ['', 'hello', 'world'];
      strings.forEach(str => index.insertNode(str));

      // 搜索空字符串
      const results = index.search('', 2);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.idx).toBe(0); // 空字符串应该匹配自己
      expect(results[0]!.distance).toBe(0);
    });

    it('应该处理长字符串', () => {
      const strings = [
        'supercalifragilisticexpialidocious',
        'supercalifragilisticexpialidociousness',
        'supercalifragilisticexpialidociousity',
        'supercalifragilisticexpialidociousnessness'
      ];

      strings.forEach(str => index.insertNode(str));

      // 搜索长字符串
      const query = 'supercalifragilisticexpialidocious';
      const results = index.search(query, 2);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.idx).toBe(0); // 应该匹配自己
      expect(results[0]!.distance).toBe(0);
    });
  });

  describe('Jaccard距离测试', () => {
    let index: ReturnType<typeof createHNSWIndex<string>>;

    beforeEach(() => {
      // Jaccard距离函数
      const jaccardDistance = (a: string, b: string): number => {
        const setA = new Set(a.split(''));
        const setB = new Set(b.split(''));
        
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        
        if (union.size === 0) return 0;
        return 1 - intersection.size / union.size;
      };

      index = createHNSWIndex({
        M: 16,
        efConstruction: 200,
        distanceFunction: jaccardDistance
      });
    });

    it('应该正确处理Jaccard距离搜索', () => {
      const strings = [
        'hello',
        'world',
        'help',
        'hell',
        'hero',
        'helpful',
        'helper'
      ];

      strings.forEach(str => index.insertNode(str));

      // 搜索'hello'
      const results = index.search('hello', 3);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.idx).toBe(0); // 'hello' 应该匹配自己
      expect(results[0]!.distance).toBe(0);

      // 搜索'help'，应该找到字符重叠较多的字符串
      const results2 = index.search('help', 3);
      expect(results2.length).toBeGreaterThan(0);
      // 应该找到与'help'字符重叠最多的字符串
      const hasHelp = results2.some(result => result.idx === 2);
      expect(hasHelp).toBe(true);
    });
  });

  describe('Levenshtein距离测试', () => {
    let index: ReturnType<typeof createHNSWIndex<string>>;

    beforeEach(() => {
      // Levenshtein距离函数（与编辑距离相同，但更明确的实现）
      const levenshteinDistance = (a: string, b: string): number => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

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
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i]![j] = Math.min(
              matrix[i - 1]![j]! + 1,     // 删除
              matrix[i]![j - 1]! + 1,     // 插入
              matrix[i - 1]![j - 1]! + indicator  // 替换
            );
          }
        }
        
        return matrix[a.length]![b.length]!;
      };

      index = createHNSWIndex({
        M: 16,
        efConstruction: 200,
        distanceFunction: levenshteinDistance
      });
    });

    it('应该正确处理Levenshtein距离搜索', () => {
      const strings = [
        'kitten',
        'sitting',
        'kitchen',
        'chicken',
        'kittenish',
        'sittingroom'
      ];

      strings.forEach(str => index.insertNode(str));

      // 搜索'kitten'
      const results = index.search('kitten', 3);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.idx).toBe(0); // 'kitten' 应该匹配自己
      expect(results[0]!.distance).toBe(0);

      // 搜索'sitting'，应该找到距离最小的字符串
      const results2 = index.search('sitting', 3);
      expect(results2.length).toBeGreaterThan(0);
      expect(results2[0]!.idx).toBe(1); // 'sitting' 应该匹配自己
      expect(results2[0]!.distance).toBe(0);
    });
  });

  describe('N-gram距离测试', () => {
    let index: ReturnType<typeof createHNSWIndex<string>>;

    beforeEach(() => {
      // N-gram距离函数
      const ngramDistance = (a: string, b: string, n: number = 2): number => {
        const getNGrams = (str: string, n: number): Set<string> => {
          const ngrams = new Set<string>();
          for (let i = 0; i <= str.length - n; i++) {
            ngrams.add(str.slice(i, i + n));
          }
          return ngrams;
        };

        const ngramsA = getNGrams(a, n);
        const ngramsB = getNGrams(b, n);
        
        const intersection = new Set([...ngramsA].filter(x => ngramsB.has(x)));
        const union = new Set([...ngramsA, ...ngramsB]);
        
        if (union.size === 0) return 0;
        return 1 - intersection.size / union.size;
      };

      index = createHNSWIndex({
        M: 16,
        efConstruction: 200,
        distanceFunction: (a: string, b: string) => ngramDistance(a, b, 2)
      });
    });

    it('应该正确处理N-gram距离搜索', () => {
      const strings = [
        'hello',
        'world',
        'help',
        'hell',
        'hero',
        'helpful',
        'helper'
      ];

      strings.forEach(str => index.insertNode(str));

      // 搜索'hello'
      const results = index.search('hello', 3);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.idx).toBe(0); // 'hello' 应该匹配自己
      expect(results[0]!.distance).toBe(0);

      // 搜索'help'，应该找到2-gram重叠较多的字符串
      const results2 = index.search('help', 3);
      expect(results2.length).toBeGreaterThan(0);
      // 应该找到与'help' 2-gram重叠最多的字符串
      const hasHelp = results2.some(result => result.idx === 2);
      expect(hasHelp).toBe(true);
    });
  });

  describe('性能测试', () => {
    let index: ReturnType<typeof createHNSWIndex<string>>;

    beforeEach(() => {
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
                matrix[i - 1]![j]! + 1,
                matrix[i]![j - 1]! + 1,
                matrix[i - 1]![j - 1]! + 1
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

    it('应该在大规模数据上表现良好', () => {
      // 生成大量测试字符串
      const strings: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const length = Math.floor(Math.random() * 10) + 5;
        let str = '';
        for (let j = 0; j < length; j++) {
          str += String.fromCharCode(97 + Math.floor(Math.random() * 26));
        }
        strings.push(str);
      }

      // 插入所有字符串
      const startTime = performance.now();
      strings.forEach(str => index.insertNode(str));
      const insertTime = performance.now() - startTime;

      console.log(`插入1000个字符串耗时: ${insertTime.toFixed(2)}ms`);

      // 测试搜索性能
      const searchQueries = ['hello', 'world', 'test', 'search', 'query'];
      const searchTimes: number[] = [];

      for (const query of searchQueries) {
        const startTime = performance.now();
        const results = index.search(query, 10);
        const searchTime = performance.now() - startTime;
        searchTimes.push(searchTime);

        expect(results.length).toBeGreaterThan(0);
      }

      const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
      console.log(`平均搜索时间: ${avgSearchTime.toFixed(2)}ms`);

      // 验证性能在合理范围内
      expect(insertTime).toBeLessThan(5000); // 插入时间应该小于5秒
      expect(avgSearchTime).toBeLessThan(100); // 平均搜索时间应该小于100ms
    });

    it('应该正确处理删除操作', () => {
      const strings = ['hello', 'world', 'help', 'hell', 'hero'];
      strings.forEach(str => index.insertNode(str));

      // 删除一些字符串
      expect(index.deleteNode(1)).toBe(true);
      expect(index.deleteNode(3)).toBe(true);

      // 验证删除后的搜索
      const results = index.search('hello', 3);
      expect(results.length).toBeGreaterThan(0);

      // 确保删除的字符串不在结果中
      const deletedInResults = results.some(result => result.idx === 1 || result.idx === 3);
      expect(deletedInResults).toBe(false);

      // 验证统计信息
      const stats = index.getStats();
      expect(stats.activeNodeCount).toBe(3);
      expect(stats.deletedNodeCount).toBe(2);
    });
  });
}); 