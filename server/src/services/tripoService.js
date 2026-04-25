/**
 * Tripo API 服务
 * 用于与 Tripo 3D 生成 API 交互
 */

const TRIPO_API_URL = process.env.TRIPO_API_URL || 'https://api.tripo3d.ai/v2/openapi';
const TRIPO_API_KEY = process.env.TRIPO_API_KEY;

/**
 * 通用 API 请求方法
 */
async function tripoRequest(endpoint, options = {}) {
  if (!TRIPO_API_KEY) {
    throw new Error('TRIPO_API_KEY is not configured');
  }

  const url = `${TRIPO_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Tripo API error: ${response.status}`);
  }

  return response.json();
}

/**
 * 从文本生成 3D 模型
 * @param {string} prompt - 描述文本
 * @param {Object} options - 生成选项
 */
export async function generateFromText(prompt, options = {}) {
  const payload = {
    type: 'text_to_model',
    prompt,
    model_version: options.modelVersion || 'default',
    face_limit: options.faceLimit || 10000,
    texture: options.texture !== false,
    pbr: options.pbr !== false
  };

  const result = await tripoRequest('/task', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return {
    taskId: result.data.task_id,
    status: 'queued'
  };
}

/**
 * 从图片生成 3D 模型
 * @param {string} imageUrl - 图片 URL
 * @param {Object} options - 生成选项
 */
export async function generateFromImage(imageUrl, options = {}) {
  const payload = {
    type: 'image_to_model',
    file: {
      type: 'url',
      url: imageUrl
    },
    model_version: options.modelVersion || 'default',
    face_limit: options.faceLimit || 10000,
    texture: options.texture !== false,
    pbr: options.pbr !== false
  };

  const result = await tripoRequest('/task', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  return {
    taskId: result.data.task_id,
    status: 'queued'
  };
}

/**
 * 查询任务状态
 * @param {string} taskId - 任务 ID
 */
export async function getTaskStatus(taskId) {
  const result = await tripoRequest(`/task/${taskId}`);
  
  const data = result.data;
  return {
    taskId: data.task_id,
    status: data.status, // queued, running, success, failed
    progress: data.progress || 0,
    result: data.status === 'success' ? {
      modelUrl: data.output?.model,
      textureUrl: data.output?.base_color,
      thumbnailUrl: data.output?.rendered_image
    } : null,
    error: data.status === 'failed' ? data.message : null
  };
}

/**
 * 下载模型文件
 * @param {string} taskId - 任务 ID  
 * @param {string} format - 输出格式 (glb, fbx, obj)
 */
export async function downloadModel(taskId, format = 'glb') {
  const result = await tripoRequest(`/task/${taskId}/download?format=${format}`);
  return {
    downloadUrl: result.data.url,
    expiresAt: result.data.expires_at
  };
}

/**
 * 检查 API 配置状态
 */
export function isConfigured() {
  return !!TRIPO_API_KEY;
}

export default {
  generateFromText,
  generateFromImage,
  getTaskStatus,
  downloadModel,
  isConfigured
};
