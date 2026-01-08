from flask import Blueprint, request, jsonify

extension_bp = Blueprint('extension', __name__)

@extension_bp.route('/extension/<method_name>', methods=['POST'])
def extension_handler(method_name: str):
    """
    预留扩展接口入口
    支持后续添加：特征点跟踪、智能裁剪、目标检测等功能
    
    Args:
        method_name: 扩展方法名称
    
    Request Body:
        video_path: 视频文件路径或ID
        params: 扩展方法参数
    
    Returns:
        处理结果
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # 预留的扩展方法映射
    extension_methods = {
        'feature_tracking': feature_tracking_handler,
        'object_detection': object_detection_handler,
        'smart_crop': smart_crop_handler,
    }
    
    if method_name not in extension_methods:
        return jsonify({
            'error': f'Unknown extension method: {method_name}',
            'available_methods': list(extension_methods.keys())
        }), 404
    
    handler = extension_methods[method_name]
    return handler(data)

def feature_tracking_handler(data: dict):
    """
    特征点跟踪处理器 - 预留接口
    
    后续实现：
    - 基于 OpenCV 的特征点检测（SIFT/ORB/FAST）
    - 光流跟踪
    - 目标区域自动跟踪裁剪
    """
    return jsonify({
        'status': 'not_implemented',
        'message': 'Feature tracking is not implemented yet',
        'expected_params': {
            'file_id': 'Video file ID',
            'tracking_method': 'SIFT | ORB | FAST | OPTICAL_FLOW',
            'initial_region': {'x': 0, 'y': 0, 'width': 100, 'height': 100},
            'start_frame': 0,
            'end_frame': -1
        }
    })

def object_detection_handler(data: dict):
    """
    目标检测处理器 - 预留接口
    
    后续实现：
    - 人脸检测
    - 物体检测
    - 自动跟踪裁剪
    """
    return jsonify({
        'status': 'not_implemented',
        'message': 'Object detection is not implemented yet',
        'expected_params': {
            'file_id': 'Video file ID',
            'detection_type': 'face | object | custom',
            'model': 'Model name or path'
        }
    })

def smart_crop_handler(data: dict):
    """
    智能裁剪处理器 - 预留接口
    
    后续实现：
    - 基于内容的智能裁剪
    - 自动追踪主体
    - 多目标裁剪
    """
    return jsonify({
        'status': 'not_implemented',
        'message': 'Smart crop is not implemented yet',
        'expected_params': {
            'file_id': 'Video file ID',
            'target_aspect_ratio': '16:9 | 9:16 | 1:1 | custom',
            'focus_mode': 'center | subject | face'
        }
    })

@extension_bp.route('/extension', methods=['GET'])
def list_extensions():
    """列出所有可用的扩展接口"""
    return jsonify({
        'available_extensions': [
            {
                'name': 'feature_tracking',
                'description': '特征点跟踪 - 基于特征点的视频区域跟踪',
                'status': 'not_implemented'
            },
            {
                'name': 'object_detection',
                'description': '目标检测 - 人脸/物体检测与跟踪',
                'status': 'not_implemented'
            },
            {
                'name': 'smart_crop',
                'description': '智能裁剪 - 基于内容的自动裁剪',
                'status': 'not_implemented'
            }
        ]
    })
