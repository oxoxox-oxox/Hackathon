import { Router } from 'express';
import * as tripoController from '../controllers/tripoController.js';

export const tripoRouter = Router();

// 检查 Tripo API 配置状态
tripoRouter.get('/status', tripoController.getStatus);

// 从文本生成 3D 模型
tripoRouter.post('/generate/text', tripoController.generateFromText);

// 从图片生成 3D 模型
tripoRouter.post('/generate/image', tripoController.generateFromImage);

// 查询任务状态
tripoRouter.get('/task/:taskId', tripoController.getTaskStatus);

// 下载模型
tripoRouter.get('/task/:taskId/download', tripoController.downloadModel);
