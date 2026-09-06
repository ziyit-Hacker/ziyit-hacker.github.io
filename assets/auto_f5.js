


class AutoRefresh {
    constructor() {
        this.timeoutDuration = 90000;  
        this.timeoutId = null;
        this.isEnabled = true;
        
        this.init();
    }
    
     
    init() {
         
        this.resetTimer();
        
         
        this.setupEventListeners();
        
         
        this.setupVisibilityListener();
        
        console.log('自动刷新功能已启用，1.5分钟无操作将自动刷新');
    }
    
     
    setupEventListeners() {
         
        document.addEventListener('mousedown', () => this.resetTimer());
        document.addEventListener('mousemove', () => this.resetTimer());
        document.addEventListener('mouseup', () => this.resetTimer());
        document.addEventListener('click', () => this.resetTimer());
        document.addEventListener('dblclick', () => this.resetTimer());
        document.addEventListener('contextmenu', () => this.resetTimer());
        
         
        document.addEventListener('keydown', () => this.resetTimer());
        document.addEventListener('keyup', () => this.resetTimer());
        document.addEventListener('keypress', () => this.resetTimer());
        
         
        document.addEventListener('touchstart', () => this.resetTimer());
        document.addEventListener('touchmove', () => this.resetTimer());
        document.addEventListener('touchend', () => this.resetTimer());
        
         
        document.addEventListener('scroll', () => this.resetTimer());
        window.addEventListener('scroll', () => this.resetTimer());
        
         
        window.addEventListener('resize', () => this.resetTimer());
        window.addEventListener('focus', () => this.resetTimer());
    }
    
     
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                 
                this.pauseTimer();
            } else {
                 
                this.resumeTimer();
            }
        });
    }
    
     
    resetTimer() {
        if (!this.isEnabled) return;
        
         
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
         
        this.timeoutId = setTimeout(() => {
            this.refreshPage();
        }, this.timeoutDuration);
    }
    
     
    pauseTimer() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
     
    resumeTimer() {
        if (!this.timeoutId && this.isEnabled) {
            this.resetTimer();
        }
    }
    
     
    refreshPage() {
        console.log('检测到1.5分钟无操作，正在刷新页面...');
        
         
        this.showRefreshNotification();
        
         
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
     
    showRefreshNotification() {
         
        const notification = document.createElement('div');
        notification.id = 'auto-refresh-notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-size: 16px;
            z-index: 10000;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        notification.innerHTML = `
            <div style="margin-bottom: 10px;">🔄 即将自动刷新页面</div>
            <div style="font-size: 14px; opacity: 0.8;">1.5分钟无操作，页面将在1秒后刷新</div>
        `;
        
        document.body.appendChild(notification);
        
         
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 1000);
    }
    
     
    enable() {
        this.isEnabled = true;
        this.resetTimer();
        console.log('自动刷新功能已启用');
    }
    
     
    disable() {
        this.isEnabled = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        console.log('自动刷新功能已禁用');
    }
    
     
    setTimeout(duration) {
        this.timeoutDuration = duration;
        this.resetTimer();
        console.log(`自动刷新时间已设置为 ${duration / 1000} 秒`);
    }
    
     
    getRemainingTime() {
         
        return this.timeoutDuration;
    }
}

 
window.autoRefresh = new AutoRefresh();

 
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoRefresh;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('window.autoRefresh.disable(); 禁止自动刷新');
    console.log('window.autoRefresh.enable(); 启用自动刷新');
    console.log('window.autoRefresh.isEnabled; 检查自动刷新是否启用');
    console.log('window.autoRefresh.setTimeout(毫秒); 设置新的超时时间');
});
