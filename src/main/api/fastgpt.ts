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
        'Content-Type': 'application/json; charset=utf-8'
      },
      // 确保响应正确处理UTF-8编码
      responseType: 'json',
      responseEncoding: 'utf8',
      transformResponse: [
        function (data) {
          // 如果数据是字符串，确保正确解析JSON
          if (typeof data === 'string') {
            try {
              return JSON.parse(data);
            } catch (e) {
              return data;
            }
          }
          return data;
        }
      ]
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
        name: '从插件导入', // 修改集合名称，避免乱码
        type: 'file',
        metadata: {
          source: 'flashbase-plugin',
          description: '由FlashBase插件自动创建的集合'
        }
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
      console.log('导入数据详情:', {
        type: data.type,
        hasMetadata: !!data.metadata,
        originalPath: data.metadata?.originalPath,
        contentPreview: data.content.substring(0, 100)
      });
      
      // 检查知识库ID是否存在
      if (!data.knowledgeBaseId) {
        return {
          success: false,
          error: '知识库ID不能为空'
        };
      }
      
      // 如果是文件类型且有文件路径，使用文件上传API
      if (data.type === 'file' && data.metadata?.originalPath) {
        console.log('✓ 检测到文件上传请求，调用uploadFile方法');
        console.log('文件路径:', data.metadata.originalPath);
        return await this.uploadFile(data);
      }
      
      console.log('→ 使用普通文本导入方式');
      
      // 先获取知识库的集合列表
      console.log('正在获取知识库的集合列表...');
      let collections = await this.getCollections(data.knowledgeBaseId);
      console.log(`获取到 ${collections.length} 个集合:`, collections.map(c => ({ id: c._id, name: c.name })));
      
      // 查找"从插件导入"集合
      let targetCollection = collections.find(c => c.name === '从插件导入');
      
      // 如果没有找到"从插件导入"集合，创建一个
      if (!targetCollection) {
        console.log('没有找到"从插件导入"集合，尝试创建...');
        const newCollectionId = await this.createDefaultCollection(data.knowledgeBaseId);
        console.log('创建集合结果:', newCollectionId);
        
        if (!newCollectionId) {
          console.error('创建"从插件导入"集合失败');
          // 如果创建失败，使用第一个可用集合
          if (collections.length > 0) {
            console.log('使用第一个可用集合作为备选');
            targetCollection = collections[0];
          } else {
            return {
              success: false,
              error: '无法创建集合且没有可用集合'
            };
          }
        } else {
          console.log('"从插件导入"集合创建成功，重新获取集合列表...');
          // 重新获取集合列表
          collections = await this.getCollections(data.knowledgeBaseId);
          targetCollection = collections.find(c => c.name === '从插件导入') || collections[0];
        }
      } else {
        console.log('找到"从插件导入"集合:', targetCollection.name);
      }

      if (!targetCollection) {
        console.error('没有可用的集合');
        return {
          success: false,
          error: '知识库中没有可用的集合'
        };
      }

      console.log(`使用集合: ${targetCollection.name} (ID: ${targetCollection._id})`);
      const collectionId = targetCollection._id;

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
   * 上传文件到 FastGPT 知识库
   */
  async uploadFile(data: ImportData): Promise<ImportResult> {
    try {
      const fs = require('fs');
      const path = require('path');
      const FormData = require('form-data');
      const axios = require('axios');
      
      const filePath = data.metadata?.originalPath;
      if (!filePath || !fs.existsSync(filePath)) {
        return {
          success: false,
          error: '文件不存在或路径无效'
        };
      }
      
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      console.log(`开始上传文件: ${fileName} 到知识库 ${data.knowledgeBaseId}`);
      console.log(`文件路径: ${filePath}`);
      console.log(`文件大小: ${fs.statSync(filePath).size} 字节`);
      
      // 创建 FormData
      const formData = new FormData();
      
      // 判断是否为文本文件，如果是则指定UTF-8编码
      const isTextFile = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.html', '.json', '.xml', '.csv'].includes(fileExtension);
      
      // 处理文件名编码 - 解决FastGPT中文文件名乱码问题
      // 根据GitHub issue #2282和相关解决方案，尝试多种编码方式
      
      let processedFileName = fileName;
      
      // 检测是否包含中文字符
      if (!/^[\x00-\x7F]*$/.test(fileName)) {
        console.log(`检测到非ASCII文件名: ${fileName}`);
        
        try {
          // 方案1：URL编码（推荐方案，类似Web浏览器处理方式）
          processedFileName = encodeURIComponent(fileName);
          console.log(`文件名URL编码: ${fileName} -> ${processedFileName}`);
        } catch (error) {
          console.warn('文件名URL编码失败，尝试其他方案:', error);
          
          try {
            // 方案2：Buffer转换（备用方案）
            const utf8Buffer = Buffer.from(fileName, 'utf8');
            processedFileName = utf8Buffer.toString('latin1');
            console.log(`文件名Buffer转换: ${fileName} -> ${processedFileName}`);
          } catch (bufferError) {
            console.warn('文件名Buffer转换也失败，使用原始文件名:', bufferError);
            processedFileName = fileName;
          }
        }
      }
      
      // 创建文件选项
      const fileOptions = {
        filename: processedFileName, // 使用处理后的文件名
        contentType: data.metadata?.mimeType || (isTextFile ? 'text/plain; charset=utf-8' : 'application/octet-stream')
      };
      
      console.log(`最终使用的文件名: ${processedFileName}`);
      
      if (isTextFile) {
        // 对于文本文件，先读取内容并确保UTF-8编码
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const buffer = Buffer.from(fileContent, 'utf8');
        
        formData.append('file', buffer, fileOptions);
        
        console.log(`文本文件 ${fileName} 已处理，编码: UTF-8`);
      } else {
        // 对于二进制文件，使用原有方式
        formData.append('file', fs.createReadStream(filePath), fileOptions);
        
        console.log(`二进制文件 ${fileName} 已处理`);
      }
      
      // 构建数据参数 - 根据 FastGPT 官方文档格式
      // 注意：根据官方文档，localFile接口的data参数中不包含name字段
      // 集合名称将由FastGPT根据文件名自动生成
      const uploadData = {
        datasetId: data.knowledgeBaseId,
        parentId: null,
        trainingType: 'chunk',
        chunkSize: 512,
        chunkSplitter: '',
        qaPrompt: '',
        metadata: {
          source: 'flashbase-plugin',
          originalFileName: fileName
        }
      };
      
      formData.append('data', JSON.stringify(uploadData));
      
      console.log('上传数据参数:', uploadData);
      console.log('文件名将作为集合名称:', fileName);
      console.log('FormData 字段:', Object.keys(formData.getHeaders()));
      
      // 直接使用 axios 而不是 this.api 实例，避免默认 Content-Type 冲突
      const response = await axios.post(
        `${this.config.baseUrl}/api/core/dataset/collection/create/localFile`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 120000, // 增加超时时间到2分钟
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      console.log('文件上传响应状态:', response.status);
      console.log('文件上传响应数据:', JSON.stringify(response.data, null, 2));
      
      if (response.status === 200 && response.data) {
        // 检查响应结构
        const responseData = response.data;
        if (responseData.code === 200 || responseData.data) {
          return {
            success: true,
            insertId: responseData.data?._id || responseData.data?.id || '文件上传成功',
            message: `文件 ${fileName} 已成功上传到知识库并开始处理`
          };
        } else {
          console.error('上传响应格式异常:', responseData);
          return {
            success: false,
            error: responseData.message || '文件上传失败，响应格式异常'
          };
        }
      } else {
        return {
          success: false,
          error: `文件上传失败，服务器返回状态: ${response.status}`
        };
      }
    } catch (error: any) {
      console.error('文件上传失败:', error);
      
      let errorMessage = '文件上传失败';
      if (error.response) {
        console.error('上传错误状态:', error.response.status);
        console.error('上传错误数据:', error.response.data);
        console.error('上传错误头:', error.response.headers);
        
        errorMessage = error.response.data?.message || 
                      error.response.data?.error || 
                      error.response.data?.statusText ||
                      `服务器错误 (${error.response.status})`;
      } else if (error.request) {
        console.error('网络请求失败:', error.request);
        errorMessage = '网络连接失败，请检查 FastGPT 服务器地址和网络连接';
      } else {
        console.error('其他错误:', error.message);
        errorMessage = error.message || '未知错误';
      }
      
      return {
        success: false,
        error: errorMessage
      };
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