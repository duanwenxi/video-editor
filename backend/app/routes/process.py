from flask import Blueprint, request, jsonify, current_app, send_file
import os
import uuid
import threading
from app.services.video_processor import VideoProcessor
from app.services.task_manager import TaskManager

process_bp = Blueprint('process', __name__)

# 全局任务管理器
task_manager = TaskManager()

# 支持的视频格式
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'}

def find_video_file(file_id):
    """查找视频文件（在上传和输出目录中查找）"""
    upload_folder = current_app.config['UPLOAD_FOLDER']
    output_folder = current_app.config['OUTPUT_FOLDER']
    
    for folder in [upload_folder, output_folder]:
        for ext in ALLOWED_EXTENSIONS:
            test_path = os.path.join(folder, f"{file_id}.{ext}")
            if os.path.exists(test_path):
                return test_path, ext
    return None, None

@process_bp.route('/video/crop', methods=['POST'])
def crop_video():
    """裁剪视频"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    file_id = data.get('file_id')
    start_time = data.get('start_time', 0)
    end_time = data.get('end_time')
    crop_area = data.get('crop_area')
    output_format = data.get('output_format', 'mp4')
    
    if not file_id:
        return jsonify({'error': 'file_id is required'}), 400
    
    input_path, source_ext = find_video_file(file_id)
    if not input_path:
        return jsonify({'error': 'Video not found'}), 404
    
    # 使用源格式或指定格式
    ext = output_format if output_format else source_ext
    
    # 创建任务
    task_id = str(uuid.uuid4())
    output_path = os.path.join(current_app.config['OUTPUT_FOLDER'], f"{task_id}.{ext}")
    
    task_manager.create_task(task_id)
    
    # 异步处理
    def process_task():
        processor = VideoProcessor()
        success = processor.crop_video(
            input_path=input_path,
            output_path=output_path,
            start_time=start_time,
            end_time=end_time,
            crop_area=crop_area,
            progress_callback=lambda p: task_manager.update_progress(task_id, p)
        )
        
        if success:
            task_manager.complete_task(task_id, output_path, task_id)
        else:
            task_manager.fail_task(task_id, 'Processing failed')
    
    thread = threading.Thread(target=process_task)
    thread.start()
    
    return jsonify({
        'taskId': task_id,
        'status': 'pending',
        'progress': 0
    })

@process_bp.route('/video/overlay', methods=['POST'])
def overlay_video():
    """视频叠加"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    main_file_id = data.get('main_file_id')
    overlay_file_id = data.get('overlay_file_id')
    start_time = data.get('start_time', 0)
    end_time = data.get('end_time')
    position = data.get('position')
    output_format = data.get('output_format', 'mp4')
    
    if not main_file_id or not overlay_file_id:
        return jsonify({'error': 'main_file_id and overlay_file_id are required'}), 400
    
    main_path, main_ext = find_video_file(main_file_id)
    overlay_path, _ = find_video_file(overlay_file_id)
    
    if not main_path:
        return jsonify({'error': 'Main video not found'}), 404
    if not overlay_path:
        return jsonify({'error': 'Overlay video not found'}), 404
    
    ext = output_format if output_format else main_ext
    
    # 创建任务
    task_id = str(uuid.uuid4())
    output_path = os.path.join(current_app.config['OUTPUT_FOLDER'], f"{task_id}.{ext}")
    
    task_manager.create_task(task_id)
    
    # 异步处理
    def process_task():
        processor = VideoProcessor()
        success = processor.overlay_video(
            main_path=main_path,
            overlay_path=overlay_path,
            output_path=output_path,
            start_time=start_time,
            end_time=end_time,
            position=position,
            progress_callback=lambda p: task_manager.update_progress(task_id, p)
        )
        
        if success:
            task_manager.complete_task(task_id, output_path, task_id)
        else:
            task_manager.fail_task(task_id, 'Overlay failed')
    
    thread = threading.Thread(target=process_task)
    thread.start()
    
    return jsonify({
        'taskId': task_id,
        'status': 'pending',
        'progress': 0
    })

@process_bp.route('/video/merge', methods=['POST'])
def merge_videos():
    """拼接视频"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    clips = data.get('clips', [])
    output_format = data.get('output_format', 'mp4')
    
    if not clips or len(clips) < 1:
        return jsonify({'error': 'At least one clip is required'}), 400
    
    # 验证所有文件存在
    clip_params = []
    first_ext = None
    for clip in clips:
        file_id = clip.get('file_id')
        input_path, ext = find_video_file(file_id)
        if not input_path:
            return jsonify({'error': f'Video {file_id} not found'}), 404
        if first_ext is None:
            first_ext = ext
        clip_params.append({
            'input_path': input_path,
            'start_time': clip.get('start_time', 0),
            'end_time': clip.get('end_time'),
            'crop_area': clip.get('crop_area')
        })
    
    ext = output_format if output_format else first_ext
    
    # 创建任务
    task_id = str(uuid.uuid4())
    output_path = os.path.join(current_app.config['OUTPUT_FOLDER'], f"{task_id}.{ext}")
    
    task_manager.create_task(task_id)
    
    # 异步处理
    def process_task():
        processor = VideoProcessor()
        success = processor.merge_videos(
            clips=clip_params,
            output_path=output_path,
            progress_callback=lambda p: task_manager.update_progress(task_id, p)
        )
        
        if success:
            task_manager.complete_task(task_id, output_path, task_id)
        else:
            task_manager.fail_task(task_id, 'Merge failed')
    
    thread = threading.Thread(target=process_task)
    thread.start()
    
    return jsonify({
        'taskId': task_id,
        'status': 'pending',
        'progress': 0
    })

@process_bp.route('/task/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """获取任务状态"""
    task = task_manager.get_task(task_id)
    
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify(task)

@process_bp.route('/task/<task_id>/download', methods=['GET'])
def download_result(task_id):
    """下载处理结果"""
    task = task_manager.get_task(task_id)
    
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    if task['status'] != 'completed':
        return jsonify({'error': 'Task not completed'}), 400
    
    output_path = task.get('resultPath')
    if not output_path or not os.path.exists(output_path):
        return jsonify({'error': 'Result file not found'}), 404
    
    ext = output_path.rsplit('.', 1)[1].lower()
    
    return send_file(
        output_path,
        mimetype=f'video/{ext}',
        as_attachment=True,
        download_name=f'output_{task_id[:8]}.{ext}'
    )
