import * as THREE from 'three';
import { BaseModule } from './BaseModule.js';

/**
 * Rotate 模块
 * 从 2D 到 3D 的结构解构
 */
export class RotateModule extends BaseModule {
  constructor(engine, config) {
    super(engine, config);
    
    this.data = config.data;
    this.is3DMode = false;
    this.card2D = null;
    this.model3D = null;
    this.callouts = [];
    this.gazeProgress = 0;
    this.gazeRequired = config.interaction?.gazeThreshold || 2000;
  }
  
  async init() {
    // 创建 2D 卡片
    this.create2DCard();
    
    // 创建 3D 模型（初始隐藏）
    this.create3DModel();
    
    // 创建标注
    this.createCallouts();
    
    // 创建凝视进度指示器
    this.createGazeIndicator();
    
    // 创建主标签
    this.mainLabel = this.createTextSprite(this.data.word, {
      fontSize: 48,
      color: '#ffffff'
    });
    this.mainLabel.position.set(0, 2.8, 0);
    this.object3D.add(this.mainLabel);
    
    // 注册交互
    this.engine.interactionSystem.register(this.card2D, {
      onGaze: () => this.onGazeComplete(),
      onHoverStart: () => this.onCardHover(true),
      onHoverEnd: () => this.onCardHover(false),
      onClick: () => this.toggle3D()
    });
    
    this.object3D.visible = false;
  }
  
  /**
   * 创建 2D 卡片
   */
  create2DCard() {
    const { card2D } = this.data;
    const width = card2D?.width || 2;
    const height = card2D?.height || 1.5;
    
    const geometry = new THREE.PlaneGeometry(width, height);
    
    // 创建渐变纹理
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    
    // 绘制渐变背景
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(1, '#0d47a1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制边框
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // 绘制文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.data.word.toUpperCase(), canvas.width / 2, canvas.height / 2);
    
    // 绘制 "注视以查看 3D" 提示
    ctx.font = '24px Arial';
    ctx.fillStyle = '#b0bec5';
    ctx.fillText('注视以查看 3D 模型', canvas.width / 2, canvas.height - 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    
    this.card2D = new THREE.Mesh(geometry, material);
    this.card2D.position.set(0, 1.5, 0);
    this.object3D.add(this.card2D);
  }
  
  /**
   * 创建 3D 模型
   */
  create3DModel() {
    const { model3D } = this.data;
    
    // 使用后备几何体
    this.model3D = this.createBasicModel(
      model3D?.fallbackType || 'box',
      model3D?.color || '#8B4513'
    );
    this.model3D.position.set(0, 1.5, 0);
    this.model3D.visible = false;
    this.object3D.add(this.model3D);
    
    // 注册 3D 模型交互
    this.engine.interactionSystem.register(this.model3D, {
      onClick: () => this.toggle3D(),
      onHoverStart: () => this.onModelHover(true),
      onHoverEnd: () => this.onModelHover(false)
    });
  }
  
  /**
   * 创建标注
   */
  createCallouts() {
    const { callouts } = this.data;
    if (!callouts) return;
    
    callouts.forEach((callout, index) => {
      const angle = (callout.angle || (index * 90)) * Math.PI / 180;
      const radius = 1.5;
      
      // 标注点
      const dotGeometry = new THREE.SphereGeometry(0.05, 16, 16);
      const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff9800 });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      
      // 计算位置
      const x = Math.cos(angle) * 0.5;
      const z = Math.sin(angle) * 0.5;
      dot.position.set(x, 1.5, z);
      dot.visible = false;
      this.object3D.add(dot);
      
      // 标注文字
      const label = this.createTextSprite(callout.label, {
        fontSize: 24,
        color: '#ff9800',
        backgroundColor: 'rgba(0, 0, 0, 0.7)'
      });
      label.position.set(
        Math.cos(angle) * radius,
        1.5 + (index % 2) * 0.3,
        Math.sin(angle) * radius
      );
      label.visible = false;
      this.object3D.add(label);
      
      // 连接线
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 1.5, z),
        new THREE.Vector3(Math.cos(angle) * radius * 0.8, 1.5 + (index % 2) * 0.3, Math.sin(angle) * radius * 0.8)
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff9800,
        transparent: true,
        opacity: 0.6
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.visible = false;
      this.object3D.add(line);
      
      this.callouts.push({ dot, label, line, angle: callout.angle, data: callout });
    });
  }
  
  /**
   * 创建凝视进度指示器
   */
  createGazeIndicator() {
    const geometry = new THREE.RingGeometry(0.35, 0.4, 32, 1, 0, 0);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    
    this.gazeIndicator = new THREE.Mesh(geometry, material);
    this.gazeIndicator.position.set(0, 1.5, 0.01);
    this.gazeIndicator.visible = false;
    this.object3D.add(this.gazeIndicator);
  }
  
  /**
   * 更新凝视进度
   */
  updateGazeProgress(progress) {
    if (!this.gazeIndicator) return;
    
    // 更新环形进度
    const angle = progress * Math.PI * 2;
    this.gazeIndicator.geometry.dispose();
    this.gazeIndicator.geometry = new THREE.RingGeometry(0.35, 0.4, 32, 1, 0, angle);
  }
  
  /**
   * 凝视完成
   */
  onGazeComplete() {
    if (!this.is3DMode) {
      this.toggle3D();
    }
  }
  
  /**
   * 切换 2D/3D
   */
  toggle3D() {
    this.resetAutoAdvance();
    
    if (this.is3DMode) {
      this.switchTo2D();
    } else {
      this.switchTo3D();
    }
  }
  
  /**
   * 切换到 3D
   */
  switchTo3D() {
    this.is3DMode = true;
    this.state = '3d';
    
    // 2D 卡片淡出
    this.animateScale(this.card2D, 0.01, 300);
    
    setTimeout(() => {
      this.card2D.visible = false;
      this.gazeIndicator.visible = false;
      
      // 3D 模型淡入
      this.model3D.visible = true;
      this.model3D.scale.set(0.01, 0.01, 0.01);
      this.animateScale(this.model3D, 1, 400);
      
      // 显示标注
      this.showCallouts();
    }, 300);
  }
  
  /**
   * 切换到 2D
   */
  switchTo2D() {
    this.is3DMode = false;
    this.state = '2d';
    
    // 隐藏标注
    this.hideCallouts();
    
    // 3D 模型淡出
    this.animateScale(this.model3D, 0.01, 300);
    
    setTimeout(() => {
      this.model3D.visible = false;
      
      // 2D 卡片淡入
      this.card2D.visible = true;
      this.card2D.scale.set(0.01, 0.01, 0.01);
      this.animateScale(this.card2D, 1, 400);
    }, 300);
  }
  
  /**
   * 显示标注
   */
  showCallouts() {
    this.callouts.forEach((callout, index) => {
      setTimeout(() => {
        callout.dot.visible = true;
        callout.label.visible = true;
        callout.line.visible = true;
        
        // 动画效果
        callout.dot.scale.set(0.01, 0.01, 0.01);
        this.animateScale(callout.dot, 1, 200);
      }, index * 200);
    });
  }
  
  /**
   * 隐藏标注
   */
  hideCallouts() {
    this.callouts.forEach(callout => {
      callout.dot.visible = false;
      callout.label.visible = false;
      callout.line.visible = false;
    });
  }
  
  /**
   * 卡片悬停
   */
  onCardHover(isHovering) {
    this.gazeIndicator.visible = isHovering && !this.is3DMode;
    
    if (isHovering) {
      this.animateScale(this.card2D, 1.05, 150);
    } else {
      this.animateScale(this.card2D, 1, 150);
      this.gazeProgress = 0;
      this.updateGazeProgress(0);
    }
  }
  
  /**
   * 模型悬停
   */
  onModelHover(isHovering) {
    if (isHovering) {
      // 暂停自转
      this.pauseRotation = true;
    } else {
      this.pauseRotation = false;
    }
  }
  
  /**
   * 键盘触发
   */
  onKeyboardTrigger(keyCode) {
    if (keyCode === 'Space' || keyCode === 'Enter') {
      this.toggle3D();
    }
  }
  
  /**
   * 激活时
   */
  onActivate() {
    // 重置状态
    if (this.is3DMode) {
      this.model3D.visible = false;
      this.hideCallouts();
      this.is3DMode = false;
    }
    
    this.card2D.visible = true;
    this.card2D.scale.set(0.01, 0.01, 0.01);
    this.animateScale(this.card2D, 1, 500);
    
    this.gazeProgress = 0;
  }
  
  /**
   * 更新循环
   */
  update(delta, elapsed) {
    if (!this.isActive) return;
    
    // 3D 模式下自转
    if (this.is3DMode && !this.pauseRotation) {
      const rotationSpeed = this.data.rotationSpeed || 0.5;
      this.model3D.rotation.y += delta * rotationSpeed;
      
      // 更新标注位置（跟随旋转）
      this.updateCalloutPositions();
    }
    
    // 凝视进度
    if (this.gazeIndicator.visible) {
      this.gazeProgress += delta * 1000;
      const progress = Math.min(this.gazeProgress / this.gazeRequired, 1);
      this.updateGazeProgress(progress);
      
      if (progress >= 1) {
        this.onGazeComplete();
      }
    }
  }
  
  /**
   * 更新标注位置
   */
  updateCalloutPositions() {
    const rotation = this.model3D.rotation.y;
    const radius = 1.5;
    
    this.callouts.forEach((callout, index) => {
      const baseAngle = (callout.angle || (index * 90)) * Math.PI / 180;
      const angle = baseAngle + rotation;
      
      // 只显示面向相机的标注
      const facingCamera = Math.cos(angle) > -0.3;
      callout.label.visible = facingCamera;
      callout.line.visible = facingCamera;
      callout.dot.visible = facingCamera;
      
      if (facingCamera) {
        // 更新位置
        const x = Math.cos(angle) * 0.5;
        const z = Math.sin(angle) * 0.5;
        callout.dot.position.set(x, 1.5, z);
        
        callout.label.position.set(
          Math.cos(angle) * radius,
          1.5 + (index % 2) * 0.3,
          Math.sin(angle) * radius
        );
      }
    });
  }
}

export default RotateModule;
