import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { CloseIcon } from 'tdesign-icons-react'
import type { VideoFile, OverlayPosition } from '../../types/video'
import './index.less'

interface OverlayVideoProps {
  video: VideoFile
  position: OverlayPosition
  containerWidth: number
  containerHeight: number
  mainVideoWidth: number
  mainVideoHeight: number
  mainVideoTime: number  // 主视频当前时间
  mainVideoDuration: number  // 主视频总时长
  overlayStartTime: number  // 叠加视频在主视频中的开始时间
  onPositionChange: (pos: OverlayPosition) => void
  onRemove?: () => void
}

export interface OverlayVideoRef {
  play: () => void
  pause: () => void
  reset: () => void
}

const OverlayVideo = forwardRef<OverlayVideoRef, OverlayVideoProps>(({
  video,
  position,
  containerWidth,
  containerHeight,
  mainVideoWidth,
  mainVideoHeight,
  mainVideoTime,
  mainVideoDuration,
  overlayStartTime,
  onPositionChange,
  onRemove
}, ref) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // 计算缩放比例
  const scaleX = containerWidth / mainVideoWidth
  const scaleY = containerHeight / mainVideoHeight

  // 将视频坐标转换为容器坐标
  const displayX = position.x * scaleX
  const displayY = position.y * scaleY
  const displayWidth = position.width * scaleX
  const displayHeight = position.height * scaleY

  // 计算叠加视频是否应该显示（主视频时间在叠加范围内）
  // 结束时间不能超过主视频时长
  const overlayEndTime = Math.min(overlayStartTime + video.duration, mainVideoDuration)
  const shouldShow = mainVideoTime >= overlayStartTime && mainVideoTime < overlayEndTime

  // 同步叠加视频的播放时间与主视频时间
  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl) return

    if (shouldShow) {
      // 计算叠加视频应该在的时间点
      const expectedOverlayTime = mainVideoTime - overlayStartTime
      
      // 非播放状态下（逐帧模式），始终强制同步时间
      // 播放状态下，允许一定误差避免频繁 seek 导致卡顿
      if (!isPlaying) {
        videoEl.currentTime = expectedOverlayTime
      } else {
        const currentOverlayTime = videoEl.currentTime
        if (Math.abs(currentOverlayTime - expectedOverlayTime) > 0.3) {
          videoEl.currentTime = expectedOverlayTime
        }
      }
      
      // 根据播放状态控制叠加视频
      if (isPlaying && videoEl.paused) {
        videoEl.play().catch(() => {})
      } else if (!isPlaying && !videoEl.paused) {
        videoEl.pause()
      }
    } else {
      // 不在显示范围内，暂停叠加视频
      if (!videoEl.paused) {
        videoEl.pause()
      }
    }
  }, [mainVideoTime, overlayStartTime, shouldShow, isPlaying])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    })
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height
    })
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStart.x) / scaleX
        const deltaY = (e.clientY - dragStart.y) / scaleY

        let newX = Math.round(dragStart.posX + deltaX)
        let newY = Math.round(dragStart.posY + deltaY)

        // 限制在主视频范围内
        newX = Math.max(0, Math.min(newX, mainVideoWidth - position.width))
        newY = Math.max(0, Math.min(newY, mainVideoHeight - position.height))

        onPositionChange({
          ...position,
          x: newX,
          y: newY
        })
      }

      if (isResizing) {
        const deltaX = (e.clientX - resizeStart.x) / scaleX
        const deltaY = (e.clientY - resizeStart.y) / scaleY

        let newWidth = Math.round(resizeStart.width + deltaX)
        let newHeight = Math.round(resizeStart.height + deltaY)

        // 限制最小尺寸
        newWidth = Math.max(50, newWidth)
        newHeight = Math.max(50, newHeight)

        // 限制不超出主视频
        newWidth = Math.min(newWidth, mainVideoWidth - position.x)
        newHeight = Math.min(newHeight, mainVideoHeight - position.y)

        onPositionChange({
          ...position,
          width: newWidth,
          height: newHeight
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragStart, resizeStart, position, scaleX, scaleY, mainVideoWidth, mainVideoHeight, onPositionChange])

  // 暴露控制方法给父组件
  useImperativeHandle(ref, () => ({
    play: () => {
      setIsPlaying(true)
    },
    pause: () => {
      setIsPlaying(false)
    },
    reset: () => {
      const videoEl = videoRef.current
      if (!videoEl) return
      videoEl.currentTime = 0
    }
  }), [])

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onRemove?.()
  }

  return (
    <div
      ref={overlayRef}
      className={`overlay-video ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${!shouldShow ? 'hidden' : ''}`}
      style={{
        left: displayX,
        top: displayY,
        width: displayWidth,
        height: displayHeight,
        opacity: shouldShow ? 1 : 0,
        pointerEvents: shouldShow ? 'auto' : 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      <video
        ref={videoRef}
        src={video.url}
        muted
      />
      <div className="overlay-border" />
      <div className="overlay-label">{video.name}</div>
      
      {/* 删除按钮 */}
      <button className="remove-btn" onClick={handleRemove} title="移除叠加视频">
        <CloseIcon size="14px" />
      </button>
      
      {/* 调整大小手柄 */}
      <div 
        className="resize-handle se"
        onMouseDown={handleResizeMouseDown}
      />
      <div 
        className="resize-handle sw"
        onMouseDown={handleResizeMouseDown}
      />
      <div 
        className="resize-handle ne"
        onMouseDown={handleResizeMouseDown}
      />
      <div 
        className="resize-handle nw"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  )
})

export default OverlayVideo
