import * as THREE from 'three';
import { XRSystem } from '../systems/XRSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';

/**
 * 核心渲染引擎
 * 负责 Three.js 场景初始化和渲染循环
 */
export class Engine {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.modules = [];
    this.currentModuleIndex = 0;
    
    this.init();
  }
  
  init() {
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    // 创建相机
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 3);
    
    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    
    this.container.appendChild(this.renderer.domElement);
    
    // 添加灯光
    this.setupLights();
    
    // 添加环境
    this.setupEnvironment();
    
    // 初始化系统
    this.xrSystem = new XRSystem(this);
    this.interactionSystem = new InteractionSystem(this);
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => this.onResize());
    
    // 开始渲染循环
    this.renderer.setAnimationLoop((time, frame) => this.update(time, frame));
    this.isRunning = true;
  }
  
  setupLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // 主方向光
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    this.scene.add(mainLight);
    
    // 补光
    const fillLight = new THREE.DirectionalLight(0x4fc3f7, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);
    
    // 点光源（用于强调）
    this.accentLight = new THREE.PointLight(0x667eea, 1, 10);
    this.accentLight.position.set(0, 2, 0);
    this.scene.add(this.accentLight);
  }
  
  setupEnvironment() {
    // 地面网格
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
    
    // 雾效
    this.scene.fog = new THREE.Fog(0x1a1a2e, 5, 30);
  }
  
  /**
   * 加载模块到场景
   */
  loadModule(moduleInstance) {
    this.modules.push(moduleInstance);
    if (moduleInstance.object3D) {
      this.scene.add(moduleInstance.object3D);
    }
  }
  
  /**
   * 切换到指定模块
   */
  switchToModule(index) {
    if (index < 0 || index >= this.modules.length) return;
    
    // 隐藏当前模块
    if (this.modules[this.currentModuleIndex]) {
      this.modules[this.currentModuleIndex].deactivate();
    }
    
    // 激活新模块
    this.currentModuleIndex = index;
    if (this.modules[index]) {
      this.modules[index].activate();
    }
    
    // 触发模块切换事件
    this.onModuleChange?.(index, this.modules[index]);
  }
  
  /**
   * 切换到下一个模块
   */
  nextModule() {
    const nextIndex = (this.currentModuleIndex + 1) % this.modules.length;
    this.switchToModule(nextIndex);
  }
  
  /**
   * 获取当前活动模块
   */
  getCurrentModule() {
    return this.modules[this.currentModuleIndex];
  }
  
  /**
   * 更新循环
   */
  update(time, frame) {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    
    // 更新系统
    this.interactionSystem.update(delta);
    this.xrSystem.update(frame);
    
    // 更新当前模块
    const currentModule = this.getCurrentModule();
    if (currentModule?.update) {
      currentModule.update(delta, elapsed);
    }
    
    // 更新强调光动画
    this.accentLight.intensity = 0.5 + Math.sin(elapsed * 2) * 0.3;
    
    // 渲染
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * 窗口大小调整
   */
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  /**
   * 清理资源
   */
  dispose() {
    this.isRunning = false;
    this.renderer.setAnimationLoop(null);
    
    // 清理模块
    this.modules.forEach(module => {
      if (module.dispose) module.dispose();
    });
    
    // 清理系统
    this.xrSystem.dispose();
    this.interactionSystem.dispose();
    
    // 清理渲染器
    this.renderer.dispose();
  }
}

export default Engine;
