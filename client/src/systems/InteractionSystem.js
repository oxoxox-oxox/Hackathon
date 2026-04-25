import * as THREE from 'three';

/**
 * 交互系统
 * 负责射线检测、悬停、点击等交互逻辑
 */
export class InteractionSystem {
  constructor(engine) {
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.interactables = new Set();
    this.hoveredObject = null;
    this.selectedObject = null;
    
    // 凝视交互
    this.gazeTarget = null;
    this.gazeStartTime = 0;
    this.gazeThreshold = 2000; // 2秒
    
    // 闲置检测
    this.lastInteractionTime = Date.now();
    this.idleThreshold = 30000; // 30秒
    this.idleCallback = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    const canvas = this.engine.renderer.domElement;
    
    // 鼠标移动
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    
    // 点击
    canvas.addEventListener('click', (e) => this.onClick(e));
    
    // 触摸支持
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
    
    // 键盘
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }
  
  /**
   * 注册可交互对象
   */
  register(object3D, callbacks = {}) {
    object3D.userData.interactable = true;
    object3D.userData.callbacks = callbacks;
    this.interactables.add(object3D);
  }
  
  /**
   * 取消注册
   */
  unregister(object3D) {
    object3D.userData.interactable = false;
    this.interactables.delete(object3D);
  }
  
  /**
   * 更新鼠标位置
   */
  updateMousePosition(clientX, clientY) {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }
  
  /**
   * 执行射线检测
   */
  performRaycast() {
    this.raycaster.setFromCamera(this.mouse, this.engine.camera);
    
    const objects = Array.from(this.interactables);
    const intersects = this.raycaster.intersectObjects(objects, true);
    
    return intersects;
  }
  
  /**
   * VR 控制器射线检测
   */
  getVRIntersects(controller) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    const objects = Array.from(this.interactables);
    return this.raycaster.intersectObjects(objects, true);
  }
  
  /**
   * 鼠标移动处理
   */
  onMouseMove(event) {
    this.updateMousePosition(event.clientX, event.clientY);
    this.recordInteraction();
    
    const intersects = this.performRaycast();
    
    if (intersects.length > 0) {
      const object = this.findInteractableParent(intersects[0].object);
      
      if (object !== this.hoveredObject) {
        // 离开旧对象
        if (this.hoveredObject) {
          this.triggerCallback(this.hoveredObject, 'onHoverEnd');
        }
        
        // 进入新对象
        this.hoveredObject = object;
        if (object) {
          this.triggerCallback(object, 'onHoverStart');
          document.body.style.cursor = 'pointer';
        }
      }
      
      // 更新凝视目标
      this.updateGaze(object);
      
    } else {
      // 离开所有对象
      if (this.hoveredObject) {
        this.triggerCallback(this.hoveredObject, 'onHoverEnd');
        this.hoveredObject = null;
        document.body.style.cursor = 'default';
      }
      
      this.updateGaze(null);
    }
  }
  
  /**
   * 点击处理
   */
  onClick(event) {
    this.recordInteraction();
    
    const intersects = this.performRaycast();
    
    if (intersects.length > 0) {
      const object = this.findInteractableParent(intersects[0].object);
      
      if (object) {
        this.triggerCallback(object, 'onClick', {
          point: intersects[0].point,
          face: intersects[0].face
        });
      }
    }
  }
  
  /**
   * 触摸开始
   */
  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.updateMousePosition(event.touches[0].clientX, event.touches[0].clientY);
    }
  }
  
  /**
   * 触摸结束
   */
  onTouchEnd(event) {
    this.recordInteraction();
    this.onClick(event);
  }
  
  /**
   * 键盘按下
   */
  onKeyDown(event) {
    this.recordInteraction();
    
    // Space 或 Enter 触发主交互
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      
      const currentModule = this.engine.getCurrentModule();
      if (currentModule?.onKeyboardTrigger) {
        currentModule.onKeyboardTrigger(event.code);
      }
    }
    
    // 方向键切换模块
    if (event.code === 'ArrowRight') {
      this.engine.nextModule();
    }
    if (event.code === 'ArrowLeft') {
      const prevIndex = (this.engine.currentModuleIndex - 1 + this.engine.modules.length) % this.engine.modules.length;
      this.engine.switchToModule(prevIndex);
    }
  }
  
  /**
   * 键盘抬起
   */
  onKeyUp(event) {
    // 可扩展
  }
  
  /**
   * VR 控制器选择事件
   */
  onVRSelect(controller, phase) {
    this.recordInteraction();
    
    if (phase === 'start') {
      const intersects = this.getVRIntersects(controller);
      
      if (intersects.length > 0) {
        const object = this.findInteractableParent(intersects[0].object);
        
        if (object) {
          this.selectedObject = object;
          this.triggerCallback(object, 'onSelectStart', {
            point: intersects[0].point,
            controller
          });
        }
      }
    } else if (phase === 'end') {
      if (this.selectedObject) {
        this.triggerCallback(this.selectedObject, 'onSelectEnd');
        this.triggerCallback(this.selectedObject, 'onClick');
        this.selectedObject = null;
      }
    }
  }
  
  /**
   * 更新凝视交互
   */
  updateGaze(target) {
    if (target !== this.gazeTarget) {
      this.gazeTarget = target;
      this.gazeStartTime = target ? Date.now() : 0;
    }
  }
  
  /**
   * 查找可交互的父对象
   */
  findInteractableParent(object) {
    let current = object;
    while (current) {
      if (current.userData.interactable) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }
  
  /**
   * 触发回调
   */
  triggerCallback(object, callbackName, data = {}) {
    const callback = object.userData.callbacks?.[callbackName];
    if (callback) {
      callback(object, data);
    }
  }
  
  /**
   * 记录交互时间
   */
  recordInteraction() {
    this.lastInteractionTime = Date.now();
  }
  
  /**
   * 设置闲置回调
   */
  setIdleCallback(callback, threshold = 30000) {
    this.idleCallback = callback;
    this.idleThreshold = threshold;
  }
  
  /**
   * 更新
   */
  update(delta) {
    // 检查凝视交互
    if (this.gazeTarget && this.gazeStartTime) {
      const gazeDuration = Date.now() - this.gazeStartTime;
      
      if (gazeDuration >= this.gazeThreshold) {
        this.triggerCallback(this.gazeTarget, 'onGaze', { duration: gazeDuration });
        this.gazeStartTime = Date.now(); // 重置以防止连续触发
      }
    }
    
    // 检查闲置
    if (this.idleCallback) {
      const idleTime = Date.now() - this.lastInteractionTime;
      if (idleTime >= this.idleThreshold) {
        this.idleCallback();
        this.lastInteractionTime = Date.now(); // 重置
      }
    }
  }
  
  dispose() {
    this.interactables.clear();
  }
}

export default InteractionSystem;
