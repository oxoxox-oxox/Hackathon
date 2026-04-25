/**
 * 共享模块类型常量
 * 用于前后端统一的模块类型定义
 */

export const ModuleTypes = {
  CLICK: 'click',
  SIMILARITY: 'similarity',
  ROTATE: 'rotate',
  SCENARIOS: 'scenarios'
};

export const ScenarioContainerTypes = {
  CINEMAGRAPH_25D: 'cinemagraph_25d',
  DIORAMA_3D: 'diorama_3d',
  VERTICAL_HOLO: 'vertical_holo',
  IMMERSIVE_CINEMA: 'immersive_cinema'
};

export const InteractionTypes = {
  CLICK: 'click',
  HOVER: 'hover',
  GAZE: 'gaze',
  VOICE: 'voice'
};

export const ModuleStates = {
  INITIAL: 'initial',
  ACTIVE: 'active',
  TRANSITIONING: 'transitioning',
  COMPLETED: 'completed'
};

/**
 * 模块配置结构
 * @typedef {Object} ModuleConfig
 * @property {string} id - 模块唯一标识
 * @property {string} type - 模块类型 (click|similarity|rotate|scenarios)
 * @property {Object} data - 模块特定数据
 * @property {number} autoAdvanceSeconds - 自动流转时间(秒)
 * @property {Object} interaction - 交互配置
 */

/**
 * 学习会话配置结构
 * @typedef {Object} SessionConfig
 * @property {string} sessionId - 会话ID
 * @property {string} title - 会话标题
 * @property {ModuleConfig[]} modules - 模块列表
 */

export default {
  ModuleTypes,
  ScenarioContainerTypes,
  InteractionTypes,
  ModuleStates
};
