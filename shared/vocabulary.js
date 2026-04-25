/**
 * 词汇数据配置文件
 * 请在此处添加您的单词数据
 * 
 * 格式说明:
 * - word: 英文单词
 * - translation: 中文翻译
 * - phonetic: 音标 (可选)
 * - difficulty: 难度等级 1-5
 * - category: 分类
 * - modelPrompt: 用于 Tripo API 生成 3D 模型的提示词
 */

export const vocabularyData = {
  // Click 模块 - 点击选择正确单词
  click: [
    // 示例数据，请替换为您的单词
    {
      word: 'apple',
      translation: '苹果',
      phonetic: '/ˈæpl/',
      difficulty: 1,
      category: 'fruit',
      modelPrompt: 'a red apple fruit, 3D model, realistic'
    },
    {
      word: 'banana',
      translation: '香蕉',
      phonetic: '/bəˈnænə/',
      difficulty: 1,
      category: 'fruit',
      modelPrompt: 'a yellow banana fruit, 3D model, realistic'
    },
    {
      word: 'orange',
      translation: '橙子',
      phonetic: '/ˈɔːrɪndʒ/',
      difficulty: 1,
      category: 'fruit',
      modelPrompt: 'an orange fruit, 3D model, realistic'
    }
  ],

  // Similarity 模块 - 匹配相似单词
  similarity: [
    // 示例数据 - 包含相似词组
    {
      word: 'big',
      translation: '大的',
      difficulty: 1,
      category: 'adjective',
      similarWords: ['large', 'huge', 'enormous'],
      modelPrompt: 'a large elephant, 3D model, cartoon style'
    },
    {
      word: 'small',
      translation: '小的',
      difficulty: 1,
      category: 'adjective',
      similarWords: ['little', 'tiny', 'mini'],
      modelPrompt: 'a tiny mouse, 3D model, cartoon style'
    }
  ],

  // Rotate 模块 - 旋转查看 3D 模型学习单词
  rotate: [
    // 示例数据 - 需要从多角度观察的物体
    {
      word: 'car',
      translation: '汽车',
      phonetic: '/kɑːr/',
      difficulty: 2,
      category: 'vehicle',
      modelPrompt: 'a modern sedan car, 3D model, realistic, high detail',
      viewAngles: ['front', 'side', 'back', 'top']
    },
    {
      word: 'airplane',
      translation: '飞机',
      phonetic: '/ˈerpleɪn/',
      difficulty: 2,
      category: 'vehicle',
      modelPrompt: 'a commercial airplane, 3D model, realistic',
      viewAngles: ['front', 'side', 'top']
    }
  ],

  // Scenarios 模块 - 场景化学习
  scenarios: [
    // 示例场景数据
    {
      scenarioName: 'kitchen',
      scenarioTranslation: '厨房',
      description: '学习厨房相关的物品词汇',
      modelPrompt: 'a modern kitchen interior, 3D scene',
      words: [
        { word: 'refrigerator', translation: '冰箱', position: { x: -2, y: 0, z: 0 } },
        { word: 'stove', translation: '炉灶', position: { x: 0, y: 0, z: -2 } },
        { word: 'sink', translation: '水槽', position: { x: 2, y: 0, z: 0 } },
        { word: 'microwave', translation: '微波炉', position: { x: 1, y: 1.5, z: -2 } }
      ]
    },
    {
      scenarioName: 'classroom',
      scenarioTranslation: '教室',
      description: '学习教室相关的物品词汇',
      modelPrompt: 'a school classroom interior, 3D scene',
      words: [
        { word: 'desk', translation: '课桌', position: { x: 0, y: 0, z: 0 } },
        { word: 'chair', translation: '椅子', position: { x: 0, y: 0, z: 1 } },
        { word: 'blackboard', translation: '黑板', position: { x: 0, y: 1.5, z: -3 } },
        { word: 'book', translation: '书', position: { x: 0.5, y: 0.8, z: 0 } }
      ]
    }
  ]
};

/**
 * 获取指定模块的词汇
 * @param {string} moduleType - 模块类型: 'click' | 'similarity' | 'rotate' | 'scenarios'
 * @returns {Array} 词汇数组
 */
export function getVocabularyByModule(moduleType) {
  return vocabularyData[moduleType] || [];
}

/**
 * 获取指定难度的词汇
 * @param {number} difficulty - 难度等级 1-5
 * @returns {Array} 词汇数组
 */
export function getVocabularyByDifficulty(difficulty) {
  const allWords = [
    ...vocabularyData.click,
    ...vocabularyData.similarity,
    ...vocabularyData.rotate
  ];
  return allWords.filter(word => word.difficulty === difficulty);
}

/**
 * 获取指定分类的词汇
 * @param {string} category - 分类名称
 * @returns {Array} 词汇数组
 */
export function getVocabularyByCategory(category) {
  const allWords = [
    ...vocabularyData.click,
    ...vocabularyData.similarity,
    ...vocabularyData.rotate
  ];
  return allWords.filter(word => word.category === category);
}

export default vocabularyData;
