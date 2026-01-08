import { useState, useRef } from 'react'
import { Button, Progress, MessagePlugin } from 'tdesign-react'
import { UploadIcon, VideoIcon } from 'tdesign-icons-react'
import { uploadVideo, getVideoUrl } from '../../services/videoApi'
import { formatFileSize } from '../../utils/timeFormat'
import type { VideoFile, UploadProgress } from '../../types/video'
import './index.less'

interface MainVideoUploaderProps {
  mainVideo: VideoFile | null
  onUpload: (video: VideoFile) => void
}

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska']
const MAX_SIZE = 500 * 1024 * 1024 // 500MB

function getFormatFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || 'mp4'
  return ext
}

export default function MainVideoUploader({ mainVideo, onUpload }: MainVideoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i)) {
      return '不支持的文件格式，请上传 MP4、MOV、AVI、WebM、MKV 格式的视频'
    }
    if (file.size > MAX_SIZE) {
      return `文件大小超过限制（最大 ${formatFileSize(MAX_SIZE)}）`
    }
    return null
  }

  const handleUpload = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      MessagePlugin.error(error)
      return
    }

    setUploading(true)
    setProgress({ loaded: 0, total: file.size, percent: 0 })

    const result = await uploadVideo(file, (p) => {
      setProgress(p)
    })

    setUploading(false)
    setProgress(null)

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
        isMain: true,
        sourceType: 'upload'
      }
      onUpload(videoFile)
      MessagePlugin.success('主视频上传成功')
    } else {
      MessagePlugin.error(result.error || '上传失败')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  // 如果已有主视频，显示更换按钮
  if (mainVideo) {
    return (
      <div className="main-video-info">
        <div className="video-details">
          <VideoIcon size="20px" />
          <div className="details-text">
            <span className="video-name">{mainVideo.name}</span>
            <span className="video-meta">
              {mainVideo.width}×{mainVideo.height} • {mainVideo.format.toUpperCase()} • {mainVideo.fps.toFixed(1)}fps
            </span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <Button
          size="small"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          更换
        </Button>
      </div>
    )
  }

  return (
    <div className="main-video-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div className="upload-progress">
            <Progress
              theme="circle"
              percentage={progress?.percent || 0}
              size="small"
              status="active"
            />
            <span className="progress-text">
              {progress ? `${formatFileSize(progress.loaded)} / ${formatFileSize(progress.total)}` : '上传中...'}
            </span>
          </div>
        ) : (
          <>
            <UploadIcon size="48px" />
            <span className="upload-title">上传主视频</span>
            <span className="upload-hint">点击或拖拽视频文件到此处</span>
            <span className="upload-formats">支持 MP4、MOV、AVI、WebM、MKV 格式</span>
          </>
        )}
      </div>
    </div>
  )
}
