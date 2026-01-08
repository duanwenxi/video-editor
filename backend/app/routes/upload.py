from flask import Blueprint, request, jsonify, current_app, send_file
import os
import uuid
import cv2

upload_bp = Blueprint('upload', __name__)

# 支持的视频格式
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@upload_bp.route('/video/upload', methods=['POST'])
def upload_video():
    """上传视频文件"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': f'File type not allowed. Supported: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
    
    # 生成唯一文件ID
    file_id = str(uuid.uuid4())
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{file_id}.{ext}"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    
    # 保存文件
    file.save(filepath)
    
    # 获取视频信息
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        os.remove(filepath)
        return jsonify({'error': 'Cannot open video file'}), 400
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps if fps > 0 else 0
    
    cap.release()
    
    return jsonify({
        'file_id': file_id,
        'filename': file.filename,
        'width': width,
        'height': height,
        'fps': round(fps, 2),
        'frame_count': frame_count,
        'duration_seconds': round(duration, 2),
        'format': ext
    })

@upload_bp.route('/video/info/<file_id>', methods=['GET'])
def get_video_info(file_id):
    """获取视频信息"""
    # 查找文件
    upload_folder = current_app.config['UPLOAD_FOLDER']
    filepath = None
    for ext in ALLOWED_EXTENSIONS:
        test_path = os.path.join(upload_folder, f"{file_id}.{ext}")
        if os.path.exists(test_path):
            filepath = test_path
            break
    
    if not filepath:
        return jsonify({'error': 'Video not found'}), 404
    
    cap = cv2.VideoCapture(filepath)
    if not cap.isOpened():
        return jsonify({'error': 'Cannot open video'}), 500
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / fps if fps > 0 else 0
    
    cap.release()
    
    return jsonify({
        'file_id': file_id,
        'filename': os.path.basename(filepath),
        'width': width,
        'height': height,
        'fps': round(fps, 2),
        'frame_count': frame_count,
        'duration_seconds': round(duration, 2)
    })

@upload_bp.route('/video/file/<file_id>', methods=['GET'])
def get_video_file(file_id):
    """获取视频文件流"""
    upload_folder = current_app.config['UPLOAD_FOLDER']
    output_folder = current_app.config['OUTPUT_FOLDER']
    
    filepath = None
    # 先在上传目录查找
    for ext in ALLOWED_EXTENSIONS:
        test_path = os.path.join(upload_folder, f"{file_id}.{ext}")
        if os.path.exists(test_path):
            filepath = test_path
            break
    
    # 再在输出目录查找
    if not filepath:
        for ext in ALLOWED_EXTENSIONS:
            test_path = os.path.join(output_folder, f"{file_id}.{ext}")
            if os.path.exists(test_path):
                filepath = test_path
                break
    
    if not filepath:
        return jsonify({'error': 'Video not found'}), 404
    
    ext = filepath.rsplit('.', 1)[1].lower()
    mimetype = 'video/mp4'
    if ext == 'mov':
        mimetype = 'video/quicktime'
    elif ext == 'avi':
        mimetype = 'video/x-msvideo'
    elif ext == 'webm':
        mimetype = 'video/webm'
    elif ext == 'mkv':
        mimetype = 'video/x-matroska'
    
    return send_file(filepath, mimetype=mimetype)

@upload_bp.route('/video/download/<file_id>', methods=['GET'])
def download_video(file_id):
    """下载视频文件"""
    upload_folder = current_app.config['UPLOAD_FOLDER']
    output_folder = current_app.config['OUTPUT_FOLDER']
    
    filepath = None
    filename = None
    
    # 先在上传目录查找
    for ext in ALLOWED_EXTENSIONS:
        test_path = os.path.join(upload_folder, f"{file_id}.{ext}")
        if os.path.exists(test_path):
            filepath = test_path
            filename = f"video_{file_id[:8]}.{ext}"
            break
    
    # 再在输出目录查找
    if not filepath:
        for ext in ALLOWED_EXTENSIONS:
            test_path = os.path.join(output_folder, f"{file_id}.{ext}")
            if os.path.exists(test_path):
                filepath = test_path
                filename = f"output_{file_id[:8]}.{ext}"
                break
    
    if not filepath:
        return jsonify({'error': 'Video not found'}), 404
    
    return send_file(filepath, as_attachment=True, download_name=filename)

@upload_bp.route('/video/delete/<file_id>', methods=['DELETE'])
def delete_video(file_id):
    """删除视频文件"""
    upload_folder = current_app.config['UPLOAD_FOLDER']
    deleted = False
    for ext in ALLOWED_EXTENSIONS:
        test_path = os.path.join(upload_folder, f"{file_id}.{ext}")
        if os.path.exists(test_path):
            os.remove(test_path)
            deleted = True
            break
    
    if deleted:
        return jsonify({'message': 'Video deleted successfully'})
    return jsonify({'error': 'Video not found'}), 404
