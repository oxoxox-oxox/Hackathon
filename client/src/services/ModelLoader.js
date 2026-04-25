import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { tripoApi } from '../api/client.js';

/**
 * 模型加载器服务
 * 负责从 Tripo API 生成并加载 3D 模型
 */
export class ModelLoader {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.cache = new Map(); // prompt -> model cache
    this.pendingTasks = new Map(); // prompt -> Promise
    this.loadingManager = new THREE.LoadingManager();
  }

  /**
   * 根据文本提示生成并加载 3D 模型
   * @param {string} prompt - 模型描述
   * @param {Object} options - 选项
   * @returns {Promise<THREE.Group>} 加载的模型
   */
  async loadFromPrompt(prompt, options = {}) {
    const cacheKey = prompt.toLowerCase().trim();
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      console.log('[v0] 从缓存加载模型:', prompt);
      return this.cache.get(cacheKey).clone();
    }

    // 检查是否有进行中的任务
    if (this.pendingTasks.has(cacheKey)) {
      console.log('[v0] 等待进行中的任务:', prompt);
      const model = await this.pendingTasks.get(cacheKey);
      return model.clone();
    }

    // 创建新的加载任务
    const loadPromise = this._generateAndLoad(prompt, options);
    this.pendingTasks.set(cacheKey, loadPromise);

    try {
      const model = await loadPromise;
      this.cache.set(cacheKey, model);
      return model.clone();
    } finally {
      this.pendingTasks.delete(cacheKey);
    }
  }

  /**
   * 内部方法：生成并加载模型
   */
  async _generateAndLoad(prompt, options) {
    console.log('[v0] 开始生成模型:', prompt);

    try {
      // 1. 调用 Tripo API 生成模型
      const task = await tripoApi.generateFromText(prompt, {
        faceLimit: options.faceLimit || 10000,
        texture: true,
        pbr: true
      });

      console.log('[v0] Tripo 任务已创建:', task.taskId);

      // 2. 等待任务完成
      const result = await tripoApi.waitForTask(task.taskId, {
        maxAttempts: 120,
        interval: 3000
      });

      console.log('[v0] Tripo 任务完成:', result);

      if (!result.result?.modelUrl) {
        throw new Error('模型 URL 不存在');
      }

      // 3. 加载 GLB 模型
      const model = await this._loadGLB(result.result.modelUrl);
      
      // 4. 标准化模型
      this._normalizeModel(model);

      console.log('[v0] 模型加载成功:', prompt);
      return model;

    } catch (error) {
      console.error('[v0] 模型生成失败:', error);
      // 返回占位模型
      return this._createPlaceholderModel(prompt);
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
          console.log('[v0] 加载进度:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
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
  _normalizeModel(model) {
    // 计算包围盒
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 计算缩放比例，使最大维度为 1
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1 / maxDim;

    model.scale.multiplyScalar(scale);

    // 居中模型
    model.position.sub(center.multiplyScalar(scale));
  }

  /**
   * 创建占位模型
   */
  _createPlaceholderModel(prompt) {
    const group = new THREE.Group();
    group.name = 'placeholder_' + prompt;

    // 创建一个简单的占位几何体
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.2,
      wireframe: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    // 添加加载中文字
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('加载中...', 128, 38);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1, 0.25, 1);
    sprite.position.y = 0.8;
    group.add(sprite);

    return group;
  }

  /**
   * 预加载模型列表
   */
  async preload(prompts) {
    console.log('[v0] 预加载模型:', prompts.length, '个');
    
    const results = await Promise.allSettled(
      prompts.map(prompt => this.loadFromPrompt(prompt))
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    console.log('[v0] 预加载完成:', success, '/', prompts.length);
    
    return results;
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
  }
}

// 单例导出
export const modelLoader = new ModelLoader();
export default modelLoader;
