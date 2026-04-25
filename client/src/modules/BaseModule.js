import * as THREE from 'three';
import { modelLoader } from '../services/ModelLoader.js';

/**
 * 模块基类
 * 所有学习模块的抽象基类
 */
export class BaseModule {
  constructor(engine, config) {
    this.engine = engine;
    this.config = config;
    this.id = config.id;
    this.type = config.type;
    this.autoAdvanceSeconds = config.autoAdvanceSeconds || 30;
    
    this.object3D = new THREE.Group();
    this.object3D.name = `Module_${this.id}`;
    
    this.isActive = false;
    this.activationTime = 0;
    this.state = 'initial';
    
    // 自动流转计时器
    this.autoAdvanceTimer = null;
  }
  
  /**
   * 初始化模块（子类实现）
   */
  async init() {
    throw new Error('init() must be implemented by subclass');
  }
  
  /**
   * 激活模块
   */
  activate() {
    this.isActive = true;
    this.activationTime = Date.now();
    this.object3D.visible = true;
    
    // 启动自动流转计时器
    this.startAutoAdvance();
    
    this.onActivate();
  }
  
  /**
   * 停用模块
   */
  deactivate() {
    this.isActive = false;
    this.object3D.visible = false;
    
    // 清除自动流转计时器
    this.stopAutoAdvance();
    
    this.onDeactivate();
  }
  
  /**
   * 激活回调（子类可覆盖）
   */
  onActivate() {}
  
  /**
   * 停用回调（子类可覆盖）
   */
  onDeactivate() {}
  
  /**
   * 更新循环（子类可覆盖）
   */
  update(delta, elapsed) {}
  
  /**
   * 键盘触发处理（子类可覆盖）
   */
  onKeyboardTrigger(keyCode) {}
  
  /**
   * 启动自动流转
   */
  startAutoAdvance() {
    this.stopAutoAdvance();
    
    this.autoAdvanceTimer = setTimeout(() => {
      if (this.isActive) {
        this.engine.nextModule();
      }
    }, this.autoAdvanceSeconds * 1000);
  }
  
  /**
   * 停止自动流转
   */
  stopAutoAdvance() {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }
  
  /**
   * 重置自动流转计时器（用户交互后调用）
   */
  resetAutoAdvance() {
    if (this.isActive) {
      this.startAutoAdvance();
    }
  }
  
  /**
   * 创建文本精灵
   */
  createTextSprite(text, options = {}) {
    const {
      fontSize = 48,
      fontFamily = 'Arial, sans-serif',
      color = '#ffffff',
      backgroundColor = 'transparent',
      padding = 20
    } = options;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 设置字体以测量文本
    context.font = `${fontSize}px ${fontFamily}`;
    const metrics = context.measureText(text);
    
    // 设置画布大小
    canvas.width = metrics.width + padding * 2;
    canvas.height = fontSize + padding * 2;
    
    // 绘制背景
    if (backgroundColor !== 'transparent') {
      context.fillStyle = backgroundColor;
      context.roundRect(0, 0, canvas.width, canvas.height, 8);
      context.fill();
    }
    
    // 绘制文本
    context.font = `${fontSize}px ${fontFamily}`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // 创建纹理和精灵
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(canvas.width / 200, canvas.height / 200, 1);
    
    return sprite;
  }
  
  /**
   * 创建基础几何模型（占位用）
   */
  createBasicModel(type, color) {
    let geometry;
    
    switch (type) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 32);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.4, 0.8, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.4, 0.15, 16, 32);
        break;
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.4,
      metalness: 0.3
    });
    
    return new THREE.Mesh(geometry, material);
  }

  /**
   * 从 Tripo API 加载 3D 模型
   * @param {string} prompt - 模型描述
   * @param {Object} options - 选项
   * @returns {Promise<THREE.Group>}
   */
  async loadTripoModel(prompt, options = {}) {
    console.log('[v0] 加载 Tripo 模型:', prompt);
    
    try {
      const model = await modelLoader.loadFromPrompt(prompt, options);
      
      // 应用缩放
      if (options.scale) {
        model.scale.multiplyScalar(options.scale);
      }
      
      return model;
    } catch (error) {
      console.error('[v0] Tripo 模型加载失败:', error);
      // 返回占位模型
      return this.createBasicModel('sphere', '#888888');
    }
  }

  /**
   * 替换现有模型为 Tripo 模型
   */
  async replaceWithTripoModel(currentModel, prompt, options = {}) {
    const parent = currentModel.parent;
    const position = currentModel.position.clone();
    const rotation = currentModel.rotation.clone();
    
    // 显示加载状态
    this.showModelLoading(currentModel);
    
    try {
      const newModel = await this.loadTripoModel(prompt, options);
      
      // 复制位置和旋转
      newModel.position.copy(position);
      newModel.rotation.copy(rotation);
      
      // 移除旧模型
      if (parent) {
        parent.remove(currentModel);
        parent.add(newModel);
      }
      
      // 清理旧模型
      this.disposeModel(currentModel);
      
      return newModel;
    } catch (error) {
      console.error('[v0] 替换模型失败:', error);
      this.hideModelLoading(currentModel);
      return currentModel;
    }
  }

  /**
   * 显示模型加载状态
   */
  showModelLoading(model) {
    if (model.material) {
      model._originalOpacity = model.material.opacity;
      model.material.transparent = true;
      model.material.opacity = 0.3;
    }
  }

  /**
   * 隐藏模型加载状态
   */
  hideModelLoading(model) {
    if (model.material && model._originalOpacity !== undefined) {
      model.material.opacity = model._originalOpacity;
      delete model._originalOpacity;
    }
  }

  /**
   * 清理单个模型资源
   */
  disposeModel(model) {
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
  }
  
  /**
   * 平滑过渡颜色
   */
  animateColor(mesh, targetColor, duration = 500) {
    const startColor = mesh.material.color.clone();
    const endColor = new THREE.Color(targetColor);
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用 ease-out 缓动
      const eased = 1 - Math.pow(1 - progress, 3);
      
      mesh.material.color.lerpColors(startColor, endColor, eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * 平滑过渡缩放
   */
  animateScale(object, targetScale, duration = 300) {
    const startScale = object.scale.clone();
    const endScale = new THREE.Vector3(targetScale, targetScale, targetScale);
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = 1 - Math.pow(1 - progress, 3);
      
      object.scale.lerpVectors(startScale, endScale, eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * 清理资源
   */
  dispose() {
    this.stopAutoAdvance();
    
    // 递归清理所有子对象
    this.object3D.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

export default BaseModule;
