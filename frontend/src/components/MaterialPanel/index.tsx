import { useState, useRef } from 'react'
import { DownloadIcon, VideoIcon, StarIcon, AddIcon, DeleteIcon } from 'tdesign-icons-react'
import { Button, Progress, MessagePlugin } from 'tdesign-react'
import { formatTime, formatFileSize } from '../../utils/timeFormat'
import { downloadVideo, uploadVideo, getVideoUrl } from '../../services/videoApi'
import type { VideoFile, EditorMode, UploadProgress } from '../../types/video'
import './index.less'

interface MaterialPanelProps {
  videos: VideoFile[]
  mainVideo: VideoFile | null
  selectedVideo: VideoFile | null
  previewVideo: VideoFile | null
  onSelect: (video: VideoFile) => void
  onPreview: (video: VideoFile) => void
  onSetMainVideo: (video: VideoFile) => void
  onDragStart: (video: VideoFile) => void
  onUpload: (video: VideoFile) => void
  onDelete: (video: VideoFile) => void
  mode: EditorMode
}

export default function MaterialPanel({ 
  videos, 
  mainVideo,
  selectedVideo, 
  previewVideo,
  onSelect,
  onPreview,
  onSetMainVideo,
  onDragStart,
  onUpload,
  onDelete,
  mode 
}: MaterialPanelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [dragOverMain, setDragOverMain] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const draggedVideoRef = useRef<VideoFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska']
  const MAX_SIZE = 500 * 1024 * 1024 // 500MB

  const getFormatFromName = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ext || 'mp4'
  }

  const handleDownload = (e: React.MouseEvent, video: VideoFile) => {
    e.stopPropagation()
    downloadVideo(video.id, video.name)
  }

  const handleDelete = (e: React.MouseEvent, video: VideoFile) => {
    e.stopPropagation()
    onDelete(video)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i)) {
      try { MessagePlugin.error('不支持的文件格式') } catch {}
      return
    }
    if (file.size > MAX_SIZE) {
      try { MessagePlugin.error(`文件大小超过限制（最大 ${formatFileSize(MAX_SIZE)}）`) } catch {}
      return
    }

    setUploading(true)
    setUploadProgress({ loaded: 0, total: file.size, percent: 0 })

    const result = await uploadVideo(file, (p) => {
      setUploadProgress(p)
    })

    setUploading(false)
    setUploadProgress(null)

    // 清空 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (result.success && result.data) {
      const videoFile: VideoFile = {
        id: result.data.file_id,
        name: result.data.filename,
        size: file.size,
        duration: result.data.duration_seconds,
        width: result.data.width,
        height: result.data.height,
        fps: result.data.fps,
        frameCount: result.data.frame_count,
        format: result.data.format || getFormatFromName(result.data.filename),
        url: getVideoUrl(result.data.file_id),
        isMain: !mainVideo, // 如果没有主视频，设为主视频
        sourceType: 'upload'
      }
      onUpload(videoFile)
      try { MessagePlugin.success('上传成功') } catch {}
    } else {
      try { MessagePlugin.error(result.error || '上传失败') } catch {}
    }
  }

  const handleDragStart = (e: React.DragEvent, video: VideoFile) => {
    draggedVideoRef.current = video
    e.dataTransfer.setData('video-id', video.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(video)
  }

  const handleDragEnd = () => {
    draggedVideoRef.current = null
    setDragOverMain(false)
  }

  const handleMainDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverMain(true)
  }

  const handleMainDragLeave = () => {
    setDragOverMain(false)
  }

  const handleMainDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverMain(false)
    if (draggedVideoRef.current) {
      onSetMainVideo(draggedVideoRef.current)
    }
  }

  // 所有素材（不包括当前主视频）
  const materialVideos = videos.filter(v => v.id !== mainVideo?.id)

  return (
    <div className="material-panel">
      <div className="panel-header">
        <span>素材库</span>
        <Button 
          size="small" 
          variant="outline"
          icon={<AddIcon />}
          onClick={handleUploadClick}
          loading={uploading}
        >
          上传
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {uploading && uploadProgress && (
        <div className="upload-progress">
          <Progress
            percentage={uploadProgress.percent}
            size="small"
            theme="plump"
          />
          <span className="progress-text">
            {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
          </span>
        </div>
      )}

      <div className="material-list">
        {/* 主视频区域 - 置顶 */}
        <div 
          className={`main-video-slot ${dragOverMain ? 'drag-over' : ''} ${mainVideo ? 'has-video' : ''}`}
          onDragOver={handleMainDragOver}
          onDragLeave={handleMainDragLeave}
          onDrop={handleMainDrop}
        >
          <div className="slot-label">
            <StarIcon size="14px" />
            <span>主视频</span>
          </div>
          {mainVideo ? (
            <div 
              className={`material-card main-card ${previewVideo?.id === mainVideo.id ? 'previewing' : ''}`}
              onClick={() => onPreview(mainVideo)}
              draggable
              onDragStart={(e) => handleDragStart(e, mainVideo)}
              onDragEnd={handleDragEnd}
              onMouseEnter={() => setHoveredId(mainVideo.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="card-thumbnail">
                <div className="thumbnail-placeholder">
                  <VideoIcon size="20px" />
                </div>
                <div className="duration-badge">{formatTime(mainVideo.duration)}</div>
                {hoveredId === mainVideo.id && (
                  <div className="card-actions">
                    <button 
                      className="action-btn download-btn"
                      onClick={(e) => handleDownload(e, mainVideo)}
                      title="下载视频"
                    >
                      <DownloadIcon size="14px" />
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={(e) => handleDelete(e, mainVideo)}
                      title="删除视频"
                    >
                      <DeleteIcon size="14px" />
                    </button>
                  </div>
                )}
              </div>
              <div className="card-info">
                <div className="card-name" title={mainVideo.name}>{mainVideo.name}</div>
                <div className="card-meta">
                  <span>{mainVideo.width}×{mainVideo.height}</span>
                  <span className="separator">•</span>
                  <span>{mainVideo.format.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-slot">
              <p>拖拽素材到此处设为主视频</p>
            </div>
          )}
        </div>

        <div className="divider" />

        {/* 素材列表 */}
        <div className="materials-section">
          <div className="section-label">素材列表</div>
          {materialVideos.length === 0 ? (
            <div className="empty-state">
              <VideoIcon size="28px" />
              <p>暂无素材</p>
              <p className="hint">上传或裁剪生成的视频将显示在这里</p>
            </div>
          ) : (
            materialVideos.map(video => (
              <div
                key={video.id}
                className={`material-card ${selectedVideo?.id === video.id ? 'selected' : ''} ${previewVideo?.id === video.id ? 'previewing' : ''}`}
                onClick={() => onPreview(video)}
                onDoubleClick={() => mode === 'merge' && onSelect(video)}
                draggable
                onDragStart={(e) => handleDragStart(e, video)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredId(video.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="card-thumbnail">
                  <div className="thumbnail-placeholder">
                    <VideoIcon size="20px" />
                  </div>
                  <div className="duration-badge">{formatTime(video.duration)}</div>
                  
                  {hoveredId === video.id && (
                    <div className="card-actions">
                      <button 
                        className="action-btn download-btn"
                        onClick={(e) => handleDownload(e, video)}
                        title="下载视频"
                      >
                        <DownloadIcon size="14px" />
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={(e) => handleDelete(e, video)}
                        title="删除视频"
                      >
                        <DeleteIcon size="14px" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="card-info">
                  <div className="card-name" title={video.name}>{video.name}</div>
                  <div className="card-meta">
                    <span>{video.width}×{video.height}</span>
                    <span className="separator">•</span>
                    <span>{video.format.toUpperCase()}</span>
                  </div>
                  <div className="card-meta">
                    <span>{video.frameCount} 帧</span>
                    <span className="separator">•</span>
                    <span>{video.fps.toFixed(1)} fps</span>
                  </div>
                  {video.sourceType && video.sourceType !== 'upload' && (
                    <div className="card-source">
                      {video.sourceType === 'crop' ? '裁剪生成' : '拼接生成'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
