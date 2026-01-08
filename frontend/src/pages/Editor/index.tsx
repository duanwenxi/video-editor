import { useState, useEffect } from 'react'
import MainVideoUploader from '../../components/MainVideoUploader'
import MaterialPanel from '../../components/MaterialPanel'
import VideoPlayer from '../../components/VideoPlayer'
import CropOverlay from '../../components/CropOverlay'
import PropertyPanel from '../../components/PropertyPanel'
import type { VideoFile, CropArea, OverlayPosition, EditorMode } from '../../types/video'
import './index.less'

export default function Editor() {
  // 所有素材（包括上传的和生成的）
  const [allVideos, setAllVideos] = useState<VideoFile[]>([])
  
  // 主视频
  const [mainVideo, setMainVideo] = useState<VideoFile | null>(null)
  
  // 当前预览的视频
  const [previewVideo, setPreviewVideo] = useState<VideoFile | null>(null)
  
  // 当前选中用于拼接的素材
  const [selectedMaterial, setSelectedMaterial] = useState<VideoFile | null>(null)
  
  // 编辑模式
  const [mode, setMode] = useState<EditorMode>('crop')
  
  // 时间状态
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  
  // 裁剪状态
  const [cropArea, setCropArea] = useState<CropArea | null>(null)
  
  // 叠加状态
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition | null>(null)
  
  // 视频显示尺寸（从 VideoPlayer 获取）
  const [videoDisplaySize, setVideoDisplaySize] = useState({ width: 0, height: 0 })

  // 当主视频切换时重置状态
  useEffect(() => {
    if (mainVideo) {
      setStartTime(0)
      setEndTime(mainVideo.duration)
      setCropArea(null)
      setDuration(mainVideo.duration)
      setOverlayPosition(null)
      setSelectedMaterial(null)
      setPreviewVideo(mainVideo)
    }
  }, [mainVideo?.id])

  const handleDurationChange = (dur: number) => {
    setDuration(dur)
    if (endTime === 0 || endTime > dur) {
      setEndTime(dur)
    }
  }

  const handleMainVideoUpload = (video: VideoFile) => {
    // 添加到素材库
    setAllVideos(prev => {
      const exists = prev.find(v => v.id === video.id)
      if (exists) return prev
      return [video, ...prev]
    })
    // 只有在没有主视频时才设为主视频
    if (!mainVideo) {
      setMainVideo(video)
    }
  }

  const handleSetMainVideo = (video: VideoFile) => {
    setMainVideo(video)
  }

  const handleMaterialSelect = (video: VideoFile) => {
    if (mode === 'merge' && video.id !== mainVideo?.id) {
      setSelectedMaterial(video)
      // 设置默认叠加位置
      if (mainVideo) {
        setOverlayPosition({
          x: 0,
          y: 0,
          width: Math.min(video.width, Math.round(mainVideo.width / 4)),
          height: Math.min(video.height, Math.round(mainVideo.height / 4))
        })
      }
    }
  }

  const handlePreviewVideo = (video: VideoFile) => {
    setPreviewVideo(video)
  }

  const handleVideoExported = (video: VideoFile) => {
    console.log('handleVideoExported called with:', video)
    setAllVideos(prev => [...prev, video])
  }

  const handleDeleteVideo = (video: VideoFile) => {
    // 从素材库删除
    setAllVideos(prev => prev.filter(v => v.id !== video.id))
    
    // 如果删除的是主视频，清空主视频
    if (mainVideo?.id === video.id) {
      setMainVideo(null)
      setPreviewVideo(null)
    }
    
    // 如果删除的是预览视频，切换到主视频
    if (previewVideo?.id === video.id) {
      setPreviewVideo(mainVideo)
    }
    
    // 如果删除的是选中的叠加素材，清空叠加
    if (selectedMaterial?.id === video.id) {
      setSelectedMaterial(null)
      setOverlayPosition(null)
    }
  }

  const handleModeChange = (newMode: EditorMode) => {
    setMode(newMode)
    if (newMode === 'crop') {
      setSelectedMaterial(null)
      setOverlayPosition(null)
      // 裁剪模式默认创建全画面裁剪框
      if (mainVideo && !cropArea) {
        setCropArea({
          x: 0,
          y: 0,
          width: mainVideo.width,
          height: mainVideo.height
        })
      }
    }
    // 切换模式时预览主视频
    if (mainVideo) {
      setPreviewVideo(mainVideo)
    }
  }

  // 快捷键 S：设置开始时间，E：设置结束时间（仅裁剪模式）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      if (!mainVideo) return
      
      if (e.code === 'KeyS') {
        e.preventDefault()
        // S 键：设置开始时间为当前进度条时间
        const newStart = Math.max(0, Math.min(currentTime, mainVideo.duration - 0.1))
        setStartTime(newStart)
        
        // 拼接模式下自动计算结束时间
        if (mode === 'merge' && selectedMaterial) {
          const overlayDuration = selectedMaterial.duration
          const newEnd = Math.min(newStart + overlayDuration, mainVideo.duration)
          setEndTime(newEnd)
        }
      } else if (e.code === 'KeyE' && mode === 'crop') {
        e.preventDefault()
        // E 键：仅在裁剪模式下，设置结束时间为当前进度条时间
        const newEnd = Math.max(currentTime, startTime + 0.1)
        setEndTime(Math.min(newEnd, mainVideo.duration))
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mainVideo, currentTime, startTime, endTime, mode, selectedMaterial])

  const handleDragStart = (video: VideoFile) => {
    // 保存拖拽的视频到全局变量，供 drop 事件使用
    (window as any).__draggedVideo = video
  }

  const handleOverlayDrop = (video: VideoFile, position: OverlayPosition) => {
    if (video.id !== mainVideo?.id) {
      setSelectedMaterial(video)
      setOverlayPosition(position)
    }
  }

  const handleOverlayRemove = () => {
    setSelectedMaterial(null)
    setOverlayPosition(null)
  }

  // 当前显示的视频（预览视频或主视频）
  const displayVideo = previewVideo || mainVideo

  return (
    <div className="editor">
      {/* 顶部导航栏 */}
      <header className="editor-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">V</span>
            <span className="logo-text">Video Editor</span>
          </div>
        </div>
        <div className="header-center">
          {/* 预留中间区域 */}
        </div>
        <div className="header-right">
          {/* 预留导出按钮 */}
        </div>
      </header>

      <div className="editor-body">
        {/* 左侧素材面板 */}
        <aside className="sidebar left-sidebar">
          <MaterialPanel
            videos={allVideos}
            mainVideo={mainVideo}
            selectedVideo={selectedMaterial}
            previewVideo={previewVideo}
            onSelect={handleMaterialSelect}
            onPreview={handlePreviewVideo}
            onSetMainVideo={handleSetMainVideo}
            onDragStart={handleDragStart}
            onUpload={handleMainVideoUpload}
            onDelete={handleDeleteVideo}
            mode={mode}
          />
        </aside>

        {/* 中央区域 */}
        <main className="main-area">
          {/* 视频预览区 */}
          <div className="preview-area">
            {!mainVideo ? (
              <MainVideoUploader
                mainVideo={null}
                onUpload={handleMainVideoUpload}
              />
            ) : (
              <VideoPlayer
                video={displayVideo}
                isMainVideo={!!(displayVideo && mainVideo && displayVideo.id === mainVideo.id)}
                startTime={startTime}
                endTime={endTime}
                onDurationChange={handleDurationChange}
                onTimeUpdate={setCurrentTime}
                onVideoSizeChange={setVideoDisplaySize}
                mode={mode}
                overlayVideo={selectedMaterial}
                overlayPosition={overlayPosition}
                onOverlayPositionChange={setOverlayPosition}
                onOverlayDrop={handleOverlayDrop}
                onOverlayRemove={handleOverlayRemove}
              >
                {/* 裁剪模式下显示裁剪框 - 仅主视频显示 */}
                {mode === 'crop' && videoDisplaySize.width > 0 && displayVideo && 
                 displayVideo.id === mainVideo?.id && (
                  <CropOverlay
                    videoWidth={displayVideo.width}
                    videoHeight={displayVideo.height}
                    containerWidth={videoDisplaySize.width}
                    containerHeight={videoDisplaySize.height}
                    cropArea={cropArea}
                    onChange={setCropArea}
                    enabled={true}
                  />
                )}
              </VideoPlayer>
            )}
          </div>
        </main>

        {/* 右侧属性面板 */}
        <aside className="sidebar right-sidebar">
          <div className="sidebar-header">
            <span>属性设置</span>
          </div>
          <div className="sidebar-content">
            <PropertyPanel
              mainVideo={mainVideo}
              selectedMaterial={selectedMaterial}
              mode={mode}
              onModeChange={handleModeChange}
              currentTime={currentTime}
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              cropArea={cropArea}
              overlayPosition={overlayPosition}
              onCropAreaChange={setCropArea}
              onOverlayPositionChange={setOverlayPosition}
              onVideoExported={handleVideoExported}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
