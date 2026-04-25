import * as THREE from 'three';
import { BaseModule } from './BaseModule.js';

/**
 * Click 模块
 * 状态/形态切换，强调对立变化词义
 */
export class ClickModule extends BaseModule {
  constructor(engine, config) {
    super(engine, config);
    
    this.data = config.data;
    this.isTransformed = false;
    this.model = null;
    this.label = null;
  }
  
  async init() {
    // 创建初始模型
    const { initialModel } = this.data;
    this.model = this.createBasicModel(
      initialModel.type || 'box',
      initialModel.color || '#4CAF50'
    );
    this.model.position.set(0, 1.2, 0);
    this.object3D.add(this.model);
    
    // 创建文本标签
    this.updateLabel();
    
    // 注册交互
    this.engine.interactionSystem.register(this.model, {
      onClick: () => this.toggle(),
      onHoverStart: (obj) => this.onHover(true),
      onHoverEnd: (obj) => this.onHover(false)
    });
    
    // 初始不可见
    this.object3D.visible = false;
  }
  
  /**
   * 切换状态
   */
  toggle() {
    this.isTransformed = !this.isTransformed;
    this.resetAutoAdvance();
    
    if (this.isTransformed) {
      this.transformToState();
    } else {
      this.transformToInitial();
    }
    
    // 记录事件
    this.recordEvent('toggle', { isTransformed: this.isTransformed });
  }
  
  /**
   * 变换到变化态
   */
  transformToState() {
    const { transformedModel } = this.data;
    
    // 动画变换
    this.animateScale(this.model, 0.1, 200);
    
    setTimeout(() => {
      // 更换几何体
      if (this.model.geometry) this.model.geometry.dispose();
      
      const type = transformedModel.type || 'sphere';
      switch (type) {
        case 'sphere':
          this.model.geometry = new THREE.SphereGeometry(0.5, 32, 32);
          break;
        case 'cone':
          this.model.geometry = new THREE.ConeGeometry(0.4, 0.8, 32);
          break;
        default:
          this.model.geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      }
      
      // 变换颜色
      this.animateColor(this.model, transformedModel.color || '#F44336', 300);
      this.animateScale(this.model, 1, 300);
      
      // 更新标签
      this.updateLabel();
    }, 200);
    
    this.state = 'transformed';
  }
  
  /**
   * 变换回初始态
   */
  transformToInitial() {
    const { initialModel } = this.data;
    
    this.animateScale(this.model, 0.1, 200);
    
    setTimeout(() => {
      if (this.model.geometry) this.model.geometry.dispose();
      
      const type = initialModel.type || 'box';
      switch (type) {
        case 'sphere':
          this.model.geometry = new THREE.SphereGeometry(0.5, 32, 32);
          break;
        case 'box':
        default:
          this.model.geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      }
      
      this.animateColor(this.model, initialModel.color || '#4CAF50', 300);
      this.animateScale(this.model, 1, 300);
      
      this.updateLabel();
    }, 200);
    
    this.state = 'initial';
  }
  
  /**
   * 更新文本标签
   */
  updateLabel() {
    // 移除旧标签
    if (this.label) {
      this.object3D.remove(this.label);
      this.label.material.dispose();
    }
    
    const { hudText } = this.data;
    const text = this.isTransformed ? hudText.transformed : hudText.initial;
    
    this.label = this.createTextSprite(text, {
      fontSize: 36,
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.6)'
    });
    this.label.position.set(0, 2.2, 0);
    this.object3D.add(this.label);
  }
  
  /**
   * 悬停效果
   */
  onHover(isHovering) {
    if (isHovering) {
      this.animateScale(this.model, 1.1, 150);
      this.model.material.emissive = new THREE.Color(0x333333);
    } else {
      this.animateScale(this.model, 1, 150);
      this.model.material.emissive = new THREE.Color(0x000000);
    }
  }
  
  /**
   * 键盘触发
   */
  onKeyboardTrigger(keyCode) {
    if (keyCode === 'Space' || keyCode === 'Enter') {
      this.toggle();
    }
  }
  
  /**
   * 激活时
   */
  onActivate() {
    // 重置状态
    if (this.isTransformed) {
      this.transformToInitial();
      this.isTransformed = false;
    }
    
    // 入场动画
    this.model.scale.set(0.01, 0.01, 0.01);
    this.animateScale(this.model, 1, 500);
  }
  
  /**
   * 更新循环
   */
  update(delta, elapsed) {
    if (!this.isActive) return;
    
    // 轻微浮动动画
    this.model.position.y = 1.2 + Math.sin(elapsed * 2) * 0.05;
    this.model.rotation.y += delta * 0.3;
  }
  
  /**
   * 记录事件
   */
  recordEvent(eventType, data) {
    if (this.engine.recordEvent) {
      this.engine.recordEvent({
        sessionId: this.engine.sessionId,
        moduleId: this.id,
        eventType,
        data
      });
    }
  }
}

export default ClickModule;
