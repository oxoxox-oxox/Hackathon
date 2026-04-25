import * as sessionService from '../services/sessionService.js';

/**
 * 获取默认学习会话
 */
export async function getDefaultSession(req, res, next) {
  try {
    const session = await sessionService.getDefaultSession();
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取所有可用会话列表
 */
export async function getAllSessions(req, res, next) {
  try {
    const sessions = await sessionService.getAllSessions();
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 根据 ID 获取特定会话
 */
export async function getSessionById(req, res, next) {
  try {
    const { id } = req.params;
    const session = await sessionService.getSessionById(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        }
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 创建自定义会话
 */
export function createSession(req, res, next) {
  try {
    const config = req.body;
    const session = sessionService.createSession(config);
    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 记录模块交互事件（用于埋点统计）
 */
export function recordEvent(req, res, next) {
  try {
    const { sessionId, moduleId, eventType, data } = req.body;
    
    // 这里可以接入实际的埋点系统
    console.log('[Event]', {
      sessionId,
      moduleId,
      eventType,
      data,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Event recorded'
    });
  } catch (error) {
    next(error);
  }
}
