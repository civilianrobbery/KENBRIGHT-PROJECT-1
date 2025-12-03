// Module Progress Integration
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!localStorage.getItem('kenbright_token')) {
        // Not logged in, but allow viewing
        return;
    }
    
    initializeModulePage();
});

function initializeModulePage() {
    // Set up save progress button
    const saveBtn = document.getElementById('saveProgress');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            await saveProgress();
            
            setTimeout(() => {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Progress';
            }, 1000);
        });
    }
    
    // Set up mark complete button
    const completeBtn = document.getElementById('markComplete');
    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            completeBtn.disabled = true;
            completeBtn.textContent = 'Marking Complete...';
            
            await markComplete();
            
            completeBtn.textContent = 'Completed ✓';
            completeBtn.classList.add('btn-success');
        });
    }
    
    // Auto-save when scrolling (every 30 seconds)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (typeof saveProgress === 'function') {
                saveProgress();
            }
        }, 30000);
    });
    
    // Initialize progress display
    updateProgressFromServer();
}

async function updateProgressFromServer() {
    try {
        const token = localStorage.getItem('kenbright_token');
        if (!token) return;
        
        const moduleId = getModuleIdFromUrl();
        if (!moduleId) return;
        
        const response = await fetch('http://localhost:3000/api/progress', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const module = data.modules.find(m => m.module_id === moduleId);
            
            if (module) {
                updateProgressDisplay(module.progress);
            }
        }
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

function getModuleIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/module-(\d+)\.html/);
    return match ? parseInt(match[1]) : null;
}

function updateProgressDisplay(progress) {
    const progressBar = document.querySelector('.module-header-card .progress-bar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        
        // Update color
        if (progress >= 80) {
            progressBar.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        } else if (progress >= 50) {
            progressBar.style.background = 'linear-gradient(135deg, #ffc107, #fd7e14)';
        }
    }
    
    const statusText = document.querySelector('.progress-status');
    if (statusText) {
        statusText.textContent = `${progress}% Complete`;
    }
    
    // Update next module availability
    if (progress >= 100) {
        const nextModuleBtn = document.querySelector('.nav-button.next');
        if (nextModuleBtn) {
            nextModuleBtn.style.opacity = '1';
            nextModuleBtn.style.pointerEvents = 'auto';
        }
    }
}