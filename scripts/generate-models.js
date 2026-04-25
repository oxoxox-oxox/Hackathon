/**
 * 批量生成 3D 模型脚本
 * 从词库读取词汇，调用 Tripo API 生成模型，保存到 client/public/models
 * 
 * 使用方法:
 * node --env-file-if-exists=/vercel/share/.env.project scripts/generate-models.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRIPO_API_KEY = process.env.TRIPO_API_KEY;
const TRIPO_API_URL = 'https://api.tripo3d.ai/v2/openapi';
const MODELS_DIR = path.resolve(__dirname, '../client/public/models');
const DATA_DIR = path.resolve(__dirname, '../data');

// 确保模型目录存在
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

/**
 * 解析 CSV 文件
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const words = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= 2) {
      words.push({
        index: i - 1,
        word: values[0]?.trim() || '',
        translation: values[1]?.trim() || '',
        vrDescription: values[2]?.trim() || '',
        interaction: values[3]?.trim() || ''
      });
    }
  }
  return words;
}

/**
 * 解析 CSV 行（处理引号）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * 生成模型提示词
 */
function generatePrompt(word) {
  // 使用 VR 描述或单词本身生成提示词
  const description = word.vrDescription || word.word;
  return `A 3D model of ${description}, cartoon style, simple geometry, low poly, bright colors, suitable for VR education`;
}

/**
 * 调用 Tripo API 生成模型
 */
async function generateModel(prompt) {
  const response = await fetch(`${TRIPO_API_URL}/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TRIPO_API_KEY}`
    },
    body: JSON.stringify({
      type: 'text_to_model',
      prompt: prompt,
      model_version: 'v2.0-20240919',
      face_limit: 10000 // 低面数，加快生成
    })
  });
  
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Tripo API error: ${data.message}`);
  }
  
  return data.data.task_id;
}

/**
 * 等待任务完成
 */
async function waitForTask(taskId, maxWaitMs = 300000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${TRIPO_API_URL}/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${TRIPO_API_KEY}`
      }
    });
    
    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Task query error: ${data.message}`);
    }
    
    const status = data.data.status;
    console.log(`  任务状态: ${status}`);
    
    if (status === 'success') {
      return data.data.output.model;
    } else if (status === 'failed') {
      throw new Error('Model generation failed');
    }
    
    // 等待 5 秒后重试
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('Task timeout');
}

/**
 * 下载模型文件
 */
async function downloadModel(url, outputPath) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

/**
 * 生成模型映射文件
 */
function generateModelMap(words, generatedModels) {
  const modelMap = {};
  
  for (const word of words) {
    const modelFile = generatedModels[word.word];
    if (modelFile) {
      modelMap[word.word] = `/models/${modelFile}`;
    }
  }
  
  fs.writeFileSync(
    path.join(MODELS_DIR, 'model-map.json'),
    JSON.stringify(modelMap, null, 2)
  );
  
  console.log(`\n已生成模型映射文件: model-map.json`);
}

/**
 * 主函数
 */
async function main() {
  if (!TRIPO_API_KEY) {
    console.error('错误: TRIPO_API_KEY 环境变量未设置');
    process.exit(1);
  }
  
  // 读取词库
  const csvPath = path.join(DATA_DIR, 'words.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('错误: 词库文件不存在:', csvPath);
    process.exit(1);
  }
  
  const words = parseCSV(csvPath);
  console.log(`已加载 ${words.length} 个词汇\n`);
  
  // 检查已存在的模型
  const existingModels = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.glb'));
  console.log(`已存在 ${existingModels.length} 个模型\n`);
  
  const generatedModels = {};
  
  // 从已有模型中恢复映射
  for (const modelFile of existingModels) {
    const wordName = modelFile.replace('.glb', '');
    generatedModels[wordName] = modelFile;
  }
  
  // 获取要生成的数量（命令行参数或默认前10个）
  const count = parseInt(process.argv[2]) || 10;
  const wordsToGenerate = words.slice(0, count).filter(w => !generatedModels[w.word]);
  
  console.log(`将生成 ${wordsToGenerate.length} 个新模型\n`);
  
  for (let i = 0; i < wordsToGenerate.length; i++) {
    const word = wordsToGenerate[i];
    const outputPath = path.join(MODELS_DIR, `${word.word}.glb`);
    
    // 跳过已存在的模型
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${wordsToGenerate.length}] 跳过: ${word.word} (已存在)`);
      generatedModels[word.word] = `${word.word}.glb`;
      continue;
    }
    
    console.log(`[${i + 1}/${wordsToGenerate.length}] 生成: ${word.word}`);
    
    try {
      const prompt = generatePrompt(word);
      console.log(`  提示词: ${prompt}`);
      
      // 生成模型
      const taskId = await generateModel(prompt);
      console.log(`  任务ID: ${taskId}`);
      
      // 等待完成
      const modelUrl = await waitForTask(taskId);
      console.log(`  模型URL: ${modelUrl}`);
      
      // 下载模型
      await downloadModel(modelUrl, outputPath);
      console.log(`  已保存: ${outputPath}`);
      
      generatedModels[word.word] = `${word.word}.glb`;
      
      // 避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  错误: ${error.message}`);
    }
  }
  
  // 生成模型映射
  generateModelMap(words, generatedModels);
  
  console.log(`\n完成! 共生成 ${Object.keys(generatedModels).length} 个模型`);
}

main().catch(console.error);
