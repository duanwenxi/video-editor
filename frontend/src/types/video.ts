// 裁剪区域接口
export interface CropArea {
  x: number;      // 左上角X坐标（像素）
  y: number;      // 左上角Y坐标（像素）
  width: number;  // 宽度（像素）
  height: number; // 高度（像素）
}

// 叠加位置接口
export interface OverlayPosition {
  x: number;      // 叠加位置X坐标
  y: number;      // 叠加位置Y坐标
  width: number;  // 叠加宽度
  height: number; // 叠加高度
}

// 视频文件信息
export interface VideoFile {
  id: string;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  format: string;        // 视频格式 (mp4, mov, avi 等)
  url: string;
  thumbnailUrl?: string;
  isMain?: boolean;      // 是否为主视频
  sourceType?: 'upload' | 'crop' | 'merge';  // 来源类型
  parentId?: string;     // 父视频ID（裁剪/拼接来源）
}

// 编辑模式
export type EditorMode = 'crop' | 'merge';

// 处理任务接口
export interface ProcessTask {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string;
  resultFileId?: string;
  error?: string;
}

// 上传进度接口
export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

// API 响应接口
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 视频信息响应
export interface VideoInfoResponse {
  width: number;
  height: number;
  fps: number;
  frame_count: number;
  duration_seconds: number;
  filename: string;
  file_id: string;
  format: string;
}

// 裁剪请求参数
export interface CropRequest {
  file_id: string;
  start_time: number;
  end_time: number;
  crop_area?: CropArea;
  output_format?: string;
}

// 拼接/叠加请求参数
export interface OverlayRequest {
  main_file_id: string;
  overlay_file_id: string;
  start_time: number;      // 叠加开始时间
  end_time: number;        // 叠加结束时间
  position: OverlayPosition;
  output_format?: string;
}
