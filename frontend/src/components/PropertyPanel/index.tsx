import { useState } from 'react'
import { InputNumber, Button, Divider, Progress, MessagePlugin, Input } from 'tdesign-react'
import { CutIcon, LayersIcon, CheckIcon } from 'tdesign-icons-react'
import type { VideoFile, CropArea, OverlayPosition, EditorMode, ProcessTask } from '../../types/video'
import { formatTime } from '../../utils/timeFormat'
import { cropVideo, overlayVideo, getTaskStatus, getVideoUrl } from '../../services/videoApi'
import './index.less'

// 解析时间字符串为秒数，支持 HH:MM:SS.ms 或 MM:SS.ms 格式
function parseTimeInput(timeStr: string): number {
  const trimmed = timeStr.trim()
  if (!trimmed) return 0
  
  // 分离毫秒部分
  const [mainPart, msPart] = trimmed.split('.')
  const ms = msPart ? parseInt(msPart.padEnd(2, '0').slice(0, 2), 10) / 100 : 0
  
  const parts = mainPart.split(':').map(Number)
  
  if (parts.some(isNaN)) return 0
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2] + ms
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1] + ms
  } else if (parts.length === 1) {
    return parts[0] + ms
  }
  
  return 0
}

interface PropertyPanelProps {
  mainVideo: VideoFile | null
  selectedMaterial: VideoFile | null
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  currentTime?: number  // 可选，用于显示当前时间
  startTime: number
  endTime: number
  onStartTimeChange: (time: number) => void
  onEndTimeChange: (time: number) => void
  cropArea: CropArea | null
  overlayPosition: OverlayPosition | null
  onCropAreaChange: (area: CropArea | null) => void
  onOverlayPositionChange: (pos: OverlayPosition | null) => void
  onVideoExported: (video: VideoFile) => void
}

export default function PropertyPanel({
  mainVideo,
  selectedMaterial,
  mode,
  onModeChange,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  cropArea,
  overlayPosition,
  onCropAreaChange,
  onOverlayPositionChange,
  onVideoExported
}: PropertyPanelProps) {
  const [processing, setProcessing] = useState(false)
  const [task, setTask] = useState<ProcessTask | null>(null)
  
  // 时间输入状态
  const [startTimeInput, setStartTimeInput] = useState('')
  const [endTimeInput, setEndTimeInput] = useState('')
  const [durationInput, setDurationInput] = useState('')

  const duration = endTime - startTime
  const overlayDuration = selectedMaterial?.duration || 0

  // 裁剪模式：处理开始时间输入
  const handleStartTimeBlur = () => {
    if (!mainVideo) return
    const parsed = parseTimeInput(startTimeInput)
    const newStart = Math.max(0, Math.min(parsed, endTime - 0.1))
    onStartTimeChange(newStart)
    setStartTimeInput('')
  }

  // 裁剪模式：处理结束时间输入
  const handleEndTimeBlur = () => {
    if (!mainVideo) return
    const parsed = parseTimeInput(endTimeInput)
    const newEnd = Math.max(startTime + 0.1, Math.min(parsed, mainVideo.duration))
    onEndTimeChange(newEnd)
    setEndTimeInput('')
  }

  // 裁剪模式：处理时长输入
  const handleDurationBlur = () => {
    if (!mainVideo) return
    const parsed = parseTimeInput(durationInput)
    if (parsed > 0) {
      const newEnd = Math.min(startTime + parsed, mainVideo.duration)
      onEndTimeChange(newEnd)
    }
    setDurationInput('')
  }

  // 拼接模式：处理开始时间输入，自动计算结束时间
  const handleMergeStartTimeBlur = () => {
    if (!mainVideo) return
    // 如果没有输入内容，不做任何修改
    if (!startTimeInput.trim()) {
      setStartTimeInput('')
      return
    }
    const parsed = parseTimeInput(startTimeInput)
    const newStart = Math.max(0, Math.min(parsed, mainVideo.duration - 0.1))
    onStartTimeChange(newStart)
    // 根据叠加视频时长自动计算结束时间
    if (overlayDuration > 0) {
      const newEnd = Math.min(newStart + overlayDuration, mainVideo.duration)
      onEndTimeChange(newEnd)
    }
    setStartTimeInput('')
  }

  // 裁剪区域临时输入值
  const [cropInputs, setCropInputs] = useState<{ [key: string]: string }>({})

  const handleCropInputChange = (field: keyof CropArea, value: number | string | undefined) => {
    // 输入时只更新临时值，不做校验
    setCropInputs(prev => ({ ...prev, [field]: String(value ?? '') }))
  }

  const handleCropInputBlur = (field: keyof CropArea) => {
    if (!cropArea || !mainVideo) return
    
    const inputValue = cropInputs[field]
    if (inputValue === undefined || inputValue === '') {
      // 没有输入，清除临时值
      setCropInputs(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
      return
    }
    
    const numValue = Math.round(parseInt(inputValue, 10))
    if (isNaN(numValue)) {
      setCropInputs(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
      return
    }
    
    const newArea = { ...cropArea }
    
    if (field === 'x') {
      newArea.x = Math.max(0, Math.min(numValue, mainVideo.width - newArea.width))
    } else if (field === 'y') {
      newArea.y = Math.max(0, Math.min(numValue, mainVideo.height - newArea.height))
    } else if (field === 'width') {
      newArea.width = Math.max(20, Math.min(numValue, mainVideo.width - newArea.x))
    } else if (field === 'height') {
      newArea.height = Math.max(20, Math.min(numValue, mainVideo.height - newArea.y))
    }
    
    onCropAreaChange(newArea)
    // 清除临时输入值
    setCropInputs(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const getCropValue = (field: keyof CropArea): number | string => {
    if (cropInputs[field] !== undefined) {
      return cropInputs[field]
    }
    return cropArea ? Math.round(cropArea[field]) : 0
  }

  const handleCropChange = (field: keyof CropArea, value: number | string | undefined) => {
    if (!cropArea || !mainVideo) return
    
    const numValue = typeof value === 'number' ? Math.round(value) : parseInt(String(value), 10)
    if (isNaN(numValue)) return
    
    const newArea = { ...cropArea }
    
    if (field === 'x') {
      newArea.x = Math.round(Math.max(0, Math.min(numValue, mainVideo.width - newArea.width)))
    } else if (field === 'y') {
      newArea.y = Math.round(Math.max(0, Math.min(numValue, mainVideo.height - newArea.height)))
    } else if (field === 'width') {
      newArea.width = Math.round(Math.max(20, Math.min(numValue, mainVideo.width - newArea.x)))
    } else if (field === 'height') {
      newArea.height = Math.round(Math.max(20, Math.min(numValue, mainVideo.height - newArea.y)))
    }
    
    onCropAreaChange(newArea)
  }

  const handleOverlayChange = (field: keyof OverlayPosition, value: number | string | undefined) => {
    if (!overlayPosition || !mainVideo) return
    
    const numValue = typeof value === 'number' ? value : parseInt(String(value), 10)
    if (isNaN(numValue)) return
    
    const newPos = { ...overlayPosition, [field]: Math.max(0, numValue) }
    onOverlayPositionChange(newPos)
  }

  const pollTaskStatus = async (taskId: string, format: string, sourceType: 'crop' | 'merge') => {
    try {
      const result = await getTaskStatus(taskId)
      console.log('Task status result:', result)
      
      if (result.success && result.data) {
        setTask(result.data)
        
        if (result.data.status === 'processing' || result.data.status === 'pending') {
          setTimeout(() => pollTaskStatus(taskId, format, sourceType), 1000)
        } else if (result.data.status === 'completed') {
          setProcessing(false)
          
          // 使用 resultFileId 或 taskId 作为文件ID
          const fileId = result.data.resultFileId || taskId
          console.log('Task completed, fileId:', fileId)
          
          // 生成文件名：类型_X位置_Y位置_时间戳
          const timestamp = new Date().toLocaleTimeString('zh-CN', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          }).replace(/:/g, '')
          
          // 格式化开始时间为文件名友好格式 (MM-SS-ms)
          const startMinutes = Math.floor(startTime / 60)
          const startSecs = Math.floor(startTime % 60)
          const startMs = Math.floor((startTime % 1) * 100)
          const startTimeStr = `${String(startMinutes).padStart(2, '0')}-${String(startSecs).padStart(2, '0')}-${String(startMs).padStart(2, '0')}`
          
          let fileName: string
          if (sourceType === 'crop') {
            const x = cropArea?.x || 0
            const y = cropArea?.y || 0
            fileName = `裁剪_${x}_${y}_${timestamp}_${startTimeStr}.${format}`
          } else {
            const x = overlayPosition?.x || 0
            const y = overlayPosition?.y || 0
            fileName = `拼接_${x}_${y}_${timestamp}_${startTimeStr}.${format}`
          }
          
          // 创建新的视频文件对象
          const newVideo: VideoFile = {
            id: fileId,
            name: fileName,
            size: 0,
            duration: endTime - startTime,
            width: cropArea?.width || mainVideo!.width,
            height: cropArea?.height || mainVideo!.height,
            fps: mainVideo!.fps,
            frameCount: Math.round((endTime - startTime) * mainVideo!.fps),
            format: format,
            url: getVideoUrl(fileId),
            isMain: false,
            sourceType: sourceType,
            parentId: mainVideo!.id
          }
          
          console.log('New video to export:', newVideo)
          onVideoExported(newVideo)
          setTask(null)
          
          // 消息提示放最后，即使失败也不影响主流程
          try {
            MessagePlugin.success('处理完成！已添加到素材库')
          } catch (e) {
            console.log('Message display failed, but video exported successfully')
          }
        } else if (result.data.status === 'failed') {
          setProcessing(false)
          setTask(null)
          try {
            MessagePlugin.error(result.data.error || '处理失败')
          } catch (e) {
            console.error('Processing failed:', result.data.error)
          }
        }
      } else {
        console.error('Failed to get task status:', result.error)
      }
    } catch (error) {
      console.error('Error polling task status:', error)
      setProcessing(false)
      setTask(null)
    }
  }

  const handleConfirmCrop = async () => {
    if (!mainVideo) return
    
    setProcessing(true)
    setTask({ taskId: '', status: 'pending', progress: 0 })

    const result = await cropVideo({
      file_id: mainVideo.id,
      start_time: startTime,
      end_time: endTime,
      crop_area: cropArea || undefined,
      output_format: mainVideo.format
    })

    if (result.success && result.data) {
      setTask(result.data)
      pollTaskStatus(result.data.taskId, mainVideo.format, 'crop')
    } else {
      setProcessing(false)
      setTask(null)
      MessagePlugin.error(result.error || '提交任务失败')
    }
  }

  const handleConfirmOverlay = async () => {
    if (!mainVideo || !selectedMaterial || !overlayPosition) {
      MessagePlugin.warning('请先选择要叠加的素材')
      return
    }
    
    setProcessing(true)
    setTask({ taskId: '', status: 'pending', progress: 0 })

    const result = await overlayVideo({
      main_file_id: mainVideo.id,
      overlay_file_id: selectedMaterial.id,
      start_time: startTime,
      end_time: endTime,
      position: overlayPosition,
      output_format: mainVideo.format
    })

    if (result.success && result.data) {
      setTask(result.data)
      pollTaskStatus(result.data.taskId, mainVideo.format, 'merge')
    } else {
      setProcessing(false)
      setTask(null)
      MessagePlugin.error(result.error || '提交任务失败')
    }
  }

  const handleResetCrop = () => {
    if (!mainVideo) return
    onCropAreaChange({
      x: 0,
      y: 0,
      width: mainVideo.width,
      height: mainVideo.height
    })
  }

  if (!mainVideo) {
    return (
      <div className="property-panel empty">
        <p>请先上传主视频</p>
      </div>
    )
  }

  return (
    <div className="property-panel">
      {/* 模式切换 */}
      <div className="mode-switcher">
        <button
          className={`mode-btn ${mode === 'crop' ? 'active' : ''}`}
          onClick={() => onModeChange('crop')}
        >
          <CutIcon size="16px" />
          <span>裁剪模式</span>
        </button>
        <button
          className={`mode-btn ${mode === 'merge' ? 'active' : ''}`}
          onClick={() => onModeChange('merge')}
        >
          <LayersIcon size="16px" />
          <span>拼接模式</span>
        </button>
      </div>

      <Divider />

      {/* 时间信息 */}
      <div className="panel-section">
        <h4>时间选择</h4>
        
        {mode === 'crop' ? (
          /* 裁剪模式：可编辑开始、结束、时长 */
          <div className="time-inputs">
            <div className="time-input-row">
              <span className="label">开始</span>
              <Input
                size="small"
                placeholder={formatTime(startTime, true)}
                value={startTimeInput}
                onChange={(v) => setStartTimeInput(v as string)}
                onBlur={handleStartTimeBlur}
                onEnter={handleStartTimeBlur}
              />
            </div>
            <div className="time-input-row">
              <span className="label">结束</span>
              <Input
                size="small"
                placeholder={formatTime(endTime, true)}
                value={endTimeInput}
                onChange={(v) => setEndTimeInput(v as string)}
                onBlur={handleEndTimeBlur}
                onEnter={handleEndTimeBlur}
              />
            </div>
            <div className="time-input-row">
              <span className="label">时长</span>
              <Input
                size="small"
                placeholder={formatTime(duration, true)}
                value={durationInput}
                onChange={(v) => setDurationInput(v as string)}
                onBlur={handleDurationBlur}
                onEnter={handleDurationBlur}
              />
            </div>
            <p className="time-hint">格式：MM:SS.ms 或 HH:MM:SS.ms</p>
            <p className="time-hint">
              <span className="shortcut-hint">
                快捷键：<kbd>S</kbd> 开始时间 <kbd>E</kbd> 结束时间
              </span>
            </p>
          </div>
        ) : (
          /* 拼接模式：可编辑开始时间，自动计算结束和时长 */
          <div className="time-inputs">
            <div className="time-input-row">
              <span className="label">开始</span>
              <Input
                size="small"
                placeholder={formatTime(startTime, true)}
                value={startTimeInput}
                onChange={(v) => setStartTimeInput(v as string)}
                onBlur={handleMergeStartTimeBlur}
                onEnter={handleMergeStartTimeBlur}
              />
            </div>
            <div className="time-input-row readonly">
              <span className="label">结束</span>
              <span className="value">{formatTime(Math.min(startTime + overlayDuration, mainVideo.duration), true)}</span>
              <span className="auto-tag">自动</span>
            </div>
            <div className="time-input-row readonly">
              <span className="label">时长</span>
              <span className="value">{formatTime(Math.min(overlayDuration, mainVideo.duration - startTime), true)}</span>
              <span className="auto-tag">叠加视频</span>
            </div>
            <p className="time-hint">
              <span className="shortcut-hint">
                快捷键：<kbd>S</kbd> 设置开始时间
              </span>
            </p>
          </div>
        )}
      </div>

      <Divider />

      {/* 裁剪模式 */}
      {mode === 'crop' && (
        <div className="panel-section">
          <h4>区域裁剪</h4>
          
          {cropArea ? (
            <div className="crop-inputs">
              <div className="input-row">
                <div className="input-group">
                  <label>X</label>
                  <InputNumber
                    size="small"
                    theme="normal"
                    value={getCropValue('x')}
                    min={0}
                    step={1}
                    decimalPlaces={0}
                    onChange={(v) => handleCropInputChange('x', v)}
                    onBlur={() => handleCropInputBlur('x')}
                  />
                </div>
                <div className="input-group">
                  <label>Y</label>
                  <InputNumber
                    size="small"
                    theme="normal"
                    value={getCropValue('y')}
                    min={0}
                    step={1}
                    decimalPlaces={0}
                    onChange={(v) => handleCropInputChange('y', v)}
                    onBlur={() => handleCropInputBlur('y')}
                  />
                </div>
              </div>
              <div className="input-row">
                <div className="input-group">
                  <label>宽度</label>
                  <InputNumber
                    size="small"
                    theme="normal"
                    value={getCropValue('width')}
                    min={1}
                    step={1}
                    decimalPlaces={0}
                    onChange={(v) => handleCropInputChange('width', v)}
                    onBlur={() => handleCropInputBlur('width')}
                  />
                </div>
                <div className="input-group">
                  <label>高度</label>
                  <InputNumber
                    size="small"
                    theme="normal"
                    value={getCropValue('height')}
                    min={1}
                    step={1}
                    decimalPlaces={0}
                    onChange={(v) => handleCropInputChange('height', v)}
                    onBlur={() => handleCropInputBlur('height')}
                  />
                </div>
              </div>
              <Button size="small" variant="outline" block onClick={handleResetCrop}>
                重置为全画面
              </Button>
            </div>
          ) : (
            <div className="crop-hint">
              点击视频画面创建裁剪框
            </div>
          )}
        </div>
      )}

      {/* 拼接模式 */}
      {mode === 'merge' && (
        <div className="panel-section">
          <h4>叠加素材</h4>
          {selectedMaterial ? (
            <div className="selected-material">
              <div className="material-info">
                <span className="name">{selectedMaterial.name}</span>
                <span className="meta">{selectedMaterial.width}×{selectedMaterial.height}</span>
              </div>
              
              {overlayPosition && (
                <div className="overlay-inputs">
                  <div className="input-row">
                    <div className="input-group">
                      <label>X位置</label>
                      <InputNumber
                        size="small"
                        theme="normal"
                        value={overlayPosition.x}
                        min={0}
                        max={mainVideo.width}
                        allowInputOverLimit={false}
                        onChange={(v) => handleOverlayChange('x', v)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Y位置</label>
                      <InputNumber
                        size="small"
                        theme="normal"
                        value={overlayPosition.y}
                        min={0}
                        max={mainVideo.height}
                        allowInputOverLimit={false}
                        onChange={(v) => handleOverlayChange('y', v)}
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>宽度</label>
                      <InputNumber
                        size="small"
                        theme="normal"
                        value={overlayPosition.width}
                        min={20}
                        allowInputOverLimit={false}
                        onChange={(v) => handleOverlayChange('width', v)}
                      />
                    </div>
                    <div className="input-group">
                      <label>高度</label>
                      <InputNumber
                        size="small"
                        theme="normal"
                        value={overlayPosition.height}
                        min={20}
                        allowInputOverLimit={false}
                        onChange={(v) => handleOverlayChange('height', v)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="merge-hint">
              从左侧素材库选择要叠加的视频
            </div>
          )}
        </div>
      )}

      <Divider />

      {/* 处理进度 */}
      {processing && task && (
        <div className="panel-section">
          <div className="progress-info">
            <Progress
              percentage={task.progress}
              status={task.status === 'failed' ? 'error' : 'active'}
              size="small"
            />
            <span className="status-text">
              {task.status === 'pending' && '等待处理...'}
              {task.status === 'processing' && `处理中 ${task.progress}%`}
              {task.status === 'completed' && '处理完成'}
              {task.status === 'failed' && '处理失败'}
            </span>
          </div>
        </div>
      )}

      {/* 确认按钮 */}
      <div className="panel-section">
        <Button
          theme="primary"
          block
          icon={<CheckIcon />}
          loading={processing}
          onClick={mode === 'crop' ? handleConfirmCrop : handleConfirmOverlay}
        >
          {mode === 'crop' ? '确认裁剪' : '确认拼接'}
        </Button>
        <p className="export-hint">
          处理后的视频将添加到左侧素材库
        </p>
      </div>
    </div>
  )
}
