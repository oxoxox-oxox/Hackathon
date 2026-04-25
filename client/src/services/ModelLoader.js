import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * 模型加载器服务
 * 优先从本地 public/models 加载预生成的模型
 * 如果本地不存在，则使用占位模型
 */
export class ModelLoader {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.cache = new Map(); // word -> model cache
    this.modelMap = null; // 模型映射表
    this.modelMapLoaded = false;
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
        console.log('[v0] 模型映射表已加载:', Object.keys(this.modelMap).length, '个模型');
      } else {
        this.modelMap = {};
        console.warn('[v0] 模型映射表不存在，将使用占位模型');
      }
    } catch (error) {
      this.modelMap = {};
      console.warn('[v0] 加载模型映射表失败:', error);
    }
    
    this.modelMapLoaded = true;
    return this.modelMap;
  }

  /**
   * 根据单词加载本地 3D 模型
   * @param {string} word - 单词
   * @param {Object} options - 选项
   * @returns {Promise<THREE.Group>} 加载的模型
   */
  async loadByWord(word, options = {}) {
    const cacheKey = word.toLowerCase().trim();
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      console.log('[v0] 从缓存加载模型:', word);
      return this.cloneModel(this.cache.get(cacheKey));
    }

    // 确保模型映射表已加载
    await this.loadModelMap();

    // 查找本地模型路径
    const modelPath = this.modelMap[word] || this.modelMap[cacheKey];
    
    if (modelPath) {
      try {
        console.log('[v0] 从本地加载模型:', word, modelPath);
        const model = await this._loadGLB(modelPath);
        this._normalizeModel(model, options.scale || 1);
        this.cache.set(cacheKey, model);
        return this.cloneModel(model);
      } catch (error) {
        console.error('[v0] 本地模型加载失败:', word, error);
      }
    }

    // 本地模型不存在，返回占位模型
    console.log('[v0] 使用占位模型:', word);
    const placeholder = this._createPlaceholderModel(word, options.color);
    return placeholder;
  }

  /**
   * 根据提示词加载模型（兼容旧接口）
   * 现在改为从本地加载
   */
  async loadFromPrompt(prompt, options = {}) {
    // 从提示词中提取单词（简单处理）
    const word = this._extractWordFromPrompt(prompt);
    return this.loadByWord(word, options);
  }

  /**
   * 从提示词中提取单词
   */
  _extractWordFromPrompt(prompt) {
    // 尝试匹配常见模式
    const patterns = [
      /^a 3d model of (?:a |an )?(.+?),/i,
      /^(.+?),/,
      /^(.+)$/
    ];
    
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) {
        return match[1].trim().toLowerCase();
      }
    }
    
    return prompt.trim().toLowerCase();
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
        undefined,
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
    // 计算包围盒
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 计算缩放比例，使最大维度为 1
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const normalizeScale = scale / maxDim;
      model.scale.multiplyScalar(normalizeScale);
      // 居中模型
      model.position.sub(center.multiplyScalar(normalizeScale));
    }
  }

  /**
   * 克隆模型
   */
  cloneModel(model) {
    const cloned = model.clone();
    
    // 深度克隆材质以避免共享
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
    group.name = 'model_' + word;

    // 根据单词生成不同的几何体
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
    // 基于单词生成一个确定性的几何体类型
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
   * 预加载模型列表
   */
  async preload(words) {
    console.log('[v0] 预加载模型:', words.length, '个');
    
    const results = await Promise.allSettled(
      words.map(word => this.loadByWord(word))
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    console.log('[v0] 预加载完成:', success, '/', words.length);
    
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
