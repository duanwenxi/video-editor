from flask import Flask
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # 配置
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    app.config['OUTPUT_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'outputs')
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB
    
    # 确保目录存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)
    
    # 注册蓝图
    from app.routes.upload import upload_bp
    from app.routes.process import process_bp
    from app.routes.extension import extension_bp
    
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(process_bp, url_prefix='/api')
    app.register_blueprint(extension_bp, url_prefix='/api')
    
    # 健康检查
    @app.route('/health', methods=['GET'])
    def health():
        try:
            import cv2
            import numpy as np
            return {
                'message': 'Python Backend is running!',
                'opencv_version': cv2.__version__,
                'numpy_version': np.__version__
            }, 200
        except Exception as e:
            return {'message': 'Python Backend is running!', 'error': str(e)}, 200
    
    @app.route('/api', methods=['GET'])
    def index():
        return {'message': 'Welcome to Video Crop & Merge API'}
    
    return app
