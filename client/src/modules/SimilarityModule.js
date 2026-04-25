import * as THREE from 'three';
import { BaseModule } from './BaseModule.js';

/**
 * Similarity 模块
 * 空间节点拓展，构建发散词网
 */
export class SimilarityModule extends BaseModule {
  constructor(engine, config) {
    super(engine, config);
    
    this.data = config.data;
    this.isExpanded = false;
    this.coreModel = null;
    this.expandButton = null;
    this.relatedNodes = [];
    this.connectionLines = [];
  }
  
  async init() {
    // 创建核心词模型
    const { coreModel, coreWord } = this.data;
    this.coreModel = this.createBasicModel(
      coreModel.type || 'sphere',
      coreModel.color || '#FFD700'
    );
    this.coreModel.position.set(0, 1.5, 0);
    this.coreModel.scale.set(1.2, 1.2, 1.2);
    this.object3D.add(this.coreModel);
    
    // 创建核心词标签
    this.coreLabel = this.createTextSprite(coreWord, {
      fontSize: 42,
      color: '#FFD700'
    });
    this.coreLabel.position.set(0, 2.5, 0);
    this.object3D.add(this.coreLabel);
    
    // 创建展开按钮
    this.createExpandButton();
    
    // 预创建相关词节点（初始隐藏）
    this.createRelatedNodes();
    
    // 注册交互
    this.engine.interactionSystem.register(this.coreModel, {
      onClick: () => this.toggleExpand(),
      onHoverStart: () => this.onCoreHover(true),
      onHoverEnd: () => this.onCoreHover(false)
    });
    
    this.object3D.visible = false;
  }
  
  /**
   * 创建展开按钮
   */
  createExpandButton() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      side: THREE.DoubleSide
    });
    
    this.expandButton = new THREE.Mesh(geometry, material);
    this.expandButton.position.set(0.8, 1.5, 0);
    this.expandButton.rotation.y = Math.PI / 2;
    this.object3D.add(this.expandButton);
    
    // 添加加号
    const plusGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -0.1, 0, 0, 0.1, 0, 0,  // 横线
      0, -0.1, 0, 0, 0.1, 0   // 竖线
    ]);
    plusGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const plusMaterial = new THREE.LineBasicMaterial({ color: 0x4fc3f7 });
    const plus = new THREE.LineSegments(plusGeometry, plusMaterial);
    plus.position.copy(this.expandButton.position);
    this.object3D.add(plus);
    this.expandButtonPlus = plus;
    
    // 注册交互
    this.engine.interactionSystem.register(this.expandButton, {
      onClick: () => this.toggleExpand(),
      onHoverStart: () => this.onButtonHover(true),
      onHoverEnd: () => this.onButtonHover(false)
    });
  }
  
  /**
   * 创建相关词节点
   */
  createRelatedNodes() {
    const { relatedWords, connectionStyle } = this.data;
    
    relatedWords.forEach((item, index) => {
      // 计算位置
      const angle = (item.angle || (index * 60)) * Math.PI / 180;
      const distance = item.distance || 2;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // 创建节点
      const nodeGeometry = new THREE.SphereGeometry(0.25, 32, 32);
      const nodeMaterial = new THREE.MeshStandardMaterial({
        color: 0x4fc3f7,
        roughness: 0.4,
        metalness: 0.3
      });
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.set(x, 1.5, z);
      node.scale.set(0.01, 0.01, 0.01);
      node.visible = false;
      this.object3D.add(node);
      
      // 创建标签
      const label = this.createTextSprite(item.word, {
        fontSize: 28,
        color: '#ffffff'
      });
      label.position.set(x, 2.1, z);
      label.visible = false;
      this.object3D.add(label);
      
      // 创建连接线
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 1.5, 0),
        new THREE.Vector3(x, 1.5, z)
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: connectionStyle?.color || 0xffffff,
        transparent: true,
        opacity: 0
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.visible = false;
      this.object3D.add(line);
      
      this.relatedNodes.push({ node, label, line, data: item });
      
      // 注册交互
      this.engine.interactionSystem.register(node, {
        onClick: () => this.onNodeClick(item),
        onHoverStart: () => this.onNodeHover(node, label, true),
        onHoverEnd: () => this.onNodeHover(node, label, false)
      });
    });
  }
  
  /**
   * 切换展开/收起
   */
  toggleExpand() {
    this.resetAutoAdvance();
    
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }
  
  /**
   * 展开
   */
  expand() {
    this.isExpanded = true;
    this.state = 'expanded';
    
    // 隐藏展开按钮
    this.expandButton.visible = false;
    this.expandButtonPlus.visible = false;
    
    // 依次展开节点
    this.relatedNodes.forEach((item, index) => {
      setTimeout(() => {
        item.node.visible = true;
        item.label.visible = true;
        item.line.visible = true;
        
        // 动画
        this.animateScale(item.node, 1, 400);
        
        // 连接线淡入
        const startOpacity = 0;
        const endOpacity = this.data.connectionStyle?.opacity || 0.6;
        this.animateLineOpacity(item.line, startOpacity, endOpacity, 400);
        
      }, index * 100);
    });
  }
  
  /**
   * 收起
   */
  collapse() {
    this.isExpanded = false;
    this.state = 'initial';
    
    // 收起节点
    this.relatedNodes.forEach((item, index) => {
      this.animateScale(item.node, 0.01, 300);
      this.animateLineOpacity(item.line, item.line.material.opacity, 0, 300);
      
      setTimeout(() => {
        item.node.visible = false;
        item.label.visible = false;
        item.line.visible = false;
      }, 300);
    });
    
    // 显示展开按钮
    setTimeout(() => {
      this.expandButton.visible = true;
      this.expandButtonPlus.visible = true;
    }, 400);
  }
  
  /**
   * 动画连接线透明度
   */
  animateLineOpacity(line, start, end, duration) {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      line.material.opacity = start + (end - start) * progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * 核心模型悬停
   */
  onCoreHover(isHovering) {
    if (isHovering) {
      this.animateScale(this.coreModel, 1.3, 150);
    } else {
      this.animateScale(this.coreModel, 1.2, 150);
    }
  }
  
  /**
   * 按钮悬停
   */
  onButtonHover(isHovering) {
    this.expandButton.material.color.setHex(isHovering ? 0x00ff00 : 0x4fc3f7);
  }
  
  /**
   * 节点悬停
   */
  onNodeHover(node, label, isHovering) {
    if (isHovering) {
      this.animateScale(node, 1.3, 150);
      label.scale.multiplyScalar(1.2);
    } else {
      this.animateScale(node, 1, 150);
      label.scale.multiplyScalar(1 / 1.2);
    }
  }
  
  /**
   * 节点点击
   */
  onNodeClick(data) {
    // 可以显示更多信息或跳转
    console.log('Clicked related word:', data.word);
  }
  
  /**
   * 键盘触发
   */
  onKeyboardTrigger(keyCode) {
    if (keyCode === 'Space' || keyCode === 'Enter') {
      this.toggleExpand();
    }
  }
  
  /**
   * 激活时
   */
  onActivate() {
    // 重置状态
    if (this.isExpanded) {
      this.relatedNodes.forEach(item => {
        item.node.visible = false;
        item.label.visible = false;
        item.line.visible = false;
        item.node.scale.set(0.01, 0.01, 0.01);
      });
      this.isExpanded = false;
    }
    
    this.expandButton.visible = true;
    this.expandButtonPlus.visible = true;
    
    // 入场动画
    this.coreModel.scale.set(0.01, 0.01, 0.01);
    this.animateScale(this.coreModel, 1.2, 500);
  }
  
  /**
   * 更新循环
   */
  update(delta, elapsed) {
    if (!this.isActive) return;
    
    // 核心模型旋转
    this.coreModel.rotation.y += delta * 0.5;
    
    // 展开按钮脉动
    if (!this.isExpanded) {
      const pulse = 1 + Math.sin(elapsed * 4) * 0.1;
      this.expandButton.scale.set(pulse, pulse, pulse);
    }
    
    // 节点浮动
    if (this.isExpanded) {
      this.relatedNodes.forEach((item, index) => {
        item.node.position.y = 1.5 + Math.sin(elapsed * 2 + index) * 0.05;
      });
    }
  }
}

export default SimilarityModule;
