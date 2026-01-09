import cv2
import subprocess
import os
import tempfile
from typing import Optional, Callable, List, Dict

class VideoProcessor:
    """视频处理服务 - 封装 OpenCV 和 FFmpeg 操作"""
    
    def __init__(self):
        self.ffmpeg_path = 'ffmpeg'  # 假设 ffmpeg 在 PATH 中
    
    def crop_video(
        self,
        input_path: str,
        output_path: str,
        start_time: float = 0,
        end_time: Optional[float] = None,
        crop_area: Optional[dict] = None,
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> bool:
        """
        裁剪视频
        
        Args:
            input_path: 输入视频路径
            output_path: 输出视频路径
            start_time: 开始时间（秒）
            end_time: 结束时间（秒），None 表示到视频结尾
            crop_area: 裁剪区域 {'x': int, 'y': int, 'width': int, 'height': int}
            progress_callback: 进度回调函数
        
        Returns:
            是否成功
        """
        if progress_callback:
            progress_callback(5)
        
        # 构建 FFmpeg 命令
        cmd = [self.ffmpeg_path, '-y']
        
        # 输入文件
        if start_time > 0:
            cmd.extend(['-ss', str(start_time)])
        
        cmd.extend(['-i', input_path])
        
        # 时长限制
        if end_time is not None:
            duration = end_time - start_time
            cmd.extend(['-t', str(duration)])
        
        # 视频滤镜
        filters = []
        
        # 区域裁剪
        if crop_area:
            x = crop_area.get('x', 0)
            y = crop_area.get('y', 0)
            w = crop_area.get('width')
            h = crop_area.get('height')
            if w and h:
                filters.append(f'crop={w}:{h}:{x}:{y}')
        
        if filters:
            cmd.extend(['-vf', ','.join(filters)])
        
        # 输出编码设置 - 尝试复制原始编码，如果有滤镜则使用 mpeg4
        if filters:
            # 有滤镜时需要重新编码
            cmd.extend([
                '-c:v', 'mpeg4',
                '-q:v', '5',  # 使用质量模式而非固定码率
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                output_path
            ])
        else:
            # 无滤镜时直接复制流，保持原始编码
            cmd.extend([
                '-c:v', 'copy',
                '-c:a', 'copy',
                '-movflags', '+faststart',
                output_path
            ])
        
        if progress_callback:
            progress_callback(10)
        
        # 执行命令
        print(f"[VideoProcessor] Running command: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if progress_callback:
            progress_callback(90)
        
        success = result.returncode == 0 and os.path.exists(output_path)
        
        if not success:
            print(f"[VideoProcessor] FFmpeg failed with return code: {result.returncode}")
            print(f"[VideoProcessor] FFmpeg stderr: {result.stderr}")
        else:
            print(f"[VideoProcessor] Successfully created: {output_path}")
        
        if progress_callback:
            progress_callback(100)
        
        return success
    
    def merge_videos(
        self,
        clips: List[Dict],
        output_path: str,
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> bool:
        """
        拼接多个视频片段
        
        Args:
            clips: 视频片段列表，每个包含:
                   - input_path: 输入路径
                   - start_time: 开始时间
                   - end_time: 结束时间
                   - crop_area: 裁剪区域（可选）
            output_path: 输出视频路径
            progress_callback: 进度回调函数
        
        Returns:
            是否成功
        """
        if not clips:
            return False
        
        if len(clips) == 1:
            # 单个片段直接裁剪
            clip = clips[0]
            return self.crop_video(
                input_path=clip['input_path'],
                output_path=output_path,
                start_time=clip.get('start_time', 0),
                end_time=clip.get('end_time'),
                crop_area=clip.get('crop_area'),
                progress_callback=progress_callback
            )
        
        if progress_callback:
            progress_callback(5)
        
        # 多个片段需要先分别处理再拼接
        temp_files = []
        temp_dir = tempfile.mkdtemp()
        
        total_clips = len(clips)
        
        for i, clip in enumerate(clips):
            temp_output = os.path.join(temp_dir, f'clip_{i}.mp4')
            
            success = self.crop_video(
                input_path=clip['input_path'],
                output_path=temp_output,
                start_time=clip.get('start_time', 0),
                end_time=clip.get('end_time'),
                crop_area=clip.get('crop_area')
            )
            
            if not success:
                # 清理临时文件
                self._cleanup_temp_files(temp_files, temp_dir)
                return False
            
            temp_files.append(temp_output)
            
            if progress_callback:
                progress = 5 + int((i + 1) / total_clips * 70)
                progress_callback(progress)
        
        # 创建文件列表
        list_file = os.path.join(temp_dir, 'files.txt')
        with open(list_file, 'w') as f:
            for temp_file in temp_files:
                f.write(f"file '{temp_file}'\n")
        
        if progress_callback:
            progress_callback(80)
        
        # 使用 FFmpeg concat 拼接
        cmd = [
            self.ffmpeg_path, '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', list_file,
            '-c', 'copy',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # 清理临时文件
        self._cleanup_temp_files(temp_files, temp_dir)
        
        if progress_callback:
            progress_callback(100)
        
        return result.returncode == 0 and os.path.exists(output_path)
    
    def overlay_video(
        self,
        main_path: str,
        overlay_path: str,
        output_path: str,
        start_time: float = 0,
        end_time: Optional[float] = None,
        position: Optional[dict] = None,
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> bool:
        """
        视频叠加 - 将一个视频叠加到另一个视频上
        
        Args:
            main_path: 主视频路径
            overlay_path: 叠加视频路径
            output_path: 输出视频路径
            start_time: 叠加开始时间
            end_time: 叠加结束时间
            position: 叠加位置 {'x': int, 'y': int, 'width': int, 'height': int}
            progress_callback: 进度回调函数
        
        Returns:
            是否成功
        """
        if progress_callback:
            progress_callback(5)
        
        # 获取主视频信息
        main_info = self.get_video_info(main_path)
        if not main_info:
            return False
        
        # 获取叠加视频信息，用于计算叠加视频的实际时长
        overlay_info = self.get_video_info(overlay_path)
        if not overlay_info:
            return False
        
        overlay_duration = overlay_info.get('duration', 0)
        
        # 构建 FFmpeg 命令
        cmd = [self.ffmpeg_path, '-y']
        
        # 输入主视频
        cmd.extend(['-i', main_path])
        # 输入叠加视频
        cmd.extend(['-i', overlay_path])
        
        # 构建滤镜
        x = position.get('x', 0) if position else 0
        y = position.get('y', 0) if position else 0
        w = position.get('width') if position else None
        h = position.get('height') if position else None
        
        # 缩放叠加视频
        scale_filter = ''
        if w and h:
            scale_filter = f'[1:v]scale={w}:{h}[scaled];'
            overlay_input = '[scaled]'
        else:
            overlay_input = '[1:v]'
        
        # 时间控制 - 叠加视频从 start_time 开始，持续到叠加视频播放完毕
        # 计算叠加视频在主视频时间轴上的结束时间
        overlay_end_time = start_time + overlay_duration
        
        # 如果指定了 end_time，取较小值
        if end_time:
            overlay_end_time = min(overlay_end_time, end_time)
        
        enable_expr = f"enable='between(t,{start_time},{overlay_end_time})'"
        
        filter_complex = f"{scale_filter}[0:v]{overlay_input}overlay={x}:{y}:{enable_expr}[outv]"
        
        cmd.extend(['-filter_complex', filter_complex])
        cmd.extend(['-map', '[outv]'])
        cmd.extend(['-map', '0:a?'])  # 保留主视频音频
        
        # 输出编码设置 - 尝试复制原始编码以保持浏览器兼容性
        # 由于使用了滤镜，需要重新编码，使用 mpeg4
        cmd.extend([
            '-c:v', 'mpeg4',
            '-q:v', '5',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            output_path
        ])
        
        if progress_callback:
            progress_callback(20)
        
        # 执行命令
        print(f"[VideoProcessor] Running command: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if progress_callback:
            progress_callback(90)
        
        success = result.returncode == 0 and os.path.exists(output_path)
        
        if not success:
            print(f"[VideoProcessor] FFmpeg failed with return code: {result.returncode}")
            print(f"[VideoProcessor] FFmpeg stderr: {result.stderr}")
        else:
            print(f"[VideoProcessor] Successfully created: {output_path}")
        
        if progress_callback:
            progress_callback(100)
        
        return success
    
    def _cleanup_temp_files(self, temp_files: List[str], temp_dir: str):
        """清理临时文件"""
        import shutil
        for f in temp_files:
            if os.path.exists(f):
                os.remove(f)
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
    
    def get_video_info(self, video_path: str) -> Optional[dict]:
        """获取视频信息"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
        
        info = {
            'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            'fps': cap.get(cv2.CAP_PROP_FPS),
            'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            'duration': cap.get(cv2.CAP_PROP_FRAME_COUNT) / cap.get(cv2.CAP_PROP_FPS)
        }
        
        cap.release()
        return info
    
    def extract_frame(self, video_path: str, time_sec: float) -> Optional[bytes]:
        """提取指定时间的帧"""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_num = int(time_sec * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            return None
        
        _, buffer = cv2.imencode('.jpg', frame)
        return buffer.tobytes()
