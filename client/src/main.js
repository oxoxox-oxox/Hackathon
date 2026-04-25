import { Engine } from './core/Engine.js';
import { HUD } from './ui/HUD.js';
import { ModuleFactory } from './modules/ModuleFactory.js';
import { learningApi } from './api/client.js';

/**
 * VR 英语词汇学习平台 - 主入口
 */
class App {
  constructor() {
    this.engine = null;
    this.hud = null;
    this.session = null;
    this.moduleFactory = null;
  }
  
  async init() {
    try {
      // 初始化 HUD
      this.hud = new HUD();
      this.hud.showLoading('正在初始化...');
      
      // 初始化渲染引擎
      const container = document.getElementById('canvas-container');
      this.engine = new Engine(container);
      this.engine.hud = this.hud;
      
      // 设置事件记录函数
      this.engine.recordEvent = (data) => this.recordEvent(data);
      
      // 初始化模块工厂
      this.moduleFactory = new ModuleFactory(this.engine);
      
      // 加载学习会话
      this.hud.showLoading('正在加载学习会话...');
      await this.loadSession();
      
      // 设置模块切换回调
      this.engine.onModuleChange = (index, module) => this.onModuleChange(index, module);
      
      // 设置闲置回调
      this.engine.interactionSystem.setIdleCallback(() => {
        this.engine.nextModule();
      }, 30000);
      
      // 隐藏加载界面
      this.hud.hideLoading();
      
      // 激活第一个模块
      if (this.engine.modules.length > 0) {
        this.engine.switchToModule(0);
      }
      
      console.log('VR 英语词汇学习平台已启动');
      console.log(`已加载 ${this.engine.modules.length} 个学习模块`);
      
    } catch (error) {
      console.error('初始化失败:', error);
      this.hud?.showNotification('初始化失败: ' + error.message, 'error', 5000);
    }
  }
  
  /**
   * 加载学习会话
   */
  async loadSession() {
    try {
      // 从后端获取会话配置
      this.session = await learningApi.getSession();
      this.engine.sessionId = this.session.sessionId;
      
      console.log('加载会话:', this.session.title);
      
      // 更新 HUD
      this.hud.updateModuleInfo(this.session.title, '准备开始学习...');
      this.hud.initModuleIndicator(this.session.modules.length);
      
      // 创建所有模块
      const modules = await this.moduleFactory.createAll(this.session.modules);
      
      // 加载模块到引擎
      modules.forEach(module => {
        this.engine.loadModule(module);
      });
      
    } catch (error) {
      console.error('加载会话失败:', error);
      
      // 使用本地默认会话
      console.log('使用本地默认会话...');
      this.session = this.getDefaultSession();
      this.engine.sessionId = this.session.sessionId;
      
      this.hud.updateModuleInfo(this.session.title, '准备开始学习...');
      this.hud.initModuleIndicator(this.session.modules.length);
      
      const modules = await this.moduleFactory.createAll(this.session.modules);
      modules.forEach(module => {
        this.engine.loadModule(module);
      });
    }
  }
  
  /**
   * 获取默认会话（离线模式）
   */
  getDefaultSession() {
    return {
      sessionId: 'local-session',
      title: 'VR 词汇学习',
      modules: [
        {
          id: 'click-local',
          type: 'click',
          autoAdvanceSeconds: 30,
          interaction: { trigger: ['click', 'keyboard'] },
          data: {
            initialWord: 'open',
            initialModel: { type: 'box', color: '#4CAF50' },
            transformedWord: 'close',
            transformedModel: { type: 'sphere', color: '#F44336' },
            hudText: {
              initial: 'Open - 打开',
              transformed: 'Close - 关闭'
            }
          }
        },
        {
          id: 'similarity-local',
          type: 'similarity',
          autoAdvanceSeconds: 45,
          interaction: { trigger: ['click'] },
          data: {
            coreWord: 'happy',
            coreModel: { type: 'sphere', color: '#FFD700' },
            relatedWords: [
              { word: 'joyful', distance: 2, angle: 0 },
              { word: 'cheerful', distance: 2.5, angle: 72 },
              { word: 'delighted', distance: 2, angle: 144 },
              { word: 'pleased', distance: 2.5, angle: 216 },
              { word: 'glad', distance: 2, angle: 288 }
            ],
            connectionStyle: { color: '#FFFFFF', opacity: 0.6 }
          }
        },
        {
          id: 'rotate-local',
          type: 'rotate',
          autoAdvanceSeconds: 40,
          interaction: { trigger: ['gaze'], gazeThreshold: 2000 },
          data: {
            word: 'house',
            card2D: { width: 2, height: 1.5 },
            model3D: { fallbackType: 'box', color: '#8B4513' },
            callouts: [
              { label: 'roof - 屋顶', angle: 0 },
              { label: 'door - 门', angle: 90 },
              { label: 'window - 窗户', angle: 180 },
              { label: 'wall - 墙壁', angle: 270 }
            ],
            rotationSpeed: 0.5
          }
        },
        {
          id: 'scenarios-local',
          type: 'scenarios',
          autoAdvanceSeconds: 60,
          interaction: { trigger: ['click'] },
          data: {
            initialContainer: 'diorama_3d',
            containers: [
              { type: 'cinemagraph_25d', hudText: '2.5D 动态场景', ambience: { brightness: 1, fog: false } },
              { type: 'diorama_3d', hudText: '3D 立体场景', ambience: { brightness: 0.9, fog: false } },
              { type: 'vertical_holo', hudText: '全息投影模式', ambience: { brightness: 0.7, fog: true } },
              { type: 'immersive_cinema', hudText: '沉浸式影院', ambience: { brightness: 0.3, fog: true } }
            ],
            sceneWords: ['kitchen', 'living room', 'bedroom', 'bathroom']
          }
        }
      ]
    };
  }
  
  /**
   * 模块切换回调
   */
  onModuleChange(index, module) {
    if (!module) return;
    
    // 更新 HUD
    this.hud.updateIndicator(index);
    
    const moduleInfo = this.session.modules[index];
    const titles = {
      'click': 'Click 模块 - 状态切换',
      'similarity': 'Similarity 模块 - 词网拓展',
      'rotate': 'Rotate 模块 - 2D 到 3D',
      'scenarios': 'Scenarios 模块 - 语境容器'
    };
    
    this.hud.updateModuleInfo(
      titles[moduleInfo.type] || '学习模块',
      this.getModuleDescription(moduleInfo.type)
    );
    
    // 显示通知
    this.hud.showNotification(`切换到模块 ${index + 1}/${this.session.modules.length}`, 'info', 2000);
  }
  
  /**
   * 获取模块描述
   */
  getModuleDescription(type) {
    const descriptions = {
      'click': '点击或按 Space 键切换状态',
      'similarity': '点击中心词展开相关词网络',
      'rotate': '注视卡片或点击查看 3D 模型',
      'scenarios': '点击按钮切换不同语境容器'
    };
    return descriptions[type] || '';
  }
  
  /**
   * 记录事件
   */
  async recordEvent(data) {
    try {
      await learningApi.recordEvent(data);
    } catch (error) {
      console.warn('记录事件失败:', error);
    }
  }
}

// 启动应用
const app = new App();
app.init();

export default app;
