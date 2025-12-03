// Kenbright IFRS 17 Progress Tracking System
const API_BASE_URL = 'http://localhost:3000/api';

class ProgressManager {
    constructor() {
        this.currentModuleId = null;
        this.startTime = null;
        this.moduleTitles = {};
        this.init();
    }

    init() {
        this.loadModuleTitles();
        this.setupEventListeners();
    }

    async loadModuleTitles() {
        try {
            const response = await fetch(`${API_BASE_URL}/progress/modules/titles`);
            this.moduleTitles = await response.json();
        } catch (error) {
            console.error('Failed to load module titles:', error);
            // Fallback titles
            this.moduleTitles = {
                1: 'Introduction & Fundamental Principles',
                2: 'Combination and Separation',
                3: 'Level of Aggregation',
                4: 'General Measurement Model',
                5: 'Premium Allocation Approach',
                6: 'Variable Fee Approach',
                7: 'Contractual Service Margin',
                8: 'Risk Adjustment',
                9: 'Discount Rates',
                10: 'Initial Recognition',
                11: 'Subsequent Measurement',
                12: 'Presentation and Disclosure',
                13: 'Transition Requirements',
                14: 'Implementation Challenges',
                15: 'Case Studies'
            };
        }
    }

    setupEventListeners() {
        // Track module viewing time
        document.addEventListener('DOMContentLoaded', () => {
            this.startTimeTracking();
        });

        // Save time when leaving the page
        window.addEventListener('beforeunload', () => {
            this.saveTimeSpent();
        });

        // Save time when tab becomes inactive
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveTimeSpent();
            } else {
                this.startTime = Date.now();
            }
        });
    }

    startTimeTracking() {
        this.startTime = Date.now();
        const moduleId = this.getCurrentModuleId();
        sessionStorage.setItem(`module_${moduleId}_start`, this.startTime);
    }

    getTimeSpent() {
        if (!this.startTime) return 0;
        const timeSpentMs = Date.now() - this.startTime;
        return Math.round(timeSpentMs / 60000); // Convert to minutes
    }

    saveTimeSpent() {
        const moduleId = this.getCurrentModuleId();
        const timeSpent = this.getTimeSpent();
        
        if (timeSpent > 0 && moduleId) {
            this.updateModuleProgress(moduleId, null, null, timeSpent);
            this.startTime = Date.now(); // Reset timer
        }
    }

    getCurrentModuleId() {
        // Extract module ID from URL
        const path = window.location.pathname;
        const match = path.match(/module-(\d+)\.html/);
        return match ? parseInt(match[1]) : null;
    }

    async updateModuleProgress(moduleId, progress = null, score = null, timeSpent = null) {
        try {
            const token = localStorage.getItem('kenbright_token');
            if (!token) return;

            // Get current progress
            const currentProgress = await this.getCurrentProgress(moduleId);
            
            // Calculate new progress (if not provided, use current reading position)
            let newProgress = progress;
            if (progress === null) {
                newProgress = this.calculateReadingProgress();
            }
            
            // Only update if progress increased
            if (newProgress <= currentProgress && !score && !timeSpent) {
                return;
            }

            const response = await fetch(`${API_BASE_URL}/progress/${moduleId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    progress: newProgress,
                    score: score || 0,
                    timeSpent: timeSpent || 0
                })
            });

            if (response.ok) {
                // Update local progress display
                this.updateProgressDisplay(newProgress);
                
                // Show notification for significant progress
                if (newProgress >= 100) {
                    this.showNotification('Module completed!', 'success');
                } else if (newProgress >= 80) {
                    this.showNotification('Almost done with this module!', 'info');
                }
                
                return true;
            }
        } catch (error) {
            console.error('Error updating progress:', error);
        }
        return false;
    }

    async getCurrentProgress(moduleId) {
        try {
            const token = localStorage.getItem('kenbright_token');
            if (!token) return 0;

            const response = await fetch(`${API_BASE_URL}/progress`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const module = data.modules.find(m => m.module_id === moduleId);
                return module ? module.progress : 0;
            }
        } catch (error) {
            console.error('Error getting progress:', error);
        }
        return 0;
    }

    calculateReadingProgress() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        let scrollPercentage = (scrollTop / scrollHeight) * 100;
        
        // Cap at 90% until manually marked complete
        scrollPercentage = Math.min(90, scrollPercentage);
        
        // Round to nearest 5% to prevent too many updates
        return Math.round(scrollPercentage / 5) * 5;
    }

    updateProgressDisplay(progress) {
        // Update progress bar if it exists
        const progressBar = document.querySelector('.module-header-card .progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
            
            // Update color based on progress
            if (progress >= 80) {
                progressBar.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
            } else if (progress >= 50) {
                progressBar.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
            }
        }
        
        // Update status text if it exists
        const statusText = document.querySelector('.progress-status');
        if (statusText) {
            statusText.textContent = `${progress}% Complete`;
        }
    }

    async saveAssessmentResult(moduleId, score, totalQuestions, correctAnswers, timeSpent = '', feedback = '') {
        try {
            const token = localStorage.getItem('kenbright_token');
            if (!token) return false;

            const response = await fetch(`${API_BASE_URL}/progress/${moduleId}/assessment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    score,
                    totalQuestions,
                    correctAnswers,
                    timeSpent,
                    feedback
                })
            });

            if (response.ok) {
                // Also mark module as completed
                await this.updateModuleProgress(moduleId, 100, score, 0);
                
                this.showNotification(`Assessment completed! Score: ${score}%`, 'success');
                return true;
            }
        } catch (error) {
            console.error('Error saving assessment:', error);
            this.showNotification('Failed to save assessment result', 'error');
        }
        return false;
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelectorAll('.progress-notification');
        existing.forEach(el => el.remove());

        // Create notification
        const notification = document.createElement('div');
        notification.className = `progress-notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 9999;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
        `;

        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        } else if (type === 'error') {
            notification.style.background = 'linear-gradient(135deg, #dc3545, #e83e8c)';
        } else if (type === 'warning') {
            notification.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    // Auto-save progress when scrolling
    setupAutoSave() {
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const moduleId = this.getCurrentModuleId();
                if (moduleId) {
                    this.updateModuleProgress(moduleId);
                }
            }, 2000);
        });
    }

    // Mark module as complete
    async markModuleComplete(moduleId) {
        const success = await this.updateModuleProgress(moduleId, 100);
        if (success) {
            this.showNotification('Module marked as complete!', 'success');
            return true;
        }
        return false;
    }
}

// Initialize progress manager
const progressManager = new ProgressManager();

// Global functions for use in HTML
async function saveProgress() {
    const moduleId = progressManager.getCurrentModuleId();
    if (moduleId) {
        const progress = progressManager.calculateReadingProgress();
        await progressManager.updateModuleProgress(moduleId, progress);
    }
}

async function markComplete() {
    const moduleId = progressManager.getCurrentModuleId();
    if (moduleId) {
        await progressManager.markModuleComplete(moduleId);
    }
}

async function saveAssessment(score, totalQuestions, correctAnswers, timeSpent = '', feedback = '') {
    const moduleId = progressManager.getCurrentModuleId();
    if (moduleId) {
        await progressManager.saveAssessmentResult(
            moduleId, 
            score, 
            totalQuestions, 
            correctAnswers, 
            timeSpent, 
            feedback
        );
    }
}

// Make available globally
window.progressManager = progressManager;
window.saveProgress = saveProgress;
window.markComplete = markComplete;
window.saveAssessment = saveAssessment;

// Add CSS for notifications
const progressStyles = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;

// Inject styles
if (!document.querySelector('#progress-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'progress-styles';
    styleSheet.textContent = progressStyles;
    document.head.appendChild(styleSheet);
}