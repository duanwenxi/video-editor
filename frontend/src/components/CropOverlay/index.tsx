import { useState, useRef, useEffect, useCallback } from 'react'
import type { CropArea } from '../../types/video'
import './index.less'

interface CropOverlayProps {
  videoWidth: number
  videoHeight: number
  containerWidth: number
  containerHeight: number
  cropArea: CropArea | null
  onChange: (area: CropArea) => void
  enabled?: boolean
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null

export default function CropOverlay({
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight,
  cropArea,
  onChange,
  enabled = true
}: CropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState<ResizeHandle>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialArea, setInitialArea] = useState<CropArea | null>(null)

  // 计算视频在容器中的实际显示尺寸和位置
  const videoAspect = videoWidth / videoHeight
  const containerAspect = containerWidth / containerHeight

  let displayWidth: number, displayHeight: number, offsetX: number, offsetY: number

  if (videoAspect > containerAspect) {
    displayWidth = containerWidth
    displayHeight = containerWidth / videoAspect
    offsetX = 0
    offsetY = (containerHeight - displayHeight) / 2
  } else {
    displayHeight = containerHeight
    displayWidth = containerHeight * videoAspect
    offsetX = (containerWidth - displayWidth) / 2
    offsetY = 0
  }

  const scale = displayWidth / videoWidth

  // 将视频坐标转换为容器坐标
  const toContainerCoords = (area: CropArea) => ({
    x: area.x * scale + offsetX,
    y: area.y * scale + offsetY,
    width: area.width * scale,
    height: area.height * scale
  })

  // 将容器坐标转换为视频坐标
  const toVideoCoords = (containerArea: { x: number; y: number; width: number; height: number }): CropArea => ({
    x: Math.round((containerArea.x - offsetX) / scale),
    y: Math.round((containerArea.y - offsetY) / scale),
    width: Math.round(containerArea.width / scale),
    height: Math.round(containerArea.height / scale)
  })

  // 限制裁剪框在视频范围内，并确保整数像素
  const clampArea = (area: CropArea): CropArea => {
    const minSize = 20
    // 先取整再限制范围
    let x = Math.round(area.x)
    let y = Math.round(area.y)
    let width = Math.round(area.width)
    let height = Math.round(area.height)

    width = Math.max(minSize, Math.min(width, videoWidth))
    height = Math.max(minSize, Math.min(height, videoHeight))
    x = Math.max(0, Math.min(x, videoWidth - width))
    y = Math.max(0, Math.min(y, videoHeight - height))

    return { x, y, width, height }
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, handle: ResizeHandle = null) => {
    if (!enabled || !cropArea) return
    e.preventDefault()
    e.stopPropagation()

    setDragStart({ x: e.clientX, y: e.clientY })
    setInitialArea(cropArea)

    if (handle) {
      setResizing(handle)
    } else {
      setDragging(true)
    }
  }, [enabled, cropArea])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!initialArea) return

    const dx = (e.clientX - dragStart.x) / scale
    const dy = (e.clientY - dragStart.y) / scale

    let newArea: CropArea

    if (dragging) {
      newArea = clampArea({
        ...initialArea,
        x: initialArea.x + dx,
        y: initialArea.y + dy
      })
    } else if (resizing) {
      newArea = { ...initialArea }

      switch (resizing) {
        case 'nw':
          newArea.x = initialArea.x + dx
          newArea.y = initialArea.y + dy
          newArea.width = initialArea.width - dx
          newArea.height = initialArea.height - dy
          break
        case 'n':
          newArea.y = initialArea.y + dy
          newArea.height = initialArea.height - dy
          break
        case 'ne':
          newArea.y = initialArea.y + dy
          newArea.width = initialArea.width + dx
          newArea.height = initialArea.height - dy
          break
        case 'e':
          newArea.width = initialArea.width + dx
          break
        case 'se':
          newArea.width = initialArea.width + dx
          newArea.height = initialArea.height + dy
          break
        case 's':
          newArea.height = initialArea.height + dy
          break
        case 'sw':
          newArea.x = initialArea.x + dx
          newArea.width = initialArea.width - dx
          newArea.height = initialArea.height + dy
          break
        case 'w':
          newArea.x = initialArea.x + dx
          newArea.width = initialArea.width - dx
          break
      }

      newArea = clampArea(newArea)
    } else {
      return
    }

    onChange(newArea)
  }, [dragging, resizing, dragStart, initialArea, scale, onChange])

  const handleMouseUp = useCallback(() => {
    setDragging(false)
    setResizing(null)
    setInitialArea(null)
  }, [])

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp])

  // 初始化裁剪框
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!enabled || cropArea) return

    const rect = overlayRef.current?.getBoundingClientRect()
    if (!rect) return

    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // 检查点击是否在视频区域内
    if (clickX < offsetX || clickX > offsetX + displayWidth ||
        clickY < offsetY || clickY > offsetY + displayHeight) {
      return
    }

    // 创建默认裁剪框（视频中心，1/4大小）
    const defaultWidth = videoWidth / 2
    const defaultHeight = videoHeight / 2
    const defaultX = (videoWidth - defaultWidth) / 2
    const defaultY = (videoHeight - defaultHeight) / 2

    onChange({
      x: Math.round(defaultX),
      y: Math.round(defaultY),
      width: Math.round(defaultWidth),
      height: Math.round(defaultHeight)
    })
  }

  if (!enabled) return null

  const containerCropArea = cropArea ? toContainerCoords(cropArea) : null

  return (
    <div
      ref={overlayRef}
      className={`crop-overlay ${cropArea ? 'has-crop' : ''}`}
      onClick={handleOverlayClick}
    >
      {containerCropArea && (
        <div
          className={`crop-box ${dragging ? 'dragging' : ''} ${resizing ? 'resizing' : ''}`}
          style={{
            left: containerCropArea.x,
            top: containerCropArea.y,
            width: containerCropArea.width,
            height: containerCropArea.height
          }}
          onMouseDown={(e) => handleMouseDown(e)}
        >
          {/* 边框 */}
          <div className="crop-border" />
          
          {/* 网格线 */}
          <div className="crop-grid">
            <div className="grid-line horizontal" style={{ top: '33.33%' }} />
            <div className="grid-line horizontal" style={{ top: '66.66%' }} />
            <div className="grid-line vertical" style={{ left: '33.33%' }} />
            <div className="grid-line vertical" style={{ left: '66.66%' }} />
          </div>

          {/* 调整手柄 */}
          <div className="resize-handle nw" onMouseDown={(e) => handleMouseDown(e, 'nw')} />
          <div className="resize-handle n" onMouseDown={(e) => handleMouseDown(e, 'n')} />
          <div className="resize-handle ne" onMouseDown={(e) => handleMouseDown(e, 'ne')} />
          <div className="resize-handle e" onMouseDown={(e) => handleMouseDown(e, 'e')} />
          <div className="resize-handle se" onMouseDown={(e) => handleMouseDown(e, 'se')} />
          <div className="resize-handle s" onMouseDown={(e) => handleMouseDown(e, 's')} />
          <div className="resize-handle sw" onMouseDown={(e) => handleMouseDown(e, 'sw')} />
          <div className="resize-handle w" onMouseDown={(e) => handleMouseDown(e, 'w')} />

          {/* 尺寸信息 */}
          <div className="crop-info">
            {cropArea?.width} × {cropArea?.height}
          </div>
        </div>
      )}

      {!cropArea && (
        <div className="crop-hint">点击创建裁剪框</div>
      )}
    </div>
  )
}
