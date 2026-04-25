import * as THREE from 'three';

/**
 * WebXR 系统
 * 负责 VR/AR 设备检测和会话管理
 */
export class XRSystem {
  constructor(engine) {
    this.engine = engine;
    this.session = null;
    this.controllers = [];
    this.isVRSupported = false;
    this.isInVR = false;
    
    this.init();
  }
  
  async init() {
    // 检测 WebXR 支持
    if ('xr' in navigator) {
      try {
        this.isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
      } catch (e) {
        console.warn('WebXR 检测失败:', e);
        this.isVRSupported = false;
      }
    }
    
    // 设置 VR 按钮
    this.setupVRButton();
    
    // 如果支持 VR，设置控制器
    if (this.isVRSupported) {
      this.setupControllers();
    }
  }
  
  setupVRButton() {
    const button = document.getElementById('vr-button');
    if (!button) return;
    
    if (this.isVRSupported) {
      button.textContent = '进入 VR 模式';
      button.disabled = false;
      button.addEventListener('click', () => this.toggleVR());
    } else {
      button.textContent = 'VR 不可用 - 使用桌面模式';
      button.disabled = true;
      // 3秒后隐藏按钮
      setTimeout(() => {
        button.style.display = 'none';
      }, 3000);
    }
  }
  
  setupControllers() {
    const renderer = this.engine.renderer;
    
    // 设置控制器
    for (let i = 0; i < 2; i++) {
      const controller = renderer.xr.getController(i);
      controller.addEventListener('selectstart', (e) => this.onSelectStart(e, i));
      controller.addEventListener('selectend', (e) => this.onSelectEnd(e, i));
      controller.addEventListener('squeezestart', (e) => this.onSqueezeStart(e, i));
      controller.addEventListener('squeezeend', (e) => this.onSqueezeEnd(e, i));
      this.engine.scene.add(controller);
      
      // 控制器射线
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -5)
      ]);
      const material = new THREE.LineBasicMaterial({ 
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.6
      });
      const line = new THREE.Line(geometry, material);
      controller.add(line);
      
      // 控制器握柄模型
      const grip = renderer.xr.getControllerGrip(i);
      this.addControllerModel(grip);
      this.engine.scene.add(grip);
      
      this.controllers.push({ controller, grip, line });
    }
  }
  
  addControllerModel(grip) {
    // 简单的控制器几何体
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.7,
      metalness: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    grip.add(mesh);
  }
  
  async toggleVR() {
    if (this.isInVR) {
      await this.exitVR();
    } else {
      await this.enterVR();
    }
  }
  
  async enterVR() {
    if (!this.isVRSupported) return;
    
    try {
      const sessionInit = {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      };
      
      this.session = await navigator.xr.requestSession('immersive-vr', sessionInit);
      
      this.session.addEventListener('end', () => this.onSessionEnd());
      
      await this.engine.renderer.xr.setSession(this.session);
      this.isInVR = true;
      
      const button = document.getElementById('vr-button');
      if (button) button.textContent = '退出 VR 模式';
      
      // 触发进入 VR 事件
      this.onEnterVR?.();
      
    } catch (e) {
      console.error('进入 VR 失败:', e);
    }
  }
  
  async exitVR() {
    if (this.session) {
      await this.session.end();
    }
  }
  
  onSessionEnd() {
    this.session = null;
    this.isInVR = false;
    
    const button = document.getElementById('vr-button');
    if (button) button.textContent = '进入 VR 模式';
    
    // 触发退出 VR 事件
    this.onExitVR?.();
  }
  
  // 控制器事件处理
  onSelectStart(event, controllerIndex) {
    const controller = this.controllers[controllerIndex]?.controller;
    if (!controller) return;
    
    // 通知交互系统
    this.engine.interactionSystem.onVRSelect(controller, 'start');
  }
  
  onSelectEnd(event, controllerIndex) {
    const controller = this.controllers[controllerIndex]?.controller;
    if (!controller) return;
    
    this.engine.interactionSystem.onVRSelect(controller, 'end');
  }
  
  onSqueezeStart(event, controllerIndex) {
    // 握持开始
  }
  
  onSqueezeEnd(event, controllerIndex) {
    // 握持结束
  }
  
  /**
   * 更新 VR 控制器
   */
  update(frame) {
    if (!this.isInVR || !frame) return;
    
    // 更新控制器射线颜色基于交互状态
    this.controllers.forEach(({ controller, line }) => {
      const intersects = this.engine.interactionSystem.getVRIntersects(controller);
      if (intersects.length > 0) {
        line.material.color.setHex(0x00ff00);
        line.material.opacity = 1;
      } else {
        line.material.color.setHex(0x4fc3f7);
        line.material.opacity = 0.6;
      }
    });
  }
  
  dispose() {
    if (this.session) {
      this.session.end();
    }
  }
}

export default XRSystem;
