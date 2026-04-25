import { ModuleTypes } from '@shared/types.js';
import { ClickModule } from './ClickModule.js';
import { SimilarityModule } from './SimilarityModule.js';
import { RotateModule } from './RotateModule.js';
import { ScenariosModule } from './ScenariosModule.js';

/**
 * 模块工厂
 * 根据配置类型创建对应的模块实例
 */
export class ModuleFactory {
  constructor(engine) {
    this.engine = engine;
  }
  
  /**
   * 创建模块实例
   * @param {Object} config - 模块配置
   * @returns {BaseModule} 模块实例
   */
  create(config) {
    switch (config.type) {
      case ModuleTypes.CLICK:
        return new ClickModule(this.engine, config);
        
      case ModuleTypes.SIMILARITY:
        return new SimilarityModule(this.engine, config);
        
      case ModuleTypes.ROTATE:
        return new RotateModule(this.engine, config);
        
      case ModuleTypes.SCENARIOS:
        return new ScenariosModule(this.engine, config);
        
      default:
        console.warn(`Unknown module type: ${config.type}`);
        return null;
    }
  }
  
  /**
   * 批量创建模块
   * @param {Array} configs - 模块配置数组
   * @returns {Promise<Array>} 模块实例数组
   */
  async createAll(configs) {
    const modules = [];
    
    for (const config of configs) {
      const module = this.create(config);
      if (module) {
        await module.init();
        modules.push(module);
      }
    }
    
    return modules;
  }
}

export default ModuleFactory;
