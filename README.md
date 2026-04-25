# VR English Vocabulary Learning Platform

基于你的 Outline，本仓库已重构为一个面向 AI Agent 的核心交互骨架项目。目标不是提供固定词库内容，而是提供可编排、可扩展、可替换素材的四模块运行时。

## Product Goal

系统以后端下发学习会话配置为中心，前端按模块类型自动实例化交互容器，完成以下四类认知路径：

- Click: 状态/形态切换，强调对立变化词义
- Similarity: 空间节点拓展，构建发散词网
- Rotate: 从 2D 到 3D 的结构解构
- Scenarios: 多模态语境容器切换

## Core Architecture

### 1) Backend as Orchestrator

后端通过 API 返回一份学习会话配置，包含模块顺序、交互触发方式、自动流转时间和容器参数。

- GET /api/learning/session
  - 返回 sessionId、title、modules[]
  - modules 中每个元素由 type 决定前端实例化逻辑

### 2) Frontend as Runtime Engine

前端不写死具体单词流程，而是：

- 拉取会话配置
- 根据 type 选择模块工厂
- 挂载模块实体到 Three.js 场景
- 通过统一交互系统处理中心射线 hover 与 click
- 按闲置时间自动切换到下一模块

## Module Mapping (Outline -> Implementation)

### Click 模块

- 初始态: 渲染基础几何模型
- 触发: 射线点击或键盘 Space/Enter
- 状态过渡: 模型平滑变形+颜色过渡
- 变化态: HUD 同步显示切换后的词
- 自动流转: 按 autoAdvanceSeconds 切换模块

### Similarity 模块

- 初始态: 中央核心词模型 + 展开按钮
- 触发: 命中展开按钮
- 空间展开: 以核心模型为中心生成连接线
- 子节点生成: 周边渲染相关词节点与文本标签

### Rotate 模块

- 初始态: 2D 平面卡片
- 触发与跃出: 中心注视达到阈值后切换为 3D 模型
- 自转与标注: 在设定角度弹出结构词 callout
- 重置: 周期结束后回到 2D 初始态

### Scenarios 模块

作为通用语境容器外壳，支持后端下发的容器类型切换：

- cinemagraph_25d
- diorama_3d
- vertical_holo
- immersive_cinema

切换容器时同步更新 HUD 文案与场景氛围（例如影院模式背景变暗）。

## Repository Structure

.
├── client/
│   ├── src/
│   │   ├── api/              # 后端接口访问
│   │   ├── core/             # Three.js 渲染基础
│   │   ├── systems/          # 交互/手势/物理系统
│   │   ├── modules/          # 四模块运行时实现
│   │   ├── ui/               # HUD 层
│   │   └── main.js           # 前端入口（拉会话+驱动运行时）
│   └── package.json
├── server/
│   └── src/
│       ├── routes/           # 路由注册
│       ├── controllers/      # 控制器
│       ├── services/         # 学习会话编排数据
│       ├── app.js            # Express app
│       └── server.js         # 启动入口
├── shared/
│   └── types.js              # 共享模块类型常量
└── README.md

## Setup

要求：Node.js >= 18

1. 安装依赖

npm install

1. 启动后端

npm run dev:server

1. 启动前端

npm run dev:client

访问地址：

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3000>

## Interaction Quick Guide

- 鼠标点击或 Space/Enter: 触发主交互
- 凝视中心对象: 触发 Rotate 模块的 hover 逻辑
- 无操作时: 运行时自动切换至下一模块

## Next Expansion Suggestions

- 接入真实 Tripo 资产 URL 到各模块实体
- 将 AI 语音反馈事件注入 Scenarios 容器
- 为每个模块补充可观测埋点（完成率、停留时长、触发次数）
