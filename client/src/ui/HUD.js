/**
 * HUD (Heads-Up Display) 管理器
 * 负责 2D UI 层的更新
 */
export class HUD {
  constructor() {
    this.elements = {
      title: document.getElementById('module-title'),
      description: document.getElementById('module-description'),
      indicator: document.getElementById('module-indicator'),
      loading: document.getElementById('loading')
    };
    
    this.moduleCount = 0;
    this.currentIndex = 0;
  }
  
  /**
   * 初始化模块指示器
   */
  initModuleIndicator(count) {
    this.moduleCount = count;
    
    if (!this.elements.indicator) return;
    
    this.elements.indicator.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('div');
      dot.className = 'module-dot';
      dot.dataset.index = i;
      this.elements.indicator.appendChild(dot);
    }
    
    this.updateIndicator(0);
  }
  
  /**
   * 更新模块指示器
   */
  updateIndicator(currentIndex) {
    this.currentIndex = currentIndex;
    
    if (!this.elements.indicator) return;
    
    const dots = this.elements.indicator.querySelectorAll('.module-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      
      if (i < currentIndex) {
        dot.classList.add('completed');
      } else if (i === currentIndex) {
        dot.classList.add('active');
      }
    });
  }
  
  /**
   * 更新模块信息
   */
  updateModuleInfo(title, description) {
    if (this.elements.title) {
      this.elements.title.textContent = title;
    }
    if (this.elements.description) {
      this.elements.description.textContent = description;
    }
  }
  
  /**
   * 显示加载状态
   */
  showLoading(message = '正在加载...') {
    if (this.elements.loading) {
      this.elements.loading.classList.remove('hidden');
      const text = this.elements.loading.querySelector('.loading-text');
      if (text) text.textContent = message;
    }
  }
  
  /**
   * 隐藏加载状态
   */
  hideLoading() {
    if (this.elements.loading) {
      this.elements.loading.classList.add('hidden');
    }
  }
  
  /**
   * 显示通知
   */
  showNotification(message, type = 'info', duration = 3000) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: ${type === 'error' ? 'rgba(244, 67, 54, 0.9)' : 'rgba(76, 175, 80, 0.9)'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
      animation: fadeInUp 0.3s ease;
    `;
    notification.textContent = message;
    
    // 添加动画样式
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes fadeOutDown {
          from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // 自动移除
    setTimeout(() => {
      notification.style.animation = 'fadeOutDown 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
  
  /**
   * 创建词汇显示面板
   */
  showWordPanel(word, translation, position = 'center') {
    // 移除已存在的面板
    const existing = document.getElementById('word-panel');
    if (existing) existing.remove();
    
    const panel = document.createElement('div');
    panel.id = 'word-panel';
    panel.style.cssText = `
      position: fixed;
      ${position === 'center' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%);' : 'top: 120px; left: 50%; transform: translateX(-50%);'}
      padding: 24px 48px;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid rgba(79, 195, 247, 0.3);
      text-align: center;
      z-index: 500;
      animation: fadeInUp 0.4s ease;
    `;
    
    panel.innerHTML = `
      <div style="font-size: 36px; font-weight: bold; color: #4fc3f7; margin-bottom: 8px;">${word}</div>
      <div style="font-size: 18px; color: #b0bec5;">${translation}</div>
    `;
    
    document.body.appendChild(panel);
    
    return panel;
  }
  
  /**
   * 隐藏词汇面板
   */
  hideWordPanel() {
    const panel = document.getElementById('word-panel');
    if (panel) {
      panel.style.animation = 'fadeOutDown 0.3s ease';
      setTimeout(() => panel.remove(), 300);
    }
  }
  
  /**
   * 更新进度条
   */
  showProgress(progress, label = '') {
    let container = document.getElementById('progress-container');
    
    if (!container) {
      container = document.createElement('div');
      container.id = 'progress-container';
      container.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        width: 200px;
        text-align: center;
        z-index: 200;
      `;
      container.innerHTML = `
        <div id="progress-label" style="color: #b0bec5; font-size: 12px; margin-bottom: 4px;"></div>
        <div style="background: rgba(255,255,255,0.2); border-radius: 4px; height: 8px; overflow: hidden;">
          <div id="progress-bar" style="background: linear-gradient(90deg, #4fc3f7, #667eea); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
        </div>
      `;
      document.body.appendChild(container);
    }
    
    const bar = document.getElementById('progress-bar');
    const labelEl = document.getElementById('progress-label');
    
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    if (labelEl) labelEl.textContent = label;
  }
  
  /**
   * 隐藏进度条
   */
  hideProgress() {
    const container = document.getElementById('progress-container');
    if (container) container.remove();
  }
}

export default HUD;
