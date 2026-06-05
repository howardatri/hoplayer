# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

hoplayer — 现代音乐/视频播放器，追求简洁美观的 UI 和有创意的交互体验。

## Tech Stack

- **框架**: Electron + React 18 + TypeScript
- **构建**: Vite (electron-vite)
- **样式**: Tailwind CSS 4
- **动画**: Framer Motion
- **状态管理**: Zustand
- **音频**: Web Audio API + wavesurfer.js（波形可视化）
- **视频**: HTML5 `<video>`
- **元数据**: music-metadata（解析音频文件信息）
- **图标**: Lucide React

## Build & Run

```bash
# 初始化后填入实际命令
npm install
npm run dev        # 开发模式（热重载）
npm run build      # 生产构建
npm run lint       # 代码检查
```

## Architecture

```
src/
├── main/           # Electron 主进程
│   ├── index.ts    # 入口，BrowserWindow 创建，IPC 注册
│   └── ipc/        # IPC handler（文件扫描、元数据读取等）
├── renderer/       # React 前端
│   ├── components/ # UI 组件
│   ├── hooks/      # 自定义 hooks（usePlayer, usePlaylist 等）
│   ├── store/      # Zustand store
│   ├── pages/      # 页面（首页、库、设置等）
│   └── utils/      # 工具函数
├── shared/         # 主进程/渲染进程共享的类型定义
└── assets/         # 静态资源
```

### 进程分工

- **主进程**: 文件系统操作、元数据解析、IPC 响应
- **渲染进程**: UI 渲染、音频播放控制、用户交互
- **IPC 通信**: 使用 `contextBridge` 暴露安全 API，禁止 `nodeIntegration`

## Memory Optimization

Electron 内存优化是本项目的硬性要求：

- `app.disableHardwareAcceleration()` — 不做 3D 渲染时关闭
- 单窗口架构，不使用多 `BrowserWindow`
- 禁用 Chromium 无用特性：`spellcheck: false`, `sandbox: true`
- 播放列表使用虚拟滚动（react-window 或 tanstack-virtual），只渲染可见项
- 封面图按需加载，使用 `URL.revokeObjectURL` 及时释放 blob URL
- 限制 V8 堆大小：`app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=256')`

## UI Design Principles

- **极简**: 界面元素克制，留白充足，不做信息过载
- **玻璃拟态**: 半透明模糊背景（backdrop-filter: blur），营造层次感
- **色彩**: 从当前播放的封面图提取主色调，动态应用到 UI 主题
- **动效**: 使用 Framer Motion 做过渡动画，不滥用，只在有意义的地方用
- **字体**: 选用一款现代无衬线字体（如 Inter），保持排版一致性

## Core Features

### 一期（MVP）
- [x] 项目脚手架搭建
- [x] 音频播放（mp3, flac, wav, ogg）
- [x] 视频播放（mp4, webm）
- [x] 本地文件夹扫描，自动建立音乐库
- [x] 播放列表（创建、编辑、排序）
- [x] 基础播放控制（播放/暂停、上一首/下一首、进度条、音量）
- [x] 封面图显示
- [x] 迷你播放器模式

### 二期（体验增强）
- [x] 音频频谱/波形可视化（Canvas 2D）
- [x] 从封面图提取主色调，动态主题
- [x] 全局快捷键（播放/暂停、切歌）
- [x] 歌词显示（支持 .lrc 文件）
- [x] 拖拽排序播放列表
- [x] 搜索（按标题、艺术家、专辑）

### 三期（创意交互）
- [x] 手势控制：在播放器区域滑动调节音量/进度
- [x] 封面旋转动画：播放时缓慢旋转，暂停时停止
- [x] 页面切换动画：共享元素过渡（封面图从列表滑入播放页）
- [x] 键盘快捷键可视化提示（按任意键弹出对应操作提示）

## Agent Implementation Notes

- 使用 `electron-vite` 脚手架初始化，避免手动配置 Webpack
- 主进程和渲染进程的类型定义放在 `shared/`，通过 IPC 传递时保持类型安全
- 音频播放逻辑封装为 `usePlayer` hook，暴露统一的播放控制接口
- 所有 UI 组件使用 Tailwind 原子类，不写自定义 CSS（除动画关键帧）
- 动画统一用 Framer Motion，不混用 CSS transition 和 JS 动画
- 本地文件通过自定义 `local://` 协议加载，主进程用 `protocol.handle` 将其转为 `file://` 路径
- 使用 `@electron-toolkit/utils` 的 `is` 工具判断开发/生产环境
- 使用 `electron-store` 持久化用户数据（扫描路径、播放列表、曲库）
- Web Audio API 的 `AnalyserNode` 通过单例模式管理，`usePlayer` hook 负责初始化并连接 `HTMLAudioElement`
- 音频频谱支持三种渲染模式：bars、wave、circular，均使用 Canvas 2D
- 封面主色调提取：Canvas 降采样到 64x64，过滤暗/亮像素后取加权平均，应用为 CSS 变量
- 全局快捷键：主进程注册 `MediaPlayPause`/`MediaNextTrack`/`MediaPreviousTrack`，通过 IPC 发送到渲染进程
- 歌词解析：LRC 格式解析器支持多时间戳行和扩展标签，二分查找定位当前行
- 拖拽排序：原生 HTML5 Drag and Drop API，无第三方依赖
- 全局搜索：Sidebar 搜索框通过 Zustand searchStore 与 LibraryPage 同步查询
- 手势控制：Pointer Events API 实现水平滑动调节进度、右侧垂直滑动调节音量，带视觉反馈
- 封面旋转：大尺寸封面采用双层结构（vinyl 底层 + cover 图片层），Framer Motion 动画驱动旋转
- 页面切换：Blur + Y 轴位移的 AnimatePresence 过渡动画
- 键盘提示：全局 keydown 监听，匹配快捷键后显示 1.2s 的浮动提示卡片
