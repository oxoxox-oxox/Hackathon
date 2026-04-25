/**
 * API 客户端
 * 用于与后端服务通信
 */

const API_BASE = '/api';

/**
 * 通用请求方法
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  
  const response = await fetch(url, config);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  
  return data;
}

/**
 * 学习会话 API
 */
export const learningApi = {
  /**
   * 获取默认学习会话
   */
  async getSession() {
    const result = await request('/learning/session');
    return result.data;
  },
  
  /**
   * 获取所有可用会话
   */
  async getAllSessions() {
    const result = await request('/learning/sessions');
    return result.data;
  },
  
  /**
   * 根据 ID 获取会话
   */
  async getSessionById(sessionId) {
    const result = await request(`/learning/session/${sessionId}`);
    return result.data;
  },
  
  /**
   * 记录事件
   */
  async recordEvent(eventData) {
    const result = await request('/learning/event', {
      method: 'POST',
      body: eventData
    });
    return result;
  }
};

/**
 * Tripo API
 */
export const tripoApi = {
  /**
   * 检查 Tripo 配置状态
   */
  async getStatus() {
    const result = await request('/tripo/status');
    return result.data;
  },
  
  /**
   * 从文本生成 3D 模型
   */
  async generateFromText(prompt, options = {}) {
    const result = await request('/tripo/generate/text', {
      method: 'POST',
      body: { prompt, options }
    });
    return result.data;
  },
  
  /**
   * 从图片生成 3D 模型
   */
  async generateFromImage(imageUrl, options = {}) {
    const result = await request('/tripo/generate/image', {
      method: 'POST',
      body: { imageUrl, options }
    });
    return result.data;
  },
  
  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId) {
    const result = await request(`/tripo/task/${taskId}`);
    return result.data;
  },
  
  /**
   * 等待任务完成
   */
  async waitForTask(taskId, { maxAttempts = 60, interval = 2000 } = {}) {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.status === 'success') {
        return status;
      }
      
      if (status.status === 'failed') {
        throw new Error(status.error || 'Task failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Task timeout');
  }
};

export default {
  learning: learningApi,
  tripo: tripoApi
};
