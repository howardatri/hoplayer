# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

hoplayer — 现代本地音乐/视频播放器，追求简洁美观的 UI 和有创意的交互体验。目标是成为 Windows 上媲美 foobar2000 / MusicBee 的本地播放器，同时保持现代化的视觉设计。

## Tech Stack

- **框架**: Electron 28 + React 18 + TypeScript 5
- **构建**: Vite 5 (electron-vite 2)
- **样式**: Tailwind CSS 3.4
- **动画**: Framer Motion 11
- **状态管理**: Zustand 4（playerStore + libraryStore + settingsStore + toastStore + playlistStore + searchStore）
- **音频**: Web Audio API（AudioContext + AnalyserNode + BiquadFilterNode EQ 链，EQ 平直时自动旁路）
- **视频**: HTML5 `<video>`
- **元数据**: music-metadata 7（解析）+ node-id3 0.2（MP3 标签写入）
- **数据库**: sql.js 1（SQLite WASM，持久化曲库/播放列表/扫描路径）
- **文件监听**: chokidar 3
- **封面在线获取**: MusicBrainz API + CoverArt Archive
- **图标**: Lucide React
- **列表**: react-window（虚拟滚动）

## Build & Run

```bash
npm install
npm run dev        # 开发模式（热重载）
npm run build      # 生产构建
npm run lint       # 代码检查
```

## Architecture

```
src/
├── main/                  # Electron 主进程
│   ├── index.ts           # 入口，BrowserWindow，IPC 注册，协议处理，全局快捷键
│   ├── db.ts              # SQLite 数据库初始化（sql.js）
│   ├── tray.ts            # 系统托盘（播放/暂停/上一首/下一首/显示窗口/退出）
│   └── ipc/
│       ├── fileScan.ts    # 文件扫描、元数据解析、封面提取、MP3 标签写入
│       ├── dbHandlers.ts  # 数据库 IPC handlers（CRUD 操作 + 标签编辑）
│       ├── lyricsApi.ts   # 在线歌词搜索 API（lrclib）
│       ├── coverArtApi.ts # 在线封面获取（MusicBrainz + CoverArt Archive）
│       └── fileWatcher.ts # 文件夹监听（chokidar），自动检测新增/删除文件
├── renderer/              # React 前端
│   ├── components/        # UI 组件（20 个）
│   │   ├── PlayerBar.tsx          # 底部播放控制栏
│   │   ├── TrackList.tsx          # 虚拟滚动歌曲列表
│   │   ├── DraggableTrackList.tsx # 可拖拽排序的歌曲列表
│   │   ├── Sidebar.tsx            # 左侧导航栏
│   │   ├── CoverArt.tsx           # 封面图（含黑胶旋转动画）
│   │   ├── Equalizer.tsx          # 5 段均衡器面板（8 预设）
│   │   ├── LyricsPanel.tsx        # 歌词面板（本地 + 在线搜索 + 预览 + 保存）
│   │   ├── FullscreenLyrics.tsx   # 全屏歌词（模糊封面背景 + 同步滚动 + 点击跳转）
│   │   ├── QueuePanel.tsx         # 播放队列面板
│   │   ├── AudioSpectrum.tsx      # 音频频谱可视化（bars/wave/circular，30fps 节流）
│   │   ├── ProgressSlider.tsx     # 进度条
│   │   ├── Slider.tsx             # 通用滑块
│   │   ├── MiniPlayer.tsx         # 迷你播放器（封面 + 标题 + 播控）
│   │   ├── TitleBar.tsx           # 自定义标题栏
│   │   ├── ContextMenu.tsx        # 右键菜单
│   │   ├── Toast.tsx              # 通知提示
│   │   ├── KeyHint.tsx            # 键盘快捷键可视化提示（按键时弹出）
│   │   ├── TrackPropertiesDialog.tsx # 曲目属性/标签编辑
│   │   ├── CreatePlaylistDialog.tsx  # 创建播放列表
│   │   └── GestureHandler.tsx     # 手势控制（水平滑动调进度，右侧垂直调音量）
│   ├── hooks/             # 自定义 hooks（4 个）
│   │   ├── usePlayer.ts           # 核心播放逻辑（双 AudioElement + Web Audio EQ 链 + crossfade）
│   │   ├── useCoverArt.ts         # 封面加载 + LRU 缓存（200 条上限）
│   │   ├── useThemeColor.ts       # 封面主色调提取（降采样 64x64，加权饱和度平均）
│   │   └── useLibrary.ts          # 曲库管理（SQLite CRUD + 文件夹扫描）
│   ├── store/             # Zustand stores（6 个）
│   │   ├── playerStore.ts         # 播放状态、队列、EQ、crossfade、播放速度
│   │   ├── libraryStore.ts        # 曲库状态、扫描路径、派生查询
│   │   ├── settingsStore.ts       # 持久化设置（zustand/persist → localStorage）
│   │   ├── toastStore.ts          # 通知系统
│   │   ├── playlistStore.ts       # 播放列表
│   │   └── searchStore.ts         # 搜索状态
│   ├── pages/             # 页面（7 个）
│   │   ├── HomePage.tsx           # 首页（最近添加、最近播放、艺术家入口）
│   │   ├── LibraryPage.tsx        # 曲库（搜索、排序、分组）
│   │   ├── FolderPage.tsx         # 文件夹管理
│   │   ├── ArtistPage.tsx         # 艺术家/专辑详情
│   │   ├── PlaylistPage.tsx       # 播放列表详情（可拖拽排序）
│   │   ├── VideoPlayer.tsx        # 视频播放器（全屏、播控、进度条）
│   │   └── SettingsPage.tsx       # 设置（主题、文件夹、音频、快捷键、行为）
│   ├── themes.ts          # 10 个主题定义（6 暗色 + 4 亮色）
│   ├── utils/
│   │   ├── paths.ts       # 路径工具函数（分组、LRC 路径推导）
│   │   └── lrcParser.ts   # LRC 歌词解析器（多时间戳行 + 扩展标签 + 二分查找）
│   └── index.css          # 全局样式 + CSS 变量 + glass/glass-strong 工具类
├── shared/
│   └── index.ts           # 共享类型定义（Track, Playlist, LyricResult, IPC_CHANNELS, ElectronAPI）
└── preload/
    └── index.ts           # contextBridge API 暴露（35+ IPC 通道）
```

### 进程分工

- **主进程**: 文件系统操作、元数据解析、SQLite 数据库、IPC 响应、系统托盘、全局快捷键
- **渲染进程**: UI 渲染、音频播放控制（Web Audio API）、用户交互
- **IPC 通信**: 使用 `contextBridge` 暴露安全 API，禁止 `nodeIntegration`

### 音频管线架构

```
EQ 直通模式（默认，所有频段为 0 时）:
HTMLAudioElement[0] → MediaElementSource[0] → GainNode[0] ─┐
                                                             ├→ AnalyserNode → Destination
HTMLAudioElement[1] → MediaElementSource[1] → GainNode[1] ─┘

EQ 激活模式（任意频段 ≠ 0 时自动切换）:
HTMLAudioElement[0] → MediaElementSource[0] → EQ[0](5×BiquadFilter) → GainNode[0] ─┐
                                                                                      ├→ AnalyserNode → Destination
HTMLAudioElement[1] → MediaElementSource[1] → EQ[1](5×BiquadFilter) → GainNode[1] ─┘
```

- 双 AudioElement 支持 crossfade（gain 动画过渡）
- EQ 通过 BiquadFilterNode 链实现，支持 5 段 ±12dB
- **EQ 智能旁路**：所有频段为 0 时 source→gain 直连，跳过滤波器链节省 CPU
- AnalyserNode 提供频谱数据给 AudioSpectrum 可视化
- `ensureWebAudio()` 延迟初始化，首次播放或打开 EQ 时创建
- `timeupdate` 节流到每秒 2 次，减少 React 重渲染频率
- crossfade 完成后清理旧 AudioElement 的 media buffer

## Memory & CPU Optimization

Electron 内存和 CPU 优化是本项目的硬性要求：

### 内存
- `app.disableHardwareAcceleration()` — 关闭 GPU 渲染
- `--max-old-space-size=256` — 限制 V8 堆大小
- 单窗口架构，不使用多 `BrowserWindow`
- `spellcheck: false`, `sandbox: false`（protocol handler 需要）
- 播放列表使用 `react-window` 虚拟滚动，只渲染可见项
- 封面图 LRU 缓存（上限 200 条），超出自动淘汰
- `useThemeColor` 复用单例 Canvas（64x64），切歌时中断旧 Image 加载
- `usePlayer` 手动切歌时清理非活跃 AudioElement 的 media buffer（`removeAttribute('src')` + `load()`）
- `AudioSpectrum` 复用 Uint8Array buffer，缓存主色调避免每帧 `getComputedStyle`
- Toast 系统清理 pending timers，ContextMenu 清理 setTimeout
- seek 操作不堆叠 timeout

### CPU
- **AudioSpectrum 30fps 节流**：从 60fps 降到 30fps，窗口不可见时自动暂停
- **EQ 智能旁路**：所有频段为 0 时 source→gain 直连，跳过 5 个 BiquadFilterNode
- **timeupdate 节流**：从每秒 4 次降到每秒 2 次，减少 PlayerBar 重渲染
- **backdrop-filter 优化**：PlayerBar 从 blur(40px) 降到 blur(12px)，glass-strong 从 40px 降到 16px
- **settingsStore 持久化**：使用 zustand/persist 中间件，避免重复序列化

## UI Design Principles

- **极简**: 界面元素克制，留白充足，不做信息过载
- **玻璃拟态**: 半透明模糊背景（backdrop-filter: blur），营造层次感
- **色彩**: 从当前播放的封面图提取主色调，动态应用到 UI 主题
- **主题**: 10 个内置主题（6 暗色 + 4 亮色），所有颜色通过 CSS 变量驱动
- **动效**: 使用 Framer Motion 做过渡动画，不滥用，只在有意义的地方用
- **字体**: Inter，保持排版一致性
- **主题适配**: 所有组件使用 CSS 变量（`--color-primary`, `--color-text` 等）或 Tailwind 主题 token（`text-fg`, `bg-surface` 等），不硬编码颜色

## Current Features (v0.2.0)

### 播放
- [x] 音频播放：MP3, FLAC, WAV, OGG, M4A, AAC, WMA
- [x] 视频播放：MP4, WebM, MKV, AVI
- [x] 播放控制：播放/暂停、上一首/下一首、进度条、音量
- [x] 重复模式：关闭/全部/单曲
- [x] 随机播放（避免连续重复）
- [x] 播放速度：0.5x ~ 3.0x
- [x] Crossfade：0~12 秒，双 AudioElement + GainNode 动画过渡
- [x] 播放队列管理
- [x] 5 段均衡器 + 8 个预设（Flat/Rock/Pop/Jazz/Classical/Bass Boost/Treble Boost/Vocal）
- [x] 均衡器智能旁路（平直时零 CPU 开销）
- [x] 音频频谱可视化（bars/wave/circular，30fps 节流 + 后台暂停）

### 曲库
- [x] 文件夹扫描 + SQLite 持久化
- [x] 文件夹监听自动扫描（chokidar，检测新增/删除文件，300ms 防抖）
- [x] 搜索（标题/艺术家/专辑）
- [x] 排序（标题/艺术家/专辑/时长，升序/降序）
- [x] 文件夹分组视图
- [x] 艺术家/专辑详情页
- [x] 虚拟滚动（react-window）
- [x] 曲目属性查看 + MP3 标签编辑
- [x] 拖拽文件导入
- [x] 播放次数统计 + 最近播放记录

### 播放列表
- [x] 创建/删除/重命名
- [x] 添加/移除曲目
- [x] 拖拽排序
- [x] SQLite 持久化

### UI/UX
- [x] 自定义无边框窗口 + 标题栏
- [x] 迷你播放器模式（封面 + 标题 + 播控，窗口拖拽）
- [x] 系统托盘控制（播放/暂停/上一首/下一首/显示窗口/退出）
- [x] 全局媒体键快捷键（MediaPlayPause/MediaNextTrack/MediaPreviousTrack/MediaStop）
- [x] 任务栏进度条（setProgressBar）
- [x] 右键菜单系统
- [x] Toast 通知
- [x] 手势控制（Pointer Events，水平滑动调进度，右侧垂直调音量）
- [x] 键盘快捷键可视化提示（按键时弹出提示框，1.2s 自动消失）
- [x] 黑胶唱片旋转动画（Framer Motion，双层结构：vinyl 底层 + cover 图片层）
- [x] 封面主色调动态主题（降采样 64x64，加权饱和度平均，CSS 变量驱动）
- [x] 10 个内置主题（6 暗 + 4 亮），zustand/persist 持久化用户选择
- [x] 玻璃拟态 UI（backdrop-filter: blur，优化为 12-16px）
- [x] Framer Motion 页面过渡动画
- [x] 全屏模式（迷你播放器切换）

### 歌词
- [x] 本地 .lrc 文件加载
- [x] 在线歌词搜索（lrclib API，精确匹配 + 模糊搜索）
- [x] 歌词预览 + 保存到本地
- [x] 同步歌词自动滚动 + 点击跳转
- [x] 全屏歌词模式（模糊封面背景 + 大字体居中 + 行高亮动画）

### 在线功能
- [x] 在线封面获取（MusicBrainz API → CoverArt Archive）
- [x] 封面保存到音频文件

---

## 与主流播放器的差距分析

对比 foobar2000、MusicBee、Apple Music、Spotify、AIMP 等主流播放器：

### Tier 1 — 必须具备（高优先级）

| 功能 | 状态 | 说明 |
|------|------|------|
| 播放次数/最近播放统计 | ✅ | DB 字段已有，HomePage 展示最近播放 |
| 文件夹监听（自动扫描） | ✅ | chokidar 监听扫描路径，300ms 防抖，自动检测新增/删除 |
| 任务栏进度条 | ✅ | setProgressBar() 已实现 |
| 系统托盘播控 | ✅ | 播放/暂停/上一首/下一首/显示窗口/退出 |
| 无缝播放（Gapless） | ❌ | 古典/现场/DJ 混音必需，需要 AudioBufferSourceNode 精确调度 |
| ReplayGain / 音量标准化 | ❌ | 防止曲目间音量跳变，读取 RG 标签通过 GainNode 补偿 |
| 输出设备选择 | ❌ | setSinkId() 实现，USB DAC / 蓝牙耳机用户必需 |
| 标签写入扩展到 FLAC/OGG/M4A | ❌ | 目前仅支持 MP3（node-id3） |
| M3U 播放列表导入/导出 | ❌ | 与其他播放器互通的标准格式 |
| 任务栏缩略图按钮 | ❌ | setThumbarButtons() 上一首/播放/下一首 |

### Tier 2 — 差异化功能（中优先级）

| 功能 | 状态 | 说明 |
|------|------|------|
| 全屏歌词模式 | ✅ | 模糊封面背景 + 大字体居中 + 行高亮动画 + 点击跳转 |
| 在线封面获取 | ✅ | MusicBrainz + CoverArt Archive |
| 智能播放列表 | ❌ | 规则引擎：流派=X、播放次数>N、最近7天添加 |
| Last.fm Scrobbling | ❌ | 社区功能，HTTP POST 到 last.fm API |
| 批量标签编辑 | ❌ | 多选曲目批量修改艺术家/专辑/年份等字段 |
| 在线元数据查找 | ❌ | MusicBrainz API 自动补全专辑信息（当前仅用于封面） |
| 重复文件检测 | ❌ | 按文件哈希或元数据匹配 |
| 播放列表文件夹 | ❌ | 层级组织播放列表 |
| 切歌系统通知 | ❌ | new Notification() 显示曲目信息 |
| 快捷键自定义 | ❌ | 目前硬编码（KeyHint 组件展示了快捷键，但不支持自定义） |
| 专辑/流派浏览视图 | ❌ | 专门的按专辑网格、按流派浏览页面 |

### Tier 3 — 进阶功能（低优先级）

| 功能 | 状态 | 说明 |
|------|------|------|
| 封面图管理 | ✅ | 在线获取 + 保存到文件，本地封面提取已有 |
| 曲库统计页面 | ❌ | 总曲目/总时长/存储占用/Top 10 艺术家 |
| CUE sheet 支持 | ❌ | 单文件整轨 + cue 虚拟分轨 |
| Crossfeed（耳机交叉馈送） | ❌ | Web Audio API 可实现 |
| 评分系统 | ❌ | 1-5 星，存 SQLite + 可写入 ID3 POPM |
| Opus 格式 | ❌ | 加入扩展名即可 |
| 远程控制（Web/手机） | ❌ | LAN HTTP 服务器 |
| 命令行控制 | ❌ | --play / --next / --enqueue |
| WASAPI 独占模式 | ❌ | 需要原生音频输出，Web Audio API 无法实现 |

### hoplayer 的独特优势

- **封面主色调动态主题** — Apple Music / Spotify 都没有的功能
- **手势控制** — 创新的交互方式（水平滑动调进度，右侧垂直调音量）
- **黑胶旋转动画** — 视觉差异化（双层结构 + Framer Motion）
- **玻璃拟态 UI** — 现代感强（优化后的 blur 12-16px）
- **Crossfade 实现** — 双 AudioElement + GainNode 动画，比大多数播放器精细
- **EQ 智能旁路** — 平直时零 CPU 开销，比始终启 EQ 的方案更高效
- **SQLite 持久化** — 比 JSON 文件方案更可靠
- **键盘快捷键可视化** — 按键时弹出提示框，降低学习成本
- **全屏歌词** — 模糊封面背景 + 大字体居中，沉浸式体验
- **文件夹监听** — chokidar 自动检测新增/删除文件，无需手动刷新

## Agent Implementation Notes

- 使用 `electron-vite` 脚手架初始化，避免手动配置 Webpack
- 主进程和渲染进程的类型定义放在 `shared/`，通过 IPC 传递时保持类型安全
- 音频播放逻辑封装为 `usePlayer` hook，暴露统一的播放控制接口
- UI 组件使用 Tailwind 原子类 + CSS 变量，不硬编码颜色
- 动画统一用 Framer Motion，不混用 CSS transition 和 JS 动画
- 本地文件通过自定义 `local://` 协议加载，主进程用 `protocol.handle` 处理 range request（支持 seek）
- 使用 `@electron-toolkit/utils` 的 `is` 工具判断开发/生产环境
- 数据库使用 sql.js（SQLite WASM），数据持久化到用户目录
- Web Audio API 的 `AnalyserNode` 通过单例模式管理，`usePlayer` hook 负责初始化并连接
- **EQ 智能旁路**：`eqBypassed` 标志跟踪状态，`enableEqChain()`/`disableEqChain()` 动态切换 source→gain 连接方式
- 音频频谱支持三种渲染模式：bars、wave、circular，均使用 Canvas 2D，30fps 节流 + document.hidden 暂停
- 封面主色调提取：复用单例 Canvas 降采样到 64x64，过滤暗/亮像素后取加权饱和度平均
- 全局快捷键：主进程注册 `MediaPlayPause`/`MediaNextTrack`/`MediaPreviousTrack`/`MediaStop`，通过 IPC 发送
- 歌词解析：LRC 格式解析器支持多时间戳行和扩展标签，二分查找定位当前行
- 拖拽排序：原生 HTML5 Drag and Drop API，无第三方依赖
- 手势控制：Pointer Events API 实现水平滑动调节进度、右侧垂直滑动调节音量
- 封面旋转：大尺寸封面采用双层结构（vinyl 底层 + cover 图片层），Framer Motion 驱动
- 主题系统：所有颜色通过 CSS 变量驱动，Tailwind 配置扩展 `fg`/`surface` 系列 token，zustand/persist 持久化主题选择
- 封面缓存：LRU 策略，上限 200 条，超出自动淘汰最旧条目
- 文件监听：chokidar 监听扫描路径，300ms 防抖通知渲染进程，支持 add/unlink 事件
- 在线封面：MusicBrainz API 搜索 release-group → CoverArt Archive 获取封面图 → base64 返回
- settingsStore：使用 zustand/persist 中间件持久化到 localStorage，包含主题/音量/EQ/crossfade/播放速度/重复模式/随机
- 播放列表：playlistStore 管理状态，dbHandlers 持久化到 SQLite，支持拖拽排序
- 歌词面板：本地 .lrc 加载 → 在线 lrclib API 搜索 → 预览 → 保存到本地，全屏模式支持模糊封面背景
