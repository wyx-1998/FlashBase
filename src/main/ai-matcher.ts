import axios, { AxiosInstance } from 'axios';
import { AIConfig, KnowledgeBase } from '../shared/types';

/**
 * AI智能知识库匹配结果
 */
export interface AIMatchResult {
  success: boolean;
  recommendations?: {
    knowledgeBase: string;
    confidence: number;
    reason: string;
  }[];
  finalChoice?: {
    knowledgeBase: string;
    confidence: number;
    shouldImport: boolean;
  };
  error?: string;
  errorType?: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'CONFIG_ERROR' | 'RESPONSE_FORMAT_ERROR' | 'PARSE_ERROR' | 'EMPTY_RESPONSE' | 'UNKNOWN_ERROR';
}

/**
 * AI智能知识库匹配服务
 */
export class AIKnowledgeBaseMatcher {
  private api: AxiosInstance;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.api = this.createApiInstance();
  }

  /**
   * 创建API实例
   */
  private createApiInstance(): AxiosInstance {
    const baseURL = this.config.baseUrl || 'http://localhost:3000';
    
    return axios.create({
      baseURL: baseURL,
      timeout: this.config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey || ''}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      responseType: 'json',
      responseEncoding: 'utf8'
    });
  }

  /**
   * 构建API端点路径
   */
  private buildApiEndpoint(): string {
    const baseUrl = this.config.baseUrl || '';
    
    // 检查baseUrl是否已经包含/v1路径
    if (baseUrl.endsWith('/v1') || baseUrl.includes('/v1/')) {
      // 如果已经包含/v1，直接使用/chat/completions
      return '/chat/completions';
    } else {
      // 如果不包含/v1，使用完整路径
      return '/v1/chat/completions';
    }
  }

  /**
   * 更新AI配置
   */
  updateConfig(config: AIConfig): void {
    this.config = config;
    this.api = this.createApiInstance();
  }

  /**
   * 智能匹配知识库
   */
  async matchKnowledgeBase(content: string, knowledgeBases: KnowledgeBase[]): Promise<AIMatchResult> {
    try {
      console.log('=== AI智能知识库匹配开始 ===');
      console.log('内容长度:', content.length);
      console.log('可用知识库数量:', knowledgeBases.length);
      console.log('知识库列表:', knowledgeBases.map(kb => ({ id: kb.id, name: kb.name })));

      // 验证配置
      if (!this.config.baseUrl || !this.config.apiKey) {
        return {
          success: false,
          error: 'AI配置不完整：缺少baseUrl或apiKey',
          errorType: 'CONFIG_ERROR'
        };
      }

      // 构建AI请求
      const prompt = this.buildPrompt(content, knowledgeBases);
      const requestData = {
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      };

      console.log('发送AI请求...');
      console.log('请求数据:', JSON.stringify(requestData, null, 2));

      // 发送请求
      const endpoint = this.buildApiEndpoint();
      console.log('使用API端点:', endpoint);
      const response = await this.api.post(endpoint, requestData);
      
      console.log('AI响应状态:', response.status);
      console.log('AI响应头:', response.headers);
      
      // 完整打印返回内容
      const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      console.log('=== AI接口完整返回内容 ===');
      console.log('内容长度:', responseText.length);
      console.log('前100字符:', responseText.substring(0, 100));
      console.log('后100字符:', responseText.substring(Math.max(0, responseText.length - 100)));
      console.log('完整内容:');
      console.log(responseText);
      console.log('=== 返回内容结束 ===');

      // 检查响应状态
      if (response.status !== 200) {
        return {
          success: false,
          error: `AI服务返回错误状态: ${response.status}`,
          errorType: 'NETWORK_ERROR'
        };
      }

      // 检查响应是否为JSON
      if (typeof response.data === 'string') {
        // 如果返回的是HTML页面
        if (response.data.includes('<html') || response.data.includes('<!DOCTYPE')) {
          return {
            success: false,
            error: 'AI接口返回了HTML页面而非JSON数据，请检查API端点配置',
            errorType: 'RESPONSE_FORMAT_ERROR'
          };
        }
        
        // 尝试解析JSON
        try {
          response.data = JSON.parse(response.data);
        } catch (parseError) {
          return {
            success: false,
            error: `AI响应JSON解析失败: ${parseError}`,
            errorType: 'PARSE_ERROR'
          };
        }
      }

      // 检查响应数据结构
      if (!response.data || !response.data.choices || !response.data.choices[0]) {
        return {
          success: false,
          error: 'AI响应格式错误：缺少choices字段',
          errorType: 'RESPONSE_FORMAT_ERROR'
        };
      }

      const aiResponse = response.data.choices[0].message?.content;
      if (!aiResponse) {
        return {
          success: false,
          error: 'AI响应内容为空',
          errorType: 'EMPTY_RESPONSE'
        };
      }

      console.log('AI原始响应:', aiResponse);

      // 解析AI响应
      return this.parseAIResponse(aiResponse, knowledgeBases);

    } catch (error: any) {
      console.error('AI智能匹配失败:', error);
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      });
      
      let errorType: AIMatchResult['errorType'] = 'UNKNOWN_ERROR';
      let errorMessage = '未知错误';
      let diagnosticInfo = '';

      if (error.code === 'ECONNREFUSED') {
        errorType = 'NETWORK_ERROR';
        errorMessage = 'AI服务连接被拒绝';
        diagnosticInfo = `无法连接到 ${this.config.baseUrl}，请检查：\n1. API地址是否正确\n2. 服务是否正在运行\n3. 网络连接是否正常`;
      } else if (error.code === 'ENOTFOUND') {
        errorType = 'NETWORK_ERROR';
        errorMessage = 'AI服务域名解析失败';
        diagnosticInfo = `无法解析域名 ${this.config.baseUrl}，请检查：\n1. API地址是否正确\n2. 网络连接是否正常\n3. DNS设置是否正确`;
      } else if (error.code === 'ECONNRESET') {
        errorType = 'NETWORK_ERROR';
        errorMessage = 'AI服务连接被重置';
        diagnosticInfo = '网络连接不稳定，请检查网络环境或稍后重试';
      } else if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
        errorType = 'NETWORK_ERROR';
        errorMessage = 'AI服务连接超时';
        diagnosticInfo = `连接超时（${this.config.timeout || 30000}ms），请检查：\n1. 网络连接速度\n2. 增加超时时间设置\n3. AI服务响应速度`;
      } else if (error.response?.status === 401) {
        errorType = 'AUTH_ERROR';
        errorMessage = 'AI服务认证失败';
        diagnosticInfo = 'API密钥认证失败，请检查：\n1. API密钥是否正确\n2. API密钥是否有效\n3. API密钥权限是否足够';
      } else if (error.response?.status === 403) {
        errorType = 'AUTH_ERROR';
        errorMessage = 'AI服务访问被拒绝';
        diagnosticInfo = '访问被拒绝，请检查：\n1. API密钥权限\n2. 账户余额\n3. 服务使用限制';
      } else if (error.response?.status === 404) {
        errorType = 'CONFIG_ERROR';
        errorMessage = 'AI服务端点不存在';
        diagnosticInfo = `API端点不存在，请检查：\n1. API地址是否正确\n2. 端点路径是否正确\n当前端点: ${this.buildApiEndpoint()}`;
      } else if (error.response?.status === 429) {
        errorType = 'CONFIG_ERROR';
        errorMessage = 'AI服务请求频率限制';
        diagnosticInfo = '请求过于频繁，请稍后重试或检查API使用限制';
      } else if (error.response?.status >= 500) {
        errorType = 'RESPONSE_FORMAT_ERROR';
        errorMessage = 'AI服务器内部错误';
        diagnosticInfo = `服务器返回 ${error.response.status} 错误，请稍后重试或联系服务提供商`;
      } else if (error.response?.status >= 400 && error.response?.status < 500) {
        errorType = 'CONFIG_ERROR';
        errorMessage = `AI服务配置错误 (${error.response.status})`;
        diagnosticInfo = `客户端请求错误，请检查配置参数`;
      } else if (error.response) {
        errorType = 'RESPONSE_FORMAT_ERROR';
        errorMessage = `AI服务响应错误 (${error.response.status})`;
        diagnosticInfo = `服务返回异常状态码: ${error.response.status}`;
      } else if (error.message?.includes('JSON')) {
        errorType = 'PARSE_ERROR';
        errorMessage = 'AI响应解析失败';
        diagnosticInfo = 'AI服务返回的不是有效的JSON格式，可能是HTML页面或其他格式';
      } else {
        errorMessage = error.message || '未知错误';
        diagnosticInfo = '发生未知错误，请检查网络连接和配置信息';
      }

      const fullErrorMessage = diagnosticInfo ? `${errorMessage}\n\n诊断信息:\n${diagnosticInfo}` : errorMessage;

      return {
        success: false,
        error: fullErrorMessage,
        errorType
      };
    }
  }

  /**
   * 构建AI提示词
   */
  private buildPrompt(content: string, knowledgeBases: KnowledgeBase[]): string {
    const kbList = knowledgeBases.map(kb => `- ${kb.name}: ${kb.description || '无描述'}`).join('\n');
    
    return `# 🧠 FlashBase-FastGPT 智能知识库匹配引擎

## [TRANSCENDENT_ROLE]
你是 FlashBase 系统的智能知识库分析专家，专门负责分析用户导入的内容并智能推荐最合适的 FastGPT 知识库。你的认知架构融合了**内容主题识别**、**知识领域分类**、**语义相似度计算**等认知模式，能够精准理解导入内容的本质并匹配到最合适的知识库。

## 🧬 认知DNA
- **基础认知**：文档分类学、知识图谱理论、内容语义分析
- **元认知**：理解用户的知识管理意图和使用场景
- **涌现认知**：发现内容与知识库间的深层关联，预测最佳匹配

## 🎯 核心任务
分析用户通过 FlashBase 导入的文本内容（文档、笔记、资料等），结合 FastGPT 现有知识库的名称和描述信息，智能推荐最匹配的知识库，替代传统的手动选择流程。

## 🌊 执行流程

### 第一层：内容深度分析
1. **文档类型识别**：判断是技术文档、业务资料、学习笔记还是其他类型
2. **主题提取与分类**：识别核心主题和次要主题，进行知识领域归类
3. **关键词挖掘**：提取技术术语、业务概念、专业词汇等关键标识
4. **内容结构分析**：理解文档的逻辑结构和知识层次

### 第二层：知识库匹配度评估
1. **语义相似度计算**：基于名称和描述与导入内容的语义匹配度
2. **主题重叠度分析**：评估内容主题与知识库定位的重叠程度
3. **专业领域对齐**：判断技术栈、业务领域、应用场景的一致性
4. **知识互补性评估**：分析导入内容对知识库的补充价值

### 第三层：客观匹配评估
1. **绝对评分标准**：基于明确的匹配标准进行客观评分，不受候选知识库数量影响
2. **置信度客观化**：使用量化指标评估匹配可靠性，允许所有选项都为低置信度
3. **真实匹配度**：如果内容与所有知识库关联度都低，诚实反映这一情况
4. **无匹配处理**：当最高匹配度仍然很低时，明确建议创建新知识库或重新分类

## ⚡ 客观评分标准

### 置信度计算 (0-100)
- **90-100**：极强匹配 - 内容与知识库主题完全吻合，关键词重叠度>80%
- **75-89**：强匹配 - 主题高度相关，关键词重叠度60-80%
- **60-74**：中等匹配 - 主题相关，关键词重叠度40-60%
- **40-59**：弱匹配 - 存在一定关联，关键词重叠度20-40%
- **20-39**：微弱匹配 - 仅有少量关联，关键词重叠度5-20%
- **0-19**：无关联 - 基本无关，关键词重叠度<5%

### 匹配分数标准
**评分维度与权重：**
- 语义相似度 (40%)：基于词向量和主题模型的相似度计算
- 主题重叠度 (30%)：核心主题和次要主题的重叠程度
- 技术栈匹配 (20%)：技术关键词、框架、工具的匹配度
- 文档类型适配 (10%)：文档类型与知识库定位的一致性

**绝对评分原则：**
- 每个维度独立计算，不与其他候选项比较
- 如果所有维度得分都低，总分必然低
- 允许出现所有候选项得分都很低的情况

## 🌟 客观评估质量标准

- **绝对评分原则**：每个知识库独立评分，不进行相对比较
- **诚实反馈**：如果所有选项匹配度都低（<60），明确告知用户
- **完整性要求**：即使匹配度很低，也要提供分析结果和替代建议
- **可解释性**：每个分数都要有明确的计算依据和客观理由
- **实用导向**：优先考虑用户的实际需求，避免强行推荐不合适的选项

## 🚀 执行指令

**可用知识库列表：**
${kbList}

**导入内容：**
${content.substring(0, 2000)}${content.length > 2000 ? '...(内容已截断)' : ''}

**核心原则：**
1. **客观性优先**：基于内容特征进行绝对评分，不受候选数量影响
2. **诚实评估**：如果匹配度普遍较低，如实反映这一情况
3. **建设性建议**：为低匹配情况提供创建新知识库等替代方案
4. **量化依据**：每个评分都要有具体的计算逻辑和证据支撑

**特殊情况处理：**
- 当最高匹配分数 < 60 时，在分析中说明情况
- 当最高置信度 < 50 时，建议用户考虑创建新知识库
- 允许推荐知识库为 null（表示无合适推荐）

请按照以下JSON格式返回分析结果：
{
  "recommendations": [
    {
      "knowledgeBase": "知识库名称",
      "confidence": 45,
      "reason": "客观的匹配分析理由"
    }
  ],
  "finalChoice": {
    "knowledgeBase": "最终选择的知识库名称（如果都很低可为null）",
    "confidence": 45,
    "shouldImport": false
  }
}

**重要说明：**
1. confidence为0-100的整数，表示**客观的绝对匹配置信度**，不是相对值
2. 请为**所有**知识库提供推荐，按置信度从高到低排序
3. shouldImport为true表示建议导入（置信度>=70），false表示建议人工审核
4. 请确保返回的是有效的JSON格式
5. 知识库名称必须完全匹配提供的列表中的名称
6. 置信度评估应基于内容的实际匹配程度，诚实反映真实情况
7. 如果所有匹配度都很低，请在reason中说明并建议创建新知识库

**开始客观分析！**`;
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(aiResponse: string, knowledgeBases: KnowledgeBase[]): AIMatchResult {
    try {
      // 尝试提取JSON部分
      let jsonStr = aiResponse.trim();
      
      // 如果响应包含代码块，提取其中的JSON
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // 如果没有代码块，尝试找到JSON对象
      if (!jsonMatch) {
        const startIndex = jsonStr.indexOf('{');
        const endIndex = jsonStr.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonStr = jsonStr.substring(startIndex, endIndex + 1);
        }
      }

      console.log('提取的JSON字符串:', jsonStr);
      
      const parsed = JSON.parse(jsonStr);
      
      // 验证响应格式
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('响应格式错误：缺少recommendations数组');
      }
      
      if (!parsed.finalChoice) {
        throw new Error('响应格式错误：缺少finalChoice对象');
      }

      // 验证知识库名称是否存在
      const validKnowledgeBases = knowledgeBases.map(kb => kb.name);
      const finalChoice = parsed.finalChoice;
      
      if (!validKnowledgeBases.includes(finalChoice.knowledgeBase)) {
        console.warn(`AI推荐的知识库 "${finalChoice.knowledgeBase}" 不在可用列表中`);
        // 尝试模糊匹配
        const fuzzyMatch = this.findBestMatch(finalChoice.knowledgeBase, validKnowledgeBases);
        if (fuzzyMatch) {
          console.log(`使用模糊匹配结果: ${fuzzyMatch}`);
          finalChoice.knowledgeBase = fuzzyMatch;
        } else {
          throw new Error(`推荐的知识库 "${finalChoice.knowledgeBase}" 不存在`);
        }
      }

      // 根据置信度判断是否应该导入
      const shouldImport = finalChoice.confidence >= 70;
      finalChoice.shouldImport = shouldImport;

      console.log('AI匹配结果:', {
        finalChoice: finalChoice,
        shouldImport: shouldImport
      });

      return {
        success: true,
        recommendations: parsed.recommendations,
        finalChoice: finalChoice
      };

    } catch (error) {
      console.error('解析AI响应失败:', error);
      return {
        success: false,
        error: `AI响应解析失败: ${error}`,
        errorType: 'PARSE_ERROR'
      };
    }
  }

  /**
   * 模糊匹配知识库名称
   */
  private findBestMatch(target: string, candidates: string[]): string | null {
    const targetLower = target.toLowerCase();
    
    // 精确匹配
    for (const candidate of candidates) {
      if (candidate.toLowerCase() === targetLower) {
        return candidate;
      }
    }
    
    // 包含匹配
    for (const candidate of candidates) {
      if (candidate.toLowerCase().includes(targetLower) || targetLower.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
    
    return null;
  }

  /**
   * 测试AI连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const endpoint = this.buildApiEndpoint();
      console.log('测试AI连接，使用端点:', endpoint);
      
      const response = await this.api.post(endpoint, {
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('AI连接测试失败:', error);
      return false;
    }
  }
}