import { Router } from 'express';
import * as learningController from '../controllers/learningController.js';

export const learningRouter = Router();

// 获取默认学习会话
learningRouter.get('/session', learningController.getDefaultSession);

// 获取所有可用会话列表
learningRouter.get('/sessions', learningController.getAllSessions);

// 根据 ID 获取特定会话
learningRouter.get('/session/:id', learningController.getSessionById);

// 创建自定义会话
learningRouter.post('/session', learningController.createSession);

// 记录模块交互事件
learningRouter.post('/event', learningController.recordEvent);
