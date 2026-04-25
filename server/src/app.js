import express from 'express';
import cors from 'cors';
import { learningRouter } from './routes/learning.js';
import { tripoRouter } from './routes/tripo.js';
import vocabularyRouter from './routes/vocabulary.js';

const app = express();

// CORS 配置 - 允许局域网访问
const corsOptions = {
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（如 Postman）和所有局域网请求
    if (!origin || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1') ||
        /^http:\/\/192\.168\.\d+\.\d+/.test(origin) ||
        /^http:\/\/10\.\d+\.\d+\.\d+/.test(origin) ||
        /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 路由注册
app.use('/api/learning', learningRouter);
app.use('/api/tripo', tripoRouter);
app.use('/api/vocabulary', vocabularyRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      code: 'NOT_FOUND'
    }
  });
});

export default app;
