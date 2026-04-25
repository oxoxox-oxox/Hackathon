import * as tripoService from '../services/tripoService.js';

/**
 * 获取 Tripo API 配置状态
 */
export function getStatus(req, res) {
  res.json({
    success: true,
    data: {
      configured: tripoService.isConfigured(),
      message: tripoService.isConfigured() 
        ? 'Tripo API is configured' 
        : 'TRIPO_API_KEY is not set'
    }
  });
}

/**
 * 从文本生成 3D 模型
 */
export async function generateFromText(req, res, next) {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Prompt is required',
          code: 'MISSING_PROMPT'
        }
      });
    }
    
    const result = await tripoService.generateFromText(prompt, options || {});
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 从图片生成 3D 模型
 */
export async function generateFromImage(req, res, next) {
  try {
    const { imageUrl, options } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Image URL is required',
          code: 'MISSING_IMAGE_URL'
        }
      });
    }
    
    const result = await tripoService.generateFromImage(imageUrl, options || {});
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 查询任务状态
 */
export async function getTaskStatus(req, res, next) {
  try {
    const { taskId } = req.params;
    const result = await tripoService.getTaskStatus(taskId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 下载模型
 */
export async function downloadModel(req, res, next) {
  try {
    const { taskId } = req.params;
    const { format } = req.query;
    const result = await tripoService.downloadModel(taskId, format || 'glb');
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
