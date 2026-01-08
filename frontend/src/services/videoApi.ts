import type { 
  ApiResponse, 
  VideoInfoResponse, 
  ProcessTask,
  CropRequest,
  OverlayRequest,
  UploadProgress,
  VideoFile
} from '../types/video';

const API_BASE = 'http://localhost:5001/api';

/**
 * 上传视频文件
 */
export async function uploadVideo(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<VideoInfoResponse>> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100)
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve({ success: true, data: response });
      } else {
        resolve({ success: false, error: `Upload failed: ${xhr.status}` });
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.open('POST', `${API_BASE}/video/upload`);
    xhr.send(formData);
  });
}

/**
 * 获取视频信息
 */
export async function getVideoInfo(fileId: string): Promise<ApiResponse<VideoInfoResponse>> {
  const response = await fetch(`${API_BASE}/video/info/${fileId}`);
  const data = await response.json();
  
  if (response.ok) {
    return { success: true, data };
  }
  return { success: false, error: data.error };
}

/**
 * 提交视频裁剪任务
 */
export async function cropVideo(request: CropRequest): Promise<ApiResponse<ProcessTask>> {
  const response = await fetch(`${API_BASE}/video/crop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  const data = await response.json();
  
  if (response.ok) {
    return { success: true, data };
  }
  return { success: false, error: data.error };
}

/**
 * 提交视频叠加/拼接任务
 */
export async function overlayVideo(request: OverlayRequest): Promise<ApiResponse<ProcessTask>> {
  const response = await fetch(`${API_BASE}/video/overlay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  const data = await response.json();
  
  if (response.ok) {
    return { success: true, data };
  }
  return { success: false, error: data.error };
}

/**
 * 查询任务状态
 */
export async function getTaskStatus(taskId: string): Promise<ApiResponse<ProcessTask>> {
  const response = await fetch(`${API_BASE}/task/${taskId}`);
  const data = await response.json();
  
  if (response.ok) {
    return { success: true, data };
  }
  return { success: false, error: data.error };
}

/**
 * 获取视频文件URL
 */
export function getVideoUrl(fileId: string): string {
  return `${API_BASE}/video/file/${fileId}`;
}

/**
 * 获取处理结果下载URL
 */
export function getResultUrl(taskId: string): string {
  return `${API_BASE}/task/${taskId}/download`;
}

/**
 * 下载视频文件
 */
export function downloadVideo(fileId: string, filename: string): void {
  const link = document.createElement('a');
  link.href = `${API_BASE}/video/download/${fileId}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();
  
  if (response.ok) {
    return { success: true, data };
  }
  return { success: false, error: data.error };
}
