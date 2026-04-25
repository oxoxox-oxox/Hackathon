import * as THREE from 'three';
import { BaseModule } from './BaseModule.js';
import { ScenarioContainerTypes } from '@shared/types.js';

/**
 * Scenarios 模块
 * 多模态语境容器切换
 */
export class ScenariosModule extends BaseModule {
  constructor(engine, config) {
    super(engine, config);
    
    this.data = config.data;
    this.currentContainerIndex = 0;
    this.containers = [];
    this.containerMeshes = {};
    this.words = [];
  }
  
  async init() {
    // 创建容器切换按钮
    this.createContainerButtons();
    
    // 创建各类型容器
    this.createContainers();
    
    // 创建场景词汇
    this.createSceneWords();
    
    // 初始化为第一个容器
    this.switchContainer(0);
    
    this.object3D.visible = false;
  }
  
  /**
   * 创建容器切换按钮
   */
  createContainerButtons() {
    const buttonGroup = new THREE.Group();
    buttonGroup.position.set(-2.5, 1.5, 0);
    
    const containers = this.data.containers || [];
    
    containers.forEach((container, index) => {
      const buttonGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.1);
      const buttonMaterial = new THREE.MeshStandardMaterial({
        color: index === 0 ? 0x4fc3f7 : 0x444444,
        roughness: 0.5
      });
      const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
      button.position.set(0, -index * 0.6, 0);
      button.userData.containerIndex = index;
      buttonGroup.add(button);
      
      // 添加图标
      const icon = this.getContainerIcon(container.type);
      icon.position.set(0, -index * 0.6, 0.06);
      buttonGroup.add(icon);
      
      // 注册交互
      this.engine.interactionSystem.register(button, {
        onClick: () => this.switchContainer(index),
        onHoverStart: () => this.onButtonHover(button, true),
        onHoverEnd: () => this.onButtonHover(button, false)
      });
      
      this.containers.push({ button, material: buttonMaterial, config: container });
    });
    
    this.object3D.add(buttonGroup);
    this.buttonGroup = buttonGroup;
  }
  
  /**
   * 获取容器图标
   */
  getContainerIcon(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let symbol = '';
    switch (type) {
      case ScenarioContainerTypes.CINEMAGRAPH_25D:
        symbol = '2.5D';
        ctx.font = '20px Arial';
        break;
      case ScenarioContainerTypes.DIORAMA_3D:
        symbol = '3D';
        ctx.font = '24px Arial';
        break;
      case ScenarioContainerTypes.VERTICAL_HOLO:
        symbol = 'H';
        break;
      case ScenarioContainerTypes.IMMERSIVE_CINEMA:
        symbol = 'C';
        break;
      default:
        symbol = '?';
    }
    
    ctx.fillText(symbol, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.3, 0.3, 1);
    
    return sprite;
  }
  
  /**
   * 创建各类型容器
   */
  createContainers() {
    const containers = this.data.containers || [];
    
    containers.forEach((container, index) => {
      const mesh = this.createContainerMesh(container.type);
      mesh.visible = index === 0;
      this.object3D.add(mesh);
      this.containerMeshes[container.type] = mesh;
    });
  }
  
  /**
   * 创建容器网格
   */
  createContainerMesh(type) {
    const group = new THREE.Group();
    
    switch (type) {
      case ScenarioContainerTypes.CINEMAGRAPH_25D:
        // 2.5D 动态场景 - 多层平面
        for (let i = 0; i < 3; i++) {
          const planeGeometry = new THREE.PlaneGeometry(3 - i * 0.5, 2 - i * 0.3);
          const planeMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.6, 0.5, 0.3 + i * 0.1),
            transparent: true,
            opacity: 0.9 - i * 0.1
          });
          const plane = new THREE.Mesh(planeGeometry, planeMaterial);
          plane.position.set(0, 1.5, -i * 0.5);
          group.add(plane);
        }
        break;
        
      case ScenarioContainerTypes.DIORAMA_3D:
        // 3D 立体场景 - 房间盒子
        const roomGeometry = new THREE.BoxGeometry(4, 3, 4);
        const roomMaterial = new THREE.MeshStandardMaterial({
          color: 0x2d3436,
          side: THREE.BackSide
        });
        const room = new THREE.Mesh(roomGeometry, roomMaterial);
        room.position.set(0, 1.5, 0);
        group.add(room);
        
        // 添加简单家具
        const furnitureGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.8);
        const furnitureMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const furniture = new THREE.Mesh(furnitureGeometry, furnitureMaterial);
        furniture.position.set(0, 0.2, 0);
        group.add(furniture);
        break;
        
      case ScenarioContainerTypes.VERTICAL_HOLO:
        // 全息投影模式 - 发光柱体
        const holoGeometry = new THREE.CylinderGeometry(1, 1, 2.5, 32, 1, true);
        const holoMaterial = new THREE.MeshBasicMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide
        });
        const holo = new THREE.Mesh(holoGeometry, holoMaterial);
        holo.position.set(0, 1.25, 0);
        group.add(holo);
        
        // 内部光源
        const pointLight = new THREE.PointLight(0x4fc3f7, 1, 5);
        pointLight.position.set(0, 1.5, 0);
        group.add(pointLight);
        break;
        
      case ScenarioContainerTypes.IMMERSIVE_CINEMA:
        // 沉浸式影院 - 曲面屏幕
        const screenGeometry = new THREE.CylinderGeometry(5, 5, 3, 32, 1, true, Math.PI * 0.75, Math.PI * 0.5);
        const screenMaterial = new THREE.MeshStandardMaterial({
          color: 0x111111,
          side: THREE.BackSide
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(0, 1.5, -2);
        group.add(screen);
        
        // 座椅
        const seatGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.6);
        const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(0, 0.25, 1);
        group.add(seat);
        break;
    }
    
    return group;
  }
  
  /**
   * 创建场景词汇
   */
  createSceneWords() {
    const words = this.data.sceneWords || [];
    const positions = [
      { x: -1, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: -0.5, y: 2, z: 0 },
      { x: 0.5, y: 2, z: 0 }
    ];
    
    words.forEach((word, index) => {
      if (index >= positions.length) return;
      
      const label = this.createTextSprite(word, {
        fontSize: 28,
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.6)'
      });
      label.position.set(positions[index].x, positions[index].y, positions[index].z);
      label.visible = false;
      this.object3D.add(label);
      this.words.push(label);
    });
  }
  
  /**
   * 切换容器
   */
  switchContainer(index) {
    this.resetAutoAdvance();
    
    const containers = this.data.containers || [];
    if (index < 0 || index >= containers.length) return;
    
    const oldIndex = this.currentContainerIndex;
    this.currentContainerIndex = index;
    
    // 更新按钮状态
    this.containers.forEach((container, i) => {
      container.material.color.setHex(i === index ? 0x4fc3f7 : 0x444444);
    });
    
    // 切换容器可见性
    containers.forEach((container, i) => {
      const mesh = this.containerMeshes[container.type];
      if (mesh) {
        mesh.visible = i === index;
      }
    });
    
    // 更新氛围
    const config = containers[index];
    this.updateAmbience(config.ambience);
    
    // 更新 HUD
    this.updateHUD(config.hudText);
    
    // 显示/隐藏词汇
    this.words.forEach((label, i) => {
      label.visible = true;
      // 动画入场
      label.scale.set(0.01, 0.01, 0.01);
      setTimeout(() => {
        this.animateScale(label, 1, 300);
      }, i * 100);
    });
    
    this.state = config.type;
  }
  
  /**
   * 更新氛围设置
   */
  updateAmbience(ambience) {
    if (!ambience) return;
    
    // 调整场景亮度
    if (ambience.brightness !== undefined) {
      // 调整环境光
      const ambientLight = this.engine.scene.children.find(
        child => child instanceof THREE.AmbientLight
      );
      if (ambientLight) {
        ambientLight.intensity = ambience.brightness;
      }
    }
    
    // 调整雾效
    if (ambience.fog !== undefined) {
      if (ambience.fog) {
        this.engine.scene.fog = new THREE.Fog(0x000000, 3, 15);
      } else {
        this.engine.scene.fog = new THREE.Fog(0x1a1a2e, 5, 30);
      }
    }
  }
  
  /**
   * 更新 HUD
   */
  updateHUD(text) {
    if (this.engine.hud) {
      this.engine.hud.updateModuleInfo('语境容器', text || '');
    }
  }
  
  /**
   * 按钮悬停
   */
  onButtonHover(button, isHovering) {
    if (isHovering) {
      this.animateScale(button, 1.2, 150);
    } else {
      this.animateScale(button, 1, 150);
    }
  }
  
  /**
   * 键盘触发
   */
  onKeyboardTrigger(keyCode) {
    if (keyCode === 'Space' || keyCode === 'Enter') {
      const nextIndex = (this.currentContainerIndex + 1) % this.containers.length;
      this.switchContainer(nextIndex);
    }
  }
  
  /**
   * 激活时
   */
  onActivate() {
    // 重置到第一个容器
    this.switchContainer(0);
    
    // 入场动画
    this.buttonGroup.scale.set(0.01, 0.01, 0.01);
    this.animateScale(this.buttonGroup, 1, 500);
  }
  
  /**
   * 停用时
   */
  onDeactivate() {
    // 恢复场景氛围
    this.updateAmbience({ brightness: 0.5, fog: false });
    
    // 隐藏词汇
    this.words.forEach(label => {
      label.visible = false;
    });
  }
  
  /**
   * 更新循环
   */
  update(delta, elapsed) {
    if (!this.isActive) return;
    
    // 全息模式特效
    const config = this.containers[this.currentContainerIndex]?.config;
    if (config?.type === ScenarioContainerTypes.VERTICAL_HOLO) {
      const mesh = this.containerMeshes[config.type];
      if (mesh) {
        // 旋转效果
        mesh.rotation.y += delta * 0.5;
        
        // 脉动效果
        const scale = 1 + Math.sin(elapsed * 3) * 0.05;
        mesh.scale.set(scale, 1, scale);
      }
    }
    
    // 影院模式 - 微微晃动
    if (config?.type === ScenarioContainerTypes.IMMERSIVE_CINEMA) {
      const mesh = this.containerMeshes[config.type];
      if (mesh) {
        mesh.position.y = 0 + Math.sin(elapsed * 0.5) * 0.02;
      }
    }
  }
}

export default ScenariosModule;
