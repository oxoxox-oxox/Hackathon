import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 词库服务
 * 负责解析CSV词库文件并生成适合Tripo API的模型提示词
 */

// 词库缓存
let vocabularyCache = null;

/**
 * 解析CSV文件
 * CSV格式: Word, Translation, VR Environment, VR Interaction
 */
function parseCSV(content) {
  const lines = content.split('\n');
  const words = [];
  
  let currentWord = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // 检查是否是新单词行（以英文单词开头，后面跟中文翻译）
    const wordMatch = line.match(/^([A-Za-z]+)\s+(.+?)\s+["【]/);
    
    if (wordMatch) {
      // 保存前一个单词
      if (currentWord) {
        words.push(currentWord);
      }
      
      currentWord = {
        word: wordMatch[1],
        translation: wordMatch[2],
        vrEnvironment: '',
        vrInteraction: ''
      };
    }
  }
  
  // 保存最后一个单词
  if (currentWord) {
    words.push(currentWord);
  }
  
  return words;
}

/**
 * 简化解析 - 直接按制表符分隔
 */
function parseCSVSimple(content) {
  const lines = content.split('\n');
  const words = [];
  const seen = new Set();
  
  for (const line of lines) {
    // 匹配格式: Word  Translation  【...
    const match = line.match(/^([A-Za-z]+)\s+([^\s【]+)/);
    if (match) {
      const word = match[1].trim();
      const translation = match[2].trim();
      
      // 去重
      if (!seen.has(word)) {
        seen.add(word);
        words.push({
          word,
          translation,
          // 生成适合 Tripo API 的 3D 模型提示词
          modelPrompt: generateModelPrompt(word, translation)
        });
      }
    }
  }
  
  return words;
}

/**
 * 为单词生成 Tripo API 的 3D 模型提示词
 * 优化提示词以获得高质量的3D模型
 */
function generateModelPrompt(word, translation) {
  // 根据单词类型生成不同的提示词
  const promptTemplates = {
    // 人体解剖
    'Skeleton': 'A detailed human skeleton, anatomical model, medical quality, white bones, 3D printable style',
    'Skull': 'A realistic human skull, anatomical detail, medical model, clean white bone texture',
    'Organ': 'A realistic human heart organ, anatomical model, detailed medical illustration style',
    'Tissue': 'Biological tissue sample, cellular structure visible, microscopic view, scientific model',
    'Artery': 'Human artery blood vessel, cross-section view, red interior, anatomical model',
    'Vein': 'Human vein blood vessel, blue tinted, anatomical cross-section, medical model',
    'Spine': 'Human spinal column, vertebrae detailed, anatomical model, medical quality',
    'Cartilage': 'Cartilage tissue, knee joint cartilage, translucent white, anatomical model',
    'Neuron': 'A neuron nerve cell, dendrites and axon visible, biological model, scientific illustration',
    'Embryo': 'Human embryo, early development stage, medical model, scientific illustration',
    
    // 自然生物
    'Fossil': 'A dinosaur fossil embedded in rock, paleontology specimen, museum quality',
    'Specimen': 'A biological specimen in glass jar, preserved creature, scientific collection',
    'Canopy': 'Rainforest tree canopy, dense green leaves, top view, natural model',
    'Coral': 'Colorful coral reef structure, ocean coral, vibrant colors, underwater model',
    'Antenna': 'Insect antenna, detailed sensory organ, biological model, macro view',
    'Claw': 'Animal claw, sharp curved talon, detailed texture, natural model',
    'Beak': 'Bird beak, eagle or parrot style, detailed keratin texture, natural model',
    'Tentacle': 'Octopus tentacle, suction cups visible, underwater creature, detailed model',
    
    // 植物
    'Stem': 'Plant stem, green stalk with nodes, botanical model, cross-section visible',
    'Petal': 'Flower petal, rose petal style, soft texture, botanical model',
    'Root': 'Plant root system, underground structure, soil particles, botanical model',
    'Pollen': 'Pollen grain, microscopic view, spiky yellow sphere, scientific model',
    'Trunk': 'Tree trunk, bark texture detailed, wooden cylinder, natural model',
    
    // 微生物
    'Chromosome': 'X-shaped chromosome, DNA structure, genetic model, scientific illustration',
    'DNA': 'DNA double helix structure, colorful base pairs, molecular model, scientific',
    'Microbe': 'Microscopic bacteria, single cell organism, biological model, scientific',
    'Virus': 'Virus particle, coronavirus style spike proteins, molecular model, scientific',
    'Protein': 'Protein molecule structure, folded chain, molecular model, colorful',
    'Enzyme': 'Enzyme molecule, lock and key structure, biochemical model',
    'Membrane': 'Cell membrane, lipid bilayer, cross-section view, biological model',
    
    // 地理
    'Hemisphere': 'Earth hemisphere, globe half, geographical model, topographic detail',
    'Equator': 'Earth globe with equator line highlighted, geographical model',
    'Latitude': 'Globe with latitude lines, geographical grid, educational model',
    'Longitude': 'Globe with longitude lines, meridian grid, educational model',
    'Axis': 'Earth tilted on axis, rotation axis visible, astronomical model',
    'Orbit': 'Planetary orbit path, elliptical ring, solar system model',
    'Crater': 'Meteor crater, impact site, rocky terrain, geological model',
    'Volcano': 'Active volcano, lava flow, eruption scene, geological model',
    'Glacier': 'Blue glacier ice, mountain glacier, frozen terrain, geological model',
    'Canyon': 'Grand canyon landscape, layered rock walls, geological formation',
    'Plateau': 'Elevated plateau terrain, flat top mountain, geographical model',
    'Terrain': 'Varied terrain landscape, mountains and valleys, topographic model',
    'Peninsula': 'Peninsula landform, surrounded by water, geographical model',
    'Coastline': 'Rocky coastline, waves crashing, geographical model',
    'Atmosphere': 'Earth atmosphere layers, blue gradient, scientific model',
    'Meteor': 'Burning meteor, fiery trail, space rock, astronomical model',
    'Comet': 'Comet with glowing tail, icy core, space object, astronomical',
    'Asteroid': 'Rocky asteroid, irregular shape, space rock, detailed texture'
  };
  
  // 如果有预定义的提示词，使用它
  if (promptTemplates[word]) {
    return promptTemplates[word];
  }
  
  // 否则生成通用提示词
  return `A detailed 3D model of ${word.toLowerCase()} (${translation}), realistic style, high quality, centered composition, clean background`;
}

/**
 * 加载词库
 */
export async function loadVocabulary() {
  if (vocabularyCache) {
    return vocabularyCache;
  }
  
  try {
    const csvPath = path.resolve(__dirname, '../../../data/words.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    vocabularyCache = parseCSVSimple(content);
    console.log(`[v0] 已加载 ${vocabularyCache.length} 个词汇`);
    return vocabularyCache;
  } catch (error) {
    console.error('[v0] 加载词库失败:', error);
    return [];
  }
}

/**
 * 获取所有词汇
 */
export async function getAllWords() {
  return loadVocabulary();
}

/**
 * 按索引获取词汇
 */
export async function getWordByIndex(index) {
  const words = await loadVocabulary();
  return words[index] || null;
}

/**
 * 获取词汇总数
 */
export async function getWordCount() {
  const words = await loadVocabulary();
  return words.length;
}

/**
 * 获取分页词汇
 */
export async function getWordsPaginated(page = 1, pageSize = 10) {
  const words = await loadVocabulary();
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    words: words.slice(start, end),
    total: words.length,
    page,
    pageSize,
    totalPages: Math.ceil(words.length / pageSize)
  };
}

/**
 * 搜索词汇
 */
export async function searchWords(query) {
  const words = await loadVocabulary();
  const lowerQuery = query.toLowerCase();
  
  return words.filter(w => 
    w.word.toLowerCase().includes(lowerQuery) ||
    w.translation.includes(query)
  );
}

export default {
  loadVocabulary,
  getAllWords,
  getWordByIndex,
  getWordCount,
  getWordsPaginated,
  searchWords,
  generateModelPrompt
};
