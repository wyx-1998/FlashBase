import Store from 'electron-store';
import { HistoryItem } from '../shared/types';
import { HISTORY_CONFIG } from '../shared/constants';

export class HistoryManager {
  private store: Store<{ items: HistoryItem[] }>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.store = new Store<{ items: HistoryItem[] }>({
      name: 'flashbase-dev-history',
      defaults: { items: [] },
      fileExtension: 'json'
    });
  }

  /**
   * 初始化历史管理器
   */
  async initialize(): Promise<void> {
    // 启动清理任务
    this.startCleanupTask();
    
    // 初始清理过期记录
    await this.cleanupExpiredItems();
    
    console.log('历史记录管理器初始化成功');
  }

  /**
   * 添加历史记录项
   */
  async addItem(item: HistoryItem): Promise<void> {
    const items = this.getHistory();
    
    // 添加到开头
    items.unshift(item);
    
    // 限制最大数量
    if (items.length > HISTORY_CONFIG.maxItems) {
      items.splice(HISTORY_CONFIG.maxItems);
    }
    
    this.store.set('items', items);
  }

  /**
   * 获取历史记录
   */
  getHistory(): HistoryItem[] {
    return this.store.get('items', []);
  }

  /**
   * 根据ID获取历史记录项
   */
  getItem(id: string): HistoryItem | undefined {
    const items = this.getHistory();
    return items.find(item => item.id === id);
  }

  /**
   * 删除历史记录项
   */
  deleteItem(id: string): boolean {
    const items = this.getHistory();
    const index = items.findIndex(item => item.id === id);
    
    if (index !== -1) {
      items.splice(index, 1);
      this.store.set('items', items);
      return true;
    }
    
    return false;
  }

  /**
   * 清空所有历史记录
   */
  async clearHistory(): Promise<void> {
    this.store.set('items', []);
  }

  /**
   * 搜索历史记录
   */
  searchHistory(query: string): HistoryItem[] {
    const items = this.getHistory();
    const lowerQuery = query.toLowerCase();
    
    return items.filter(item => 
      item.content.toLowerCase().includes(lowerQuery) ||
      item.source.toLowerCase().includes(lowerQuery) ||
      item.metadata.applicationName?.toLowerCase().includes(lowerQuery) ||
      item.metadata.windowTitle?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 按类型过滤历史记录
   */
  filterByType(type: string): HistoryItem[] {
    const items = this.getHistory();
    return items.filter(item => item.type === type);
  }

  /**
   * 按来源过滤历史记录
   */
  filterBySource(source: string): HistoryItem[] {
    const items = this.getHistory();
    return items.filter(item => item.source === source);
  }

  /**
   * 按时间范围过滤历史记录
   */
  filterByTimeRange(startTime: number, endTime: number): HistoryItem[] {
    const items = this.getHistory();
    return items.filter(item => 
      item.timestamp >= startTime && item.timestamp <= endTime
    );
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    total: number;
    byType: { [key: string]: number };
    bySource: { [key: string]: number };
    successful: number;
    failed: number;
  } {
    const items = this.getHistory();
    const stats = {
      total: items.length,
      byType: {} as { [key: string]: number },
      bySource: {} as { [key: string]: number },
      successful: 0,
      failed: 0
    };

    items.forEach(item => {
      // 按类型统计
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      
      // 按来源统计
      stats.bySource[item.source] = (stats.bySource[item.source] || 0) + 1;
      
      // 按结果统计
      if (item.result?.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }
    });

    return stats;
  }

  /**
   * 导出历史记录
   */
  exportHistory(): string {
    const items = this.getHistory();
    return JSON.stringify(items, null, 2);
  }

  /**
   * 导入历史记录
   */
  importHistory(historyJson: string): boolean {
    try {
      const items = JSON.parse(historyJson) as HistoryItem[];
      
      // 验证数据结构
      if (Array.isArray(items) && this.validateHistoryItems(items)) {
        this.store.set('items', items);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('导入历史记录失败:', error);
      return false;
    }
  }

  /**
   * 验证历史记录项
   */
  private validateHistoryItems(items: any[]): items is HistoryItem[] {
    return items.every(item => 
      item &&
      typeof item.id === 'string' &&
      typeof item.content === 'string' &&
      typeof item.type === 'string' &&
      typeof item.source === 'string' &&
      typeof item.timestamp === 'number' &&
      item.metadata
    );
  }

  /**
   * 清理过期记录
   */
  private async cleanupExpiredItems(): Promise<void> {
    const items = this.getHistory();
    const now = Date.now();
    const cutoffTime = now - HISTORY_CONFIG.retention;
    
    const validItems = items.filter(item => item.timestamp > cutoffTime);
    
    if (validItems.length !== items.length) {
      this.store.set('items', validItems);
      console.log(`清理了 ${items.length - validItems.length} 条过期历史记录`);
    }
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, HISTORY_CONFIG.cleanupInterval);
  }

  /**
   * 停止清理任务
   */
  private stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 获取历史记录文件路径
   */
  getHistoryPath(): string {
    return this.store.path;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopCleanupTask();
  }

  /**
   * 获取最近的记录
   */
  getRecentItems(count: number = 10): HistoryItem[] {
    const items = this.getHistory();
    return items.slice(0, count);
  }

  /**
   * 更新历史记录项
   */
  updateItem(id: string, updates: Partial<HistoryItem>): boolean {
    const items = this.getHistory();
    const index = items.findIndex(item => item.id === id);
    
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      this.store.set('items', items);
      return true;
    }
    
    return false;
  }
}