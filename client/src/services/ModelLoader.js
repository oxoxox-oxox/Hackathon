import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { tripoApi } from '../api/client.js';

/**
 * 模型加载器服务
 * 流程：本地缓存 -> 本地模型文件 -> Tripo API 实时生成 -> 占位模型
 */
export class ModelLoader {
  constructor(options = {}) {
    this.gltfLoader = new GLTFLoader();
    this.cache = new Map(); // word -> model cache
    this.modelMap = null; // 模型映射表
    this.modelMapLoaded = false;
    
    // 实时生成配置
    this.enableRealtimeGeneration = options.enableRealtimeGeneration !== false;
    this.generationTimeout = options.generationTimeout || 120000; // 2分钟
    
    // 生成状态管理
    this.generationTasks = new Map(); // word -> Promise
    this.failedWords = new Set(); // 生成失败的单词
    
    // 事件回调
    this.eventCallbacks = {
      onGenerationStart: [],
      onGenerationProgress: [],
      onGenerationComplete: [],
      onGenerationFailed: []
    };
  }

  /**
   * 注册事件回调
   */
  on(event, callback) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].push(callback);
    }
  }

  /**
   * 移除事件回调
   */
  off(event, callback) {
    if (this.eventCallbacks[event]) {
      const index = this.eventCallbacks[event].indexOf(callback);
      if (index > -1) {
        this.eventCallbacks[event].splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  _emit(event, data) {
    if (this.eventCallbacks[event]) {
      this.eventCallbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error('[ModelLoader] 事件回调错误:', e);
        }
      });
    }
  }

  /**
   * 加载模型映射表
   */
  async loadModelMap() {
    if (this.modelMapLoaded) return this.modelMap;
    
    try {
      const response = await fetch('/models/model-map.json');
      if (response.ok) {
        this.modelMap = await response.json();
        console.log('[ModelLoader] 模型映射表已加载:', Object.keys(this.modelMap).length, '个模型');
      } else {
        this.modelMap = {};
      }
    } catch (error) {
      this.modelMap = {};
      console.warn('[ModelLoader] 加载模型映射表失败:', error);
    }
    
    this.modelMapLoaded = true;
    return this.modelMap;
  }

  /**
   * 根据单词加载 3D 模型
   * 流程：缓存 -> 本地文件 -> Tripo API 生成 -> 占位模型
   */
  async loadByWord(word, options = {}) {
    const cacheKey = word.toLowerCase().trim();
    
    // 1. 检查内存缓存
    if (this.cache.has(cacheKey)) {
      console.log('[ModelLoader] 从缓存加载:', word);
      return this.cloneModel(this.cache.get(cacheKey));
    }

    // 2. 确保模型映射表已加载
    await this.loadModelMap();

    // 3. 查找本地模型
    const modelPath = this.modelMap[word] || this.modelMap[cacheKey];
    if (modelPath) {
      try {
        console.log('[ModelLoader] 从本地加载:', word, modelPath);
        const model = await this._loadGLB(modelPath);
        this._normalizeModel(model, options.scale || 1);
        this.cache.set(cacheKey, model);
        return this.cloneModel(model);
      } catch (error) {
        console.error('[ModelLoader] 本地模型加载失败:', word, error);
      }
    }

    // 4. 尝试实时生成模型
    if (this.enableRealtimeGeneration && !this.failedWords.has(cacheKey)) {
      try {
        console.log('[ModelLoader] 调用 Tripo API 生成模型:', word);
        const model = await this.generateModelForWord(word, options);
        return model;
      } catch (error) {
        console.warn('[ModelLoader] Tripo 生成失败，使用占位模型:', word, error.message);
      }
    }

    // 5. 返回占位模型
    console.log('[ModelLoader] 使用占位模型:', word);
    const placeholder = this._createPlaceholderModel(word, options.color);
    return placeholder;
  }

  /**
   * 为单词生成 3D 模型 (调用 Tripo API)
   */
  async generateModelForWord(word, options = {}) {
    const cacheKey = word.toLowerCase().trim();

    // 检查是否已在生成中
    if (this.generationTasks.has(cacheKey)) {
      console.log('[ModelLoader] 等待已有生成任务:', word);
      return this.generationTasks.get(cacheKey);
    }

    // 检查是否之前失败过
    if (this.failedWords.has(cacheKey)) {
      throw new Error(`Previously failed: ${word}`);
    }

    // 创建生成任务
    const task = this._executeGeneration(word, options)
      .then(model => {
        this.cache.set(cacheKey, model);
        return this.cloneModel(model);
      })
      .catch(error => {
        this.failedWords.add(cacheKey);
        throw error;
      })
      .finally(() => {
        this.generationTasks.delete(cacheKey);
      });

    this.generationTasks.set(cacheKey, task);
    return task;
  }

  /**
   * 执行实际的模型生成
   */
  async _executeGeneration(word, options = {}) {
    // 触发开始事件
    this._emit('onGenerationStart', { word });

    try {
      // 生成提示词
      const prompt = options.prompt || `A detailed 3D model of a ${word}, realistic style, high quality, centered composition`;

      console.log('[ModelLoader] 提交生成任务:', word, prompt);

      // 调用 Tripo API
      const result = await tripoApi.generateFromText(prompt, {
        model_version: 'v2.0-20240919',
        face_limit: 10000
      });

      console.log('[ModelLoader] 任务已创建:', word, result.taskId);
      this._emit('onGenerationProgress', { word, status: 'processing', taskId: result.taskId });

      // 等待任务完成
      const taskResult = await tripoApi.waitForTask(result.taskId, {
        maxAttempts: 60,
        interval: 2000
      });

      console.log('[ModelLoader] 任务完成:', word, taskResult);

      // 获取模型 URL
      let modelUrl = null;
      if (taskResult.result?.model?.glb?.url) {
        modelUrl = taskResult.result.model.glb.url;
      } else if (taskResult.result?.pbr_model?.glb?.url) {
        modelUrl = taskResult.result.pbr_model.glb.url;
      } else if (taskResult.output?.model) {
        modelUrl = taskResult.output.model;
      }

      if (!modelUrl) {
        console.error('[ModelLoader] 无法获取模型 URL:', taskResult);
        throw new Error('No model URL in response');
      }

      console.log('[ModelLoader] 下载模型:', word, modelUrl);

      // 加载模型
      const model = await this._loadGLB(modelUrl);
      this._normalizeModel(model, options.scale || 1);

      // 触发完成事件
      this._emit('onGenerationComplete', { word, model });

      return model;
    } catch (error) {
      console.error('[ModelLoader] 生成失败:', word, error);
      this._emit('onGenerationFailed', { word, error });
      throw error;
    }
  }

  /**
   * 加载 GLB 文件
   */
  _loadGLB(url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          resolve(gltf.scene);
        },
        (progress) => {
          // 加载进度
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * 标准化模型大小和位置
   */
  _normalizeModel(model, scale = 1) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const normalizeScale = scale / maxDim;
      model.scale.multiplyScalar(normalizeScale);
      model.position.sub(center.multiplyScalar(normalizeScale));
    }
  }

  /**
   * 克隆模型
   */
  cloneModel(model) {
    const cloned = model.clone();
    
    cloned.traverse(child => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
      }
    });
    
    return cloned;
  }

  /**
   * 创建占位模型
   */
  _createPlaceholderModel(word, color = 0x4CAF50) {
    const group = new THREE.Group();
    group.name = 'placeholder_' + word;

    const geometry = this._getGeometryForWord(word);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }

  /**
   * 根据单词选择几何体
   */
  _getGeometryForWord(word) {
    const hash = this._hashCode(word);
    const geometries = [
      () => new THREE.SphereGeometry(0.5, 32, 32),
      () => new THREE.BoxGeometry(0.8, 0.8, 0.8),
      () => new THREE.ConeGeometry(0.5, 1, 32),
      () => new THREE.CylinderGeometry(0.4, 0.4, 0.8, 32),
      () => new THREE.TorusGeometry(0.4, 0.15, 16, 32),
      () => new THREE.OctahedronGeometry(0.5),
      () => new THREE.DodecahedronGeometry(0.5),
      () => new THREE.IcosahedronGeometry(0.5)
    ];
    
    return geometries[Math.abs(hash) % geometries.length]();
  }

  /**
   * 简单的字符串哈希函数
   */
  _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.forEach(model => {
      model.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.cache.clear();
    this.failedWords.clear();
  }
}

// 单例导出
export const modelLoader = new ModelLoader({
  enableRealtimeGeneration: true
});

export default modelLoader;
