import threading
from typing import Dict, Optional
from datetime import datetime

class TaskManager:
    """任务管理器 - 管理异步视频处理任务"""
    
    def __init__(self):
        self._tasks: Dict[str, dict] = {}
        self._lock = threading.Lock()
    
    def create_task(self, task_id: str) -> dict:
        """创建新任务"""
        with self._lock:
            task = {
                'taskId': task_id,
                'status': 'pending',
                'progress': 0,
                'resultUrl': None,
                'resultPath': None,
                'error': None,
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat()
            }
            self._tasks[task_id] = task
            return task
    
    def get_task(self, task_id: str) -> Optional[dict]:
        """获取任务信息"""
        with self._lock:
            return self._tasks.get(task_id)
    
    def update_progress(self, task_id: str, progress: int):
        """更新任务进度"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id]['status'] = 'processing'
                self._tasks[task_id]['progress'] = min(progress, 100)
                self._tasks[task_id]['updatedAt'] = datetime.now().isoformat()
    
    def complete_task(self, task_id: str, result_path: str, result_file_id: str = None):
        """完成任务"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id]['status'] = 'completed'
                self._tasks[task_id]['progress'] = 100
                self._tasks[task_id]['resultPath'] = result_path
                self._tasks[task_id]['resultUrl'] = f'/api/task/{task_id}/download'
                self._tasks[task_id]['resultFileId'] = result_file_id or task_id
                self._tasks[task_id]['updatedAt'] = datetime.now().isoformat()
    
    def fail_task(self, task_id: str, error: str):
        """任务失败"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id]['status'] = 'failed'
                self._tasks[task_id]['error'] = error
                self._tasks[task_id]['updatedAt'] = datetime.now().isoformat()
    
    def delete_task(self, task_id: str) -> bool:
        """删除任务"""
        with self._lock:
            if task_id in self._tasks:
                del self._tasks[task_id]
                return True
            return False
    
    def list_tasks(self) -> list:
        """列出所有任务"""
        with self._lock:
            return list(self._tasks.values())
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """清理过期任务"""
        import os
        from datetime import timedelta
        
        now = datetime.now()
        with self._lock:
            to_delete = []
            for task_id, task in self._tasks.items():
                created_at = datetime.fromisoformat(task['createdAt'])
                if now - created_at > timedelta(hours=max_age_hours):
                    to_delete.append(task_id)
                    # 删除结果文件
                    if task.get('resultPath') and os.path.exists(task['resultPath']):
                        os.remove(task['resultPath'])
            
            for task_id in to_delete:
                del self._tasks[task_id]
