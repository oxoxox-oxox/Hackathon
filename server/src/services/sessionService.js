import { ModuleTypes, ScenarioContainerTypes } from '../../../shared/types.js';
import vocabularyData from '../../../shared/vocabulary.js';

/**
 * 学习会话服务
 * 负责生成和管理学习会话配置
 * 使用 shared/vocabulary.js 中的单词数据
 */

/**
 * 根据 vocabulary.js 动态生成会话
 */
function generateSessionFromVocabulary() {
  const modules = [];

  // Click 模块
  if (vocabularyData.click && vocabularyData.click.length > 0) {
    vocabularyData.click.forEach((item, index) => {
      modules.push({
        id: `click-${index + 1}`,
        type: ModuleTypes.CLICK,
        autoAdvanceSeconds: 30,
        interaction: { trigger: ['click', 'keyboard'], keys: ['Space', 'Enter'] },
        data: {
          word: item.word,
          translation: item.translation,
          phonetic: item.phonetic || '',
          modelPrompt: item.modelPrompt,
          tripoAssetId: null
        }
      });
    });
  }

  // Similarity 模块
  if (vocabularyData.similarity && vocabularyData.similarity.length > 0) {
    vocabularyData.similarity.forEach((item, index) => {
      modules.push({
        id: `similarity-${index + 1}`,
        type: ModuleTypes.SIMILARITY,
        autoAdvanceSeconds: 45,
        interaction: { trigger: ['click'], expandButtonLabel: '展开相关词' },
        data: {
          coreWord: item.word,
          coreTranslation: item.translation,
          similarWords: item.similarWords || [],
          modelPrompt: item.modelPrompt,
          tripoAssetId: null
        }
      });
    });
  }

  // Rotate 模块
  if (vocabularyData.rotate && vocabularyData.rotate.length > 0) {
    vocabularyData.rotate.forEach((item, index) => {
      modules.push({
        id: `rotate-${index + 1}`,
        type: ModuleTypes.ROTATE,
        autoAdvanceSeconds: 40,
        interaction: { trigger: ['gaze'], gazeThreshold: 2000 },
        data: {
          word: item.word,
          translation: item.translation,
          phonetic: item.phonetic || '',
          viewAngles: item.viewAngles || ['front', 'side', 'back'],
          modelPrompt: item.modelPrompt,
          tripoAssetId: null
        }
      });
    });
  }

  // Scenarios 模块
  if (vocabularyData.scenarios && vocabularyData.scenarios.length > 0) {
    vocabularyData.scenarios.forEach((scenario, index) => {
      modules.push({
        id: `scenarios-${index + 1}`,
        type: ModuleTypes.SCENARIOS,
        autoAdvanceSeconds: 60,
        interaction: { trigger: ['click'], containerSwitchable: true },
        data: {
          scenarioName: scenario.scenarioName,
          scenarioTranslation: scenario.scenarioTranslation,
          description: scenario.description,
          modelPrompt: scenario.modelPrompt,
          words: scenario.words,
          initialContainer: ScenarioContainerTypes.DIORAMA_3D,
          tripoSceneId: null
        }
      });
    });
  }

  return {
    sessionId: 'vocabulary-session',
    title: 'VR 英语词汇学习',
    description: '通过 VR 交互学习英语词汇',
    modules
  };
}

// 从 vocabulary.js 生成的会话
const dynamicSession = generateSessionFromVocabulary();

// 示例学习会话数据（备用）
const sampleSessions = {
  'vocabulary-session': dynamicSession,
  'session-001': {
    sessionId: 'session-001',
    title: '形态变化词汇学习',
    description: '通过状态切换学习对立变化词义',
    modules: [
      {
        id: 'click-001',
        type: ModuleTypes.CLICK,
        autoAdvanceSeconds: 30,
        interaction: {
          trigger: ['click', 'keyboard'],
          keys: ['Space', 'Enter']
        },
        data: {
          initialWord: 'open',
          initialModel: {
            type: 'box',
            color: '#4CAF50',
            tripoAssetId: null
          },
          transformedWord: 'close',
          transformedModel: {
            type: 'box',
            color: '#F44336',
            tripoAssetId: null
          },
          hudText: {
            initial: 'Open - 打开',
            transformed: 'Close - 关闭'
          }
        }
      },
      {
        id: 'similarity-001',
        type: ModuleTypes.SIMILARITY,
        autoAdvanceSeconds: 45,
        interaction: {
          trigger: ['click'],
          expandButtonLabel: '展开相关词'
        },
        data: {
          coreWord: 'happy',
          coreModel: {
            type: 'sphere',
            color: '#FFD700',
            tripoAssetId: null
          },
          relatedWords: [
            { word: 'joyful', distance: 2, angle: 0 },
            { word: 'cheerful', distance: 2.5, angle: 60 },
            { word: 'delighted', distance: 2, angle: 120 },
            { word: 'pleased', distance: 2.5, angle: 180 },
            { word: 'content', distance: 2, angle: 240 },
            { word: 'glad', distance: 2.5, angle: 300 }
          ],
          connectionStyle: {
            color: '#FFFFFF',
            opacity: 0.6
          }
        }
      },
      {
        id: 'rotate-001',
        type: ModuleTypes.ROTATE,
        autoAdvanceSeconds: 40,
        interaction: {
          trigger: ['gaze'],
          gazeThreshold: 2000 // 毫秒
        },
        data: {
          word: 'house',
          card2D: {
            imageUrl: '/assets/house-2d.jpg',
            width: 2,
            height: 1.5
          },
          model3D: {
            tripoAssetId: null,
            fallbackType: 'box',
            color: '#8B4513'
          },
          callouts: [
            { label: 'roof - 屋顶', angle: 0 },
            { label: 'door - 门', angle: 90 },
            { label: 'window - 窗户', angle: 180 },
            { label: 'wall - 墙壁', angle: 270 }
          ],
          rotationSpeed: 0.5
        }
      },
      {
        id: 'scenarios-001',
        type: ModuleTypes.SCENARIOS,
        autoAdvanceSeconds: 60,
        interaction: {
          trigger: ['click'],
          containerSwitchable: true
        },
        data: {
          initialContainer: ScenarioContainerTypes.DIORAMA_3D,
          containers: [
            {
              type: ScenarioContainerTypes.CINEMAGRAPH_25D,
              hudText: '2.5D 动态场景',
              ambience: { brightness: 1, fog: false }
            },
            {
              type: ScenarioContainerTypes.DIORAMA_3D,
              hudText: '3D 立体场景',
              ambience: { brightness: 0.9, fog: false }
            },
            {
              type: ScenarioContainerTypes.VERTICAL_HOLO,
              hudText: '全息投影模式',
              ambience: { brightness: 0.7, fog: true }
            },
            {
              type: ScenarioContainerTypes.IMMERSIVE_CINEMA,
              hudText: '沉浸式影院',
              ambience: { brightness: 0.3, fog: true }
            }
          ],
          sceneWords: ['kitchen', 'living room', 'bedroom', 'bathroom'],
          tripoSceneId: null
        }
      }
    ]
  },
  'session-002': {
    sessionId: 'session-002',
    title: '空间词汇拓展',
    description: '构建发散词网',
    modules: [
      {
        id: 'similarity-002',
        type: ModuleTypes.SIMILARITY,
        autoAdvanceSeconds: 50,
        interaction: {
          trigger: ['click']
        },
        data: {
          coreWord: 'big',
          coreModel: {
            type: 'sphere',
            color: '#2196F3',
            tripoAssetId: null
          },
          relatedWords: [
            { word: 'large', distance: 2, angle: 0 },
            { word: 'huge', distance: 2.5, angle: 72 },
            { word: 'enormous', distance: 3, angle: 144 },
            { word: 'massive', distance: 2.5, angle: 216 },
            { word: 'giant', distance: 2, angle: 288 }
          ]
        }
      }
    ]
  }
};

/**
 * 获取默认学习会话（使用 vocabulary.js 数据）
 */
export function getDefaultSession() {
  return sampleSessions['vocabulary-session'] || dynamicSession;
}

/**
 * 根据 ID 获取学习会话
 */
export function getSessionById(sessionId) {
  return sampleSessions[sessionId] || null;
}

/**
 * 获取所有可用会话列表
 */
export function getAllSessions() {
  return Object.values(sampleSessions).map(session => ({
    sessionId: session.sessionId,
    title: session.title,
    description: session.description,
    moduleCount: session.modules.length
  }));
}

/**
 * 创建自定义会话
 */
export function createSession(config) {
  const sessionId = `session-${Date.now()}`;
  const newSession = {
    sessionId,
    ...config
  };
  sampleSessions[sessionId] = newSession;
  return newSession;
}

export default {
  getDefaultSession,
  getSessionById,
  getAllSessions,
  createSession
};
