import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  FastGPTConfig, 
  KnowledgeBase, 
  ImportData, 
  ImportResult, 
  BatchResult 
} from '../../shared/types';
import { API_ENDPOINTS, ERROR_CODES } from '../../shared/constants';

export class FastGPTClient {
  private api: AxiosInstance;
  private config: FastGPTConfig;

  constructor(config: FastGPTConfig) {
    this.config = config;
    this.api = this.createApiInstance();
  }

  /**
   * 创建 API 实例
   */
  private createApiInstance(): AxiosInstance {
    // 如果没有配置baseUrl，使用一个占位符URL来避免Invalid URL错误
    const baseURL = this.config.baseUrl || 'http://localhost:3000';
    
    return axios.create({
      baseURL: baseURL,
      timeout: this.config.timeout || 10000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey || ''}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 更新配置
   */
  updateConfig(config: FastGPTConfig): void {
    this.config = config;
    this.api = this.createApiInstance();
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    // 首先验证配置是否有效
    const validation = this.validateConfig();
    if (!validation.valid) {
      console.error('FastGPT 配置无效:', validation.errors.join(', '));
      return false;
    }

    try {
      const response = await this.api.post(API_ENDPOINTS.TEST_CONNECTION, {
        parentId: ""
      });
      return response.status === 200;
    } catch (error) {
      console.error('FastGPT 连接测试失败:', error);
      return false;
    }
  }

  /**
   * 获取知识库列表
   */
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    try {
      const response = await this.api.post(API_ENDPOINTS.KNOWLEDGE_BASES, {
        parentId: ""
      });
      
      if (response.data && response.data.data) {
        return response.data.data.map((item: any) => ({
          id: item._id || item.id,
          name: item.name,
          description: item.intro,
          type: item.type || 'dataset'
        }));
      }
      
      return [];
    } catch (error) {
      console.error('获取知识库列表失败:', error);
      throw new Error(ERROR_CODES.FASTGPT_CONNECTION_FAILED);
    }
  }

  /**
   * 检查知识库写权限（使用列表接口的权限信息）
   */
  async checkWritePermission(datasetId: string): Promise<boolean> {
    try {
      // 获取知识库列表，其中包含权限信息
      const response = await this.api.post(API_ENDPOINTS.KNOWLEDGE_BASES, {
        parentId: ""
      });
      
      if (response.data && response.data.data) {
        const datasets = response.data.data;
        
        // 查找目标知识库
        const targetDataset = datasets.find((item: any) => 
          (item._id || item.id) === datasetId
        );
        
        if (targetDataset && targetDataset.permission) {
          const permission = targetDataset.permission;
          const hasWritePer = permission.hasWritePer || false;
          const isOwner = permission.isOwner || false;
          
          console.log(`知识库 ${targetDataset.name} 权限检查: hasWritePer=${hasWritePer}, isOwner=${isOwner}`);
          
          // 返回是否有写权限或者是拥有者
          return hasWritePer || isOwner;
        }
      }
      
      return false;
    } catch (error) {
      console.warn(`检查知识库 ${datasetId} 权限失败:`, error);
      return false;
    }
  }

  /**
   * 获取知识库的集合列表
   */
  async getCollections(datasetId: string): Promise<any[]> {
    try {
      console.log(`调用集合列表API: datasetId=${datasetId}`);
      const response = await this.api.post('/api/core/dataset/collection/listV2', {
        datasetId,
        offset: 0,
        pageSize: 30,
        parentId: null
      });

      console.log(`集合列表API响应状态: ${response.status}`);
      console.log('集合列表API响应数据:', response.data);

      // FastGPT API响应结构: response.data.data.list
      if (response.data && response.data.data && response.data.data.list) {
        console.log(`找到 ${response.data.data.list.length} 个集合`);
        return response.data.data.list;
      }
      
      console.log('集合列表响应中没有正确的数据结构');
      console.log('期望: response.data.data.list, 实际:', {
        hasData: !!response.data,
        hasDataData: !!(response.data && response.data.data),
        hasDataDataList: !!(response.data && response.data.data && response.data.data.list)
      });
      return [];
    } catch (error: any) {
      console.error('获取集合列表失败:', error);
      if (error.response) {
        console.error('错误响应:', error.response.status, error.response.data);
      }
      return [];
    }
  }

  /**
   * 创建一个默认集合
   */
  async createDefaultCollection(datasetId: string): Promise<string | null> {
    try {
      console.log(`调用创建集合API: datasetId=${datasetId}`);
      const requestData = {
        datasetId,
        parentId: null,
        name: '默认导入集合',
        type: 'file',
        metadata: {}
      };
      console.log('创建集合请求数据:', requestData);
      
      const response = await this.api.post('/api/core/dataset/collection/create', requestData);

      console.log(`创建集合API响应状态: ${response.status}`);
      console.log('创建集合API响应数据:', response.data);

      // FastGPT API响应结构: response.data.data
      if (response.data && response.data.data) {
        // 尝试从响应中提取集合ID  
        const collectionId = response.data.data._id || response.data.data.id || response.data.data;
        console.log('提取的集合ID:', collectionId);
        return collectionId;
      }
      
      console.log('创建集合响应中没有正确的数据结构');
      console.log('期望: response.data.data, 实际:', {
        hasData: !!response.data,
        hasDataData: !!(response.data && response.data.data),
        dataType: typeof (response.data && response.data.data)
      });
      return null;
    } catch (error: any) {
      console.error('创建默认集合失败:', error);
      if (error.response) {
        console.error('创建集合错误响应:', error.response.status, error.response.data);
      }
      return null;
    }
  }

  /**
   * 导入内容到知识库
   */
  async importContent(data: ImportData): Promise<ImportResult> {
    try {
      console.log(`开始导入到知识库: ${data.knowledgeBaseId}`);
      
      // 检查知识库ID是否存在
      if (!data.knowledgeBaseId) {
        return {
          success: false,
          error: '知识库ID不能为空'
        };
      }
      
      // 先获取知识库的集合列表
      console.log('正在获取知识库的集合列表...');
      let collections = await this.getCollections(data.knowledgeBaseId);
      console.log(`获取到 ${collections.length} 个集合:`, collections.map(c => ({ id: c._id, name: c.name })));
      
      // 如果没有集合，创建一个默认集合
      if (collections.length === 0) {
        console.log('知识库中没有集合，尝试创建默认集合...');
        const newCollectionId = await this.createDefaultCollection(data.knowledgeBaseId);
        console.log('创建集合结果:', newCollectionId);
        
        if (!newCollectionId) {
          console.error('创建默认集合失败');
          return {
            success: false,
            error: '无法创建集合'
          };
        }
        
        console.log('默认集合创建成功，重新获取集合列表...');
        // 重新获取集合列表
        collections = await this.getCollections(data.knowledgeBaseId);
        console.log(`重新获取后有 ${collections.length} 个集合`);
      }

      if (collections.length === 0) {
        console.error('即使创建了默认集合，仍然没有可用的集合');
        return {
          success: false,
          error: '知识库中没有可用的集合'
        };
      }

      // 使用第一个集合
      const collectionId = collections[0]._id;

      const requestData = {
        collectionId: collectionId,  // 使用集合ID
        trainingType: 'chunk',       // 添加训练类型
        data: [
          {
            q: data.content,          // 主要数据
            a: ''                     // 辅助数据（可以为空）
          }
        ]
      };

      const response: AxiosResponse = await this.api.post(
        API_ENDPOINTS.IMPORT_DATA,
        requestData
      );

      if (response.status === 200 && response.data) {
        return {
          success: true,
          insertId: response.data.insertLen ? `插入了 ${response.data.insertLen} 条数据` : '导入成功',
          message: '导入成功'
        };
      } else {
        return {
          success: false,
          error: '导入失败，服务器返回异常状态'
        };
      }
    } catch (error: any) {
      console.error('导入内容失败:', error);
      
      let errorMessage = '导入失败';
      if (error.response) {
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      `服务器错误 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = '网络连接失败';
      } else {
        errorMessage = error.message || '未知错误';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 批量导入内容
   */
  async batchImport(items: ImportData[]): Promise<BatchResult> {
    const results: ImportResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of items) {
      try {
        const result = await this.importContent(item);
        results.push(result);
        
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        results.push({
          success: false,
          error: '批量导入过程中发生错误'
        });
        failedCount++;
      }
    }

    return {
      total: items.length,
      success: successCount,
      failed: failedCount,
      results
    };
  }

  /**
   * 搜索知识库内容
   */
  async searchKnowledge(query: string, datasetId?: string): Promise<any[]> {
    try {
      const requestData = {
        chatId: '',
        query,
        datasetIds: datasetId ? [datasetId] : []
      };

      const response = await this.api.post('/api/core/dataset/searchTest', requestData);
      
      if (response.data && response.data.list) {
        return response.data.list;
      }
      
      return [];
    } catch (error) {
      console.error('搜索知识库失败:', error);
      return [];
    }
  }

  /**
   * 删除知识库中的数据
   */
  async deleteKnowledgeData(datasetId: string, dataId: string): Promise<boolean> {
    try {
      const response = await this.api.delete(`/api/core/dataset/data/delete`, {
        data: {
          datasetId,
          dataId
        }
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('删除知识库数据失败:', error);
      return false;
    }
  }

  /**
   * 获取 API 状态
   */
  async getApiStatus(): Promise<{
    status: 'online' | 'offline' | 'error';
    message: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.api.get(API_ENDPOINTS.TEST_CONNECTION);
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        return {
          status: 'online',
          message: 'API 连接正常',
          responseTime
        };
      } else {
        return {
          status: 'error',
          message: `API 返回异常状态: ${response.status}`
        };
      }
    } catch (error: any) {
      return {
        status: 'offline',
        message: error.message || 'API 连接失败'
      };
    }
  }

  /**
   * 验证配置有效性
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.baseUrl) {
      errors.push('API 地址不能为空');
    } else {
      try {
        new URL(this.config.baseUrl);
      } catch {
        errors.push('API 地址格式无效');
      }
    }

    if (!this.config.apiKey) {
      errors.push('API 密钥不能为空');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}