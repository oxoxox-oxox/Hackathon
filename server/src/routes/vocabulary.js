import { Router } from 'express';
import vocabularyService from '../services/vocabularyService.js';
import tripoService from '../services/tripoService.js';

const router = Router();

/**
 * 获取所有词汇
 */
router.get('/', async (req, res) => {
  try {
    const words = await vocabularyService.getAllWords();
    res.json({
      success: true,
      count: words.length,
      words
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取分页词汇
 */
router.get('/paginated', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const result = await vocabularyService.getWordsPaginated(page, pageSize);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 搜索词汇
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const words = await vocabularyService.searchWords(query);
    res.json({
      success: true,
      count: words.length,
      words
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 获取单个词汇
 */
router.get('/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const word = await vocabularyService.getWordByIndex(index);
    
    if (!word) {
      return res.status(404).json({ success: false, error: 'Word not found' });
    }
    
    res.json({ success: true, word });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 为词汇生成3D模型
 */
router.post('/:index/generate-model', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const word = await vocabularyService.getWordByIndex(index);
    
    if (!word) {
      return res.status(404).json({ success: false, error: 'Word not found' });
    }
    
    // 调用 Tripo API 生成模型
    const result = await tripoService.generateFromText(word.modelPrompt);
    
    res.json({
      success: true,
      word: word.word,
      translation: word.translation,
      modelPrompt: word.modelPrompt,
      taskId: result.taskId,
      status: result.status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 批量生成模型（预生成前N个词汇的模型）
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.body.count) || 5, 20); // 最多20个
    const words = await vocabularyService.getAllWords();
    const results = [];
    
    for (let i = 0; i < Math.min(count, words.length); i++) {
      const word = words[i];
      try {
        const result = await tripoService.generateFromText(word.modelPrompt);
        results.push({
          index: i,
          word: word.word,
          translation: word.translation,
          taskId: result.taskId,
          status: 'pending'
        });
        
        // 避免API限流，稍微延迟
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        results.push({
          index: i,
          word: word.word,
          error: err.message
        });
      }
    }
    
    res.json({
      success: true,
      generated: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
