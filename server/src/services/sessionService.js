import { ModuleTypes, ScenarioContainerTypes } from '../../../shared/types.js';
import vocabularyService from './vocabularyService.js';

/**
 * 学习会话服务
 * 从 CSV 词库动态生成学习会话
 */

// 会话缓存
let sessionCache = null;

/**
 * 根据词库生成学习会话
 * 主要使用 Click 模式（抓取查看）和 Similarity 模式（词网扩展）
 */
async function generateSessionFromCSV() {
  const words = await vocabularyService.getAllWords();
  
  if (!words || words.length === 0) {
    console.warn('[v0] 词库为空，使用默认会话');
    return getDefaultFallbackSession();
  }
  
  const modules = [];
  
  // 为每个词汇创建 Click 模块（抓取查看模式）
  words.forEach((item, index) => {
    modules.push({
      id: `click-${index + 1}`,
      type: ModuleTypes.CLICK,
      autoAdvanceSeconds: 30,
      interaction: { 
        trigger: ['click', 'grab', 'keyboard'], 
        keys: ['Space', 'Enter'] 
      },
      data: {
        word: item.word,
        translation: item.translation,
        modelPrompt: item.modelPrompt,
        // HUD 文本
        hudText: {
          initial: `${item.word} - ${item.translation}`,
          transformed: `${item.word} - ${item.translation}`
        },
        // 占位模型配置
        initialModel: { type: 'sphere', color: '#4CAF50' },
        transformedModel: { type: 'sphere', color: '#2196F3' }
      }
    });
  });
  
  // 根据词汇类别创建 Similarity 模块（词网扩展）
  const categories = groupWordsByCategory(words);
  
  Object.entries(categories).forEach(([category, categoryWords], catIndex) => {
    if (categoryWords.length >= 3) {
      const coreWord = categoryWords[0];
      const relatedWords = categoryWords.slice(1, 7).map((w, i) => ({
        word: w.word,
        translation: w.translation,
        distance: 2 + Math.random() * 0.5,
        angle: (i * 360) / Math.min(categoryWords.length - 1, 6),
        modelPrompt: w.modelPrompt
      }));
      
      modules.push({
        id: `similarity-${catIndex + 1}`,
        type: ModuleTypes.SIMILARITY,
        autoAdvanceSeconds: 45,
        interaction: { trigger: ['click'], expandButtonLabel: '展开相关词' },
        data: {
          coreWord: coreWord.word,
          coreTranslation: coreWord.translation,
          coreModelPrompt: coreWord.modelPrompt,
          // 核心模型配置（SimilarityModule 需要）
          coreModel: { type: 'sphere', color: '#FFD700' },
          relatedWords,
          connectionStyle: { color: '#FFFFFF', opacity: 0.6 },
          category
        }
      });
    }
  });
  
  return {
    sessionId: 'csv-vocabulary-session',
    title: 'VR 英语词汇学习',
    description: `从词库加载了 ${words.length} 个词汇`,
    modules
  };
}

/**
 * 按类别分组词汇
 */
function groupWordsByCategory(words) {
  const categories = {
    anatomy: [], // 解剖学
    biology: [], // 生物学
    botany: [],  // 植物学
    geography: [], // 地理学
    astronomy: [], // 天文学
    microbiology: [] // 微生物学
  };
  
  // 根据单词关键字分类
  const categoryKeywords = {
    anatomy: ['Skeleton', 'Skull', 'Organ', 'Tissue', 'Artery', 'Vein', 'Spine', 'Cartilage', 'Neuron'],
    biology: ['Embryo', 'Fossil', 'Specimen', 'Antenna', 'Claw', 'Beak', 'Tentacle'],
    botany: ['Canopy', 'Coral', 'Stem', 'Petal', 'Root', 'Pollen', 'Trunk'],
    microbiology: ['Chromosome', 'DNA', 'Microbe', 'Virus', 'Protein', 'Enzyme', 'Membrane'],
    geography: ['Hemisphere', 'Equator', 'Latitude', 'Longitude', 'Crater', 'Volcano', 'Glacier', 'Canyon', 'Plateau', 'Terrain', 'Peninsula', 'Coastline'],
    astronomy: ['Axis', 'Orbit', 'Atmosphere', 'Meteor', 'Comet', 'Asteroid']
  };
  
  words.forEach(word => {
    let assigned = false;
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.includes(word.word)) {
        categories[category].push(word);
        assigned = true;
        break;
      }
    }
    // 未分类的词放入 biology
    if (!assigned) {
      categories.biology.push(word);
    }
  });
  
  // 过滤空类别
  return Object.fromEntries(
    Object.entries(categories).filter(([_, words]) => words.length > 0)
  );
}

/**
 * 默认备用会话
 */
function getDefaultFallbackSession() {
  return {
    sessionId: 'fallback-session',
    title: 'VR 词汇学习',
    description: '默认学习会话',
    modules: [
      {
        id: 'click-demo',
        type: ModuleTypes.CLICK,
        autoAdvanceSeconds: 30,
        interaction: { trigger: ['click', 'keyboard'] },
        data: {
          word: 'Demo',
          translation: '演示',
          modelPrompt: 'A simple 3D cube, colorful, demonstration model',
          hudText: { initial: 'Demo - 演示', transformed: 'Demo - 演示' },
          initialModel: { type: 'box', color: '#4CAF50' },
          transformedModel: { type: 'sphere', color: '#2196F3' }
        }
      }
    ]
  };
}

/**
 * 获取学习会话（主要入口）
 */
export async function getDefaultSession() {
  if (sessionCache) {
    return sessionCache;
  }
  
  try {
    sessionCache = await generateSessionFromCSV();
    console.log(`[v0] 会话已生成，包含 ${sessionCache.modules.length} 个模块`);
    return sessionCache;
  } catch (error) {
    console.error('[v0] 生成会话失败:', error);
    return getDefaultFallbackSession();
  }
}

/**
 * 刷新会话缓存
 */
export function refreshSession() {
  sessionCache = null;
}

/**
 * 根据 ID 获取学习会话
 */
export async function getSessionById(sessionId) {
  if (sessionId === 'csv-vocabulary-session' || sessionId === 'default') {
    return getDefaultSession();
  }
  return null;
}

/**
 * 获取所有可用会话列表
 */
export async function getAllSessions() {
  const defaultSession = await getDefaultSession();
  return [{
    sessionId: defaultSession.sessionId,
    title: defaultSession.title,
    description: defaultSession.description,
    moduleCount: defaultSession.modules.length
  }];
}

export default {
  getDefaultSession,
  getSessionById,
  getAllSessions,
  refreshSession
};
