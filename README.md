# Video Editor - 视频编辑器

一个基于 React + Python Flask 的全栈视频编辑应用，支持视频裁剪和拼接功能。

## 项目结构

```
my-fullstack-project/
├── frontend/                    # React + TypeScript 前端
│   ├── src/
│   │   ├── components/          # 可复用组件
│   │   │   ├── CropOverlay/     # 裁剪框覆盖层
│   │   │   ├── MainVideoUploader/  # 主视频上传
│   │   │   ├── MaterialPanel/   # 素材面板
│   │   │   ├── OverlayVideo/    # 叠加视频组件
│   │   │   ├── PropertyPanel/   # 属性设置面板
│   │   │   └── VideoPlayer/     # 视频播放器
│   │   ├── pages/
│   │   │   └── Editor/          # 编辑器主页面
│   │   ├── services/
│   │   │   └── videoApi.ts      # API 服务
│   │   ├── types/
│   │   │   └── video.ts         # TypeScript 类型定义
│   │   └── utils/
│   │       └── timeFormat.ts    # 时间格式化工具
│   ├── package.json
│   └── vite.config.ts
│
└── backend/                     # Python Flask 后端
    ├── app/
    │   ├── __init__.py          # Flask 应用工厂
    │   ├── routes/
    │   │   ├── upload.py        # 上传接口
    │   │   ├── process.py       # 视频处理接口
    │   │   └── extension.py     # 格式转换接口
    │   └── services/
    │       ├── task_manager.py  # 异步任务管理
    │       └── video_processor.py  # 视频处理核心
    ├── uploads/                 # 上传文件目录
    ├── outputs/                 # 输出文件目录
    ├── requirements.txt
    └── run.py                   # 启动入口
```

## 功能特性

### 裁剪模式
- 时间裁剪：设置开始和结束时间
- 区域裁剪：可视化拖拽裁剪框
- 快捷键：`S` 设置开始时间，`E` 设置结束时间

### 拼接模式
- 视频叠加：将素材视频叠加到主视频上
- 位置调整：拖拽调整叠加位置和大小
- 时间同步：叠加视频与主视频时间同步

### 通用功能
- 素材库管理：上传、预览、删除视频
- 视频预览：播放/暂停、逐帧控制、音量调节
- 异步处理：后台处理视频，实时显示进度

## 快速开始

### 环境要求
- Node.js >= 18
- Python >= 3.9
- FFmpeg（需安装并添加到 PATH）

### 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python run.py
```

后端运行在 `http://localhost:5001`

### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 `http://localhost:5173`

## API 接口

### 上传
- `POST /api/upload` - 上传视频文件
- `GET /api/video/<file_id>` - 获取视频文件

### 处理
- `POST /api/process/crop` - 裁剪视频
- `POST /api/process/overlay` - 叠加视频
- `GET /api/process/status/<task_id>` - 查询任务状态

### 格式转换
- `POST /api/extension/convert` - 转换视频格式

## 技术栈

### 前端
- React 19 + TypeScript
- Vite 6
- TDesign 组件库
- Less 样式

### 后端
- Python Flask
- FFmpeg（视频处理）
- OpenCV（视频信息读取）
- 异步任务队列

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放/暂停 |
| `←` | 后退一帧 |
| `→` | 前进一帧 |
| `S` | 设置开始时间 |
| `E` | 设置结束时间（仅裁剪模式） |
