import { useRef, useState, useEffect, useCallback } from 'react'
import { Slider } from 'tdesign-react'
import { PlayCircleIcon, PauseCircleIcon, Fullscreen1Icon } from 'tdesign-icons-react'
import { formatTime } from '../../utils/timeFormat'
import type { VideoFile, CropArea, OverlayPosition } from '../../types/video'
import OverlayVideo, { OverlayVideoRef } from '../OverlayVideo'
import './index.less'

interface VideoPlayerProps {
  video: VideoFile | null
  isMainVideo?: boolean  // 是否是主视频
  startTime?: number
  endTime?: number
  cropArea?: CropArea | null
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onVideoSizeChange?: (size: { width: number; height: number }) => void
  children?: React.ReactNode
  // 叠加相关
  overlayVideo?: VideoFile | null
  overlayPosition?: OverlayPosition | null
  onOverlayPositionChange?: (pos: OverlayPosition) => void
  onOverlayDrop?: (video: VideoFile, position: OverlayPosition) => void
  onOverlayRemove?: () => void
  mode?: 'crop' | 'merge'
}

export default function VideoPlayer({
  video,
  isMainVideo = true,
  startTime = 0,
  endTime,
  cropArea,
  onTimeUpdate,
  onDurationChange,
  onVideoSizeChange,
  children,
  overlayVideo,
  overlayPosition,
  onOverlayPositionChange,
  onOverlayDrop,
  onOverlayRemove,
  mode = 'crop'
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const overlayVideoRef = useRef<OverlayVideoRef>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [isDragOver, setIsDragOver] = useState(false)

  // 预览播放始终使用完整视频时长，裁剪时间只用于指定裁剪范围，不影响播放
  const effectiveStartTime = 0
  const effectiveEndTime = duration

  // 使用 requestAnimationFrame 实现平滑进度更新
  const updateProgress = useCallback(() => {
    if (videoRef.current && playing) {
      const time = videoRef.current.currentTime
      setCurrentTime(time)
      onTimeUpdate?.(time)

      if (effectiveEndTime && time >= effectiveEndTime) {
        // 播放结束，重置到开始位置
        videoRef.current.currentTime = effectiveStartTime
        overlayVideoRef.current?.pause()
        overlayVideoRef.current?.reset()
        videoRef.current.pause()
        setPlaying(false)
        return
      }

      animationFrameRef.current = requestAnimationFrame(updateProgress)
    }
  }, [playing, effectiveEndTime, effectiveStartTime, onTimeUpdate])

  // 播放状态变化时启动/停止动画帧
  useEffect(() => {
    if (playing) {
      animationFrameRef.current = requestAnimationFrame(updateProgress)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [playing, updateProgress])

  useEffect(() => {
    if (videoRef.current && video) {
      videoRef.current.load()
      setPlaying(false)
      setCurrentTime(0)
    }
  }, [video?.url])

  // 监听视频实际渲染尺寸
  useEffect(() => {
    const updateVideoSize = () => {
      if (videoRef.current) {
        const rect = videoRef.current.getBoundingClientRect()
        const newSize = { width: rect.width, height: rect.height }
        setVideoSize(newSize)
        onVideoSizeChange?.(newSize)
      }
    }
    
    updateVideoSize()
    window.addEventListener('resize', updateVideoSize)
    
    const videoEl = videoRef.current
    if (videoEl) {
      videoEl.addEventListener('loadeddata', updateVideoSize)
    }
    
    return () => {
      window.removeEventListener('resize', updateVideoSize)
      if (videoEl) {
        videoEl.removeEventListener('loadeddata', updateVideoSize)
      }
    }
  }, [video, onVideoSizeChange])

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration
      setDuration(dur)
      onDurationChange?.(dur)
    }
  }

  // 备用的 timeupdate 处理（用于非播放状态下的时间同步）
  const handleTimeUpdate = () => {
    if (videoRef.current && !playing) {
      const time = videoRef.current.currentTime
      setCurrentTime(time)
      onTimeUpdate?.(time)
    }
  }

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return

    if (playing) {
      videoRef.current.pause()
      // 同步暂停叠加视频
      overlayVideoRef.current?.pause()
    } else {
      // 检查是否需要重置到开始位置
      if (videoRef.current.currentTime < effectiveStartTime || 
          (effectiveEndTime && videoRef.current.currentTime >= effectiveEndTime)) {
        videoRef.current.currentTime = effectiveStartTime
        overlayVideoRef.current?.reset()
      }
      videoRef.current.play()
      // 同步播放叠加视频（如果在叠加时间范围内）
      overlayVideoRef.current?.play()
    }
    setPlaying(!playing)
  }, [playing, effectiveStartTime, effectiveEndTime])

  const handleSeek = (value: number | number[]) => {
    const time = Array.isArray(value) ? value[0] : value
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (value: number | number[]) => {
    const vol = Array.isArray(value) ? value[0] : value
    setVolume(vol)
    if (videoRef.current) {
      videoRef.current.volume = vol
    }
  }

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  // 逐帧前进/后退（假设视频为 30fps，每帧约 1/30 秒）
  const stepFrame = useCallback((direction: 'forward' | 'backward') => {
    if (!videoRef.current) return
    
    // 先暂停视频
    if (playing) {
      videoRef.current.pause()
      overlayVideoRef.current?.pause()
      setPlaying(false)
    }
    
    const frameTime = 1 / 30 // 约 33ms 一帧
    const currentT = videoRef.current.currentTime
    let newTime: number
    
    if (direction === 'forward') {
      newTime = Math.min(currentT + frameTime, effectiveEndTime || duration)
    } else {
      newTime = Math.max(currentT - frameTime, effectiveStartTime)
    }
    
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [playing, effectiveStartTime, effectiveEndTime, duration])

  // 键盘快捷键：空格暂停/播放，左右键逐帧
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        stepFrame('backward')
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        stepFrame('forward')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, stepFrame])

  // 处理拖放
  const handleDragOver = (e: React.DragEvent) => {
    if (mode !== 'merge') return
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (mode !== 'merge' || !video || !onOverlayDrop) return

    const videoId = e.dataTransfer.getData('video-id')
    if (!videoId) return

    // 计算放置位置
    const rect = videoContainerRef.current?.getBoundingClientRect()
    if (!rect) return

    const dropX = e.clientX - rect.left
    const dropY = e.clientY - rect.top

    // 转换为视频坐标
    const scaleX = video.width / videoSize.width
    const scaleY = video.height / videoSize.height

    const videoX = Math.round(dropX * scaleX)
    const videoY = Math.round(dropY * scaleY)

    // 通过事件获取拖拽的视频对象
    const draggedVideo = (window as any).__draggedVideo as VideoFile | undefined
    if (draggedVideo && draggedVideo.id === videoId) {
      // 使用素材视频的原始分辨率
      const overlayWidth = draggedVideo.width
      const overlayHeight = draggedVideo.height

      const position: OverlayPosition = {
        x: Math.max(0, Math.min(videoX - overlayWidth / 2, video.width - overlayWidth)),
        y: Math.max(0, Math.min(videoY - overlayHeight / 2, video.height - overlayHeight)),
        width: overlayWidth,
        height: overlayHeight
      }

      onOverlayDrop(draggedVideo, position)
    }
  }

  if (!video) {
    return (
      <div className="video-player-empty">
        <div className="empty-content">
          <span className="icon">+</span>
          <p>点击上传</p>
          <p className="hint">或将文件拖放到这里</p>
        </div>
      </div>
    )
  }

  return (
    <div className="video-player" ref={containerRef} tabIndex={0}>
      <div 
        className={`video-container ${isDragOver ? 'drag-over' : ''}`}
        ref={videoContainerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <video
          ref={videoRef}
          src={video.url}
          crossOrigin="anonymous"
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          onError={(e) => {
            console.error('Video load error:', e)
            console.error('Video src:', video.url)
          }}
          onClick={togglePlay}
        />
        
        {/* 裁剪框覆盖层 */}
        <div className="crop-overlay-wrapper" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: videoSize.width || '100%',
          height: videoSize.height || '100%',
          pointerEvents: 'auto'
        }}>
          {children}
          
          {/* 叠加视频 */}
          {mode === 'merge' && overlayVideo && overlayPosition && videoSize.width > 0 && (
            <OverlayVideo
              ref={overlayVideoRef}
              video={overlayVideo}
              position={overlayPosition}
              containerWidth={videoSize.width}
              containerHeight={videoSize.height}
              mainVideoWidth={video.width}
              mainVideoHeight={video.height}
              mainVideoTime={currentTime}
              mainVideoDuration={duration}
              overlayStartTime={startTime}
              onPositionChange={onOverlayPositionChange || (() => {})}
              onRemove={onOverlayRemove}
            />
          )}
        </div>
        
        {/* 裁剪区域遮罩 - 仅主视频显示 */}
        {isMainVideo && cropArea && (
          <div className="crop-mask">
            <div 
              className="crop-visible-area"
              style={{
                left: `${(cropArea.x / video.width) * 100}%`,
                top: `${(cropArea.y / video.height) * 100}%`,
                width: `${(cropArea.width / video.width) * 100}%`,
                height: `${(cropArea.height / video.height) * 100}%`,
              }}
            />
          </div>
        )}

        {/* 拖放提示 */}
        {isDragOver && (
          <div className="drop-hint">
            <span>释放以添加叠加视频</span>
          </div>
        )}
      </div>

      <div className="video-controls">
        <button className="control-btn play-btn" onClick={togglePlay}>
          {playing ? <PauseCircleIcon size="24px" /> : <PlayCircleIcon size="24px" />}
        </button>

        <div className="time-display">
          <span>{formatTime(currentTime, true)}</span>
          <span className="separator">/</span>
          <span>{formatTime(duration, true)}</span>
        </div>

        <div className="progress-bar">
          <Slider
            value={currentTime}
            min={0}
            max={duration || 100}
            step={0.001}
            onChange={handleSeek}
            tooltipProps={{ content: formatTime(currentTime, true) }}
          />
        </div>

        <div className="volume-control">
          <Slider
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
          />
        </div>

        <button className="control-btn" onClick={handleFullscreen}>
          <Fullscreen1Icon size="18px" />
        </button>
      </div>
    </div>
  )
}
