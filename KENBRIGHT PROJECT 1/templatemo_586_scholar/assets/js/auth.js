// Kenbright IFRS 17 Authentication System
const API_BASE_URL = 'http://localhost:3000/api';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.init();
    }

    init() {
        this.loadStoredAuth();
        this.setupGlobalHandlers();
    }

    loadStoredAuth() {
        this.authToken = localStorage.getItem('kenbright_token');
        this.currentUser = JSON.parse(localStorage.getItem('kenbright_user') || 'null');
        
        // Update navigation if on a page with account nav
        this.updateNavigation();
    }

    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store auth data
            localStorage.setItem('kenbright_token', data.token);
            localStorage.setItem('kenbright_user', JSON.stringify(data.user));
            
            this.authToken = data.token;
            this.currentUser = data.user;

            // Show success message
            this.showMessage('Login successful! Redirecting...', 'success');

            // Redirect to progress page after 1 second
            setTimeout(() => {
                window.location.href = 'progress.html';
            }, 1000);

            return { success: true, data };

        } catch (error) {
            this.showMessage(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    async register(name, email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Store auth data
            localStorage.setItem('kenbright_token', data.token);
            localStorage.setItem('kenbright_user', JSON.stringify(data.user));
            
            this.authToken = data.token;
            this.currentUser = data.user;

            // Show success message
            this.showMessage('Account created successfully! Redirecting...', 'success');

            // Redirect to progress page after 1 second
            setTimeout(() => {
                window.location.href = 'progress.html';
            }, 1000);

            return { success: true, data };

        } catch (error) {
            this.showMessage(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    async guestLogin() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/guest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Guest login failed');
            }

            // Store auth data
            localStorage.setItem('kenbright_token', data.token);
            localStorage.setItem('kenbright_user', JSON.stringify(data.user));
            localStorage.setItem('kenbright_is_guest', 'true');
            
            this.authToken = data.token;
            this.currentUser = data.user;

            // Show success message
            this.showMessage('Guest login successful! Redirecting...', 'success');

            // Redirect to progress page after 1 second
            setTimeout(() => {
                window.location.href = 'progress.html';
            }, 1000);

            return { success: true, data };

        } catch (error) {
            this.showMessage(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    logout() {
        // Clear all auth data
        localStorage.removeItem('kenbright_token');
        localStorage.removeItem('kenbright_user');
        localStorage.removeItem('kenbright_is_guest');
        
        this.authToken = null;
        this.currentUser = null;

        // Update navigation
        this.updateNavigation();

        // Redirect to home page
        window.location.href = 'index.html';
    }

    isAuthenticated() {
        return !!(this.authToken && this.currentUser);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getAuthToken() {
        return this.authToken;
    }

    updateNavigation() {
        const accountNav = document.getElementById('account-nav');
        if (!accountNav) return;

        if (this.isAuthenticated()) {
            accountNav.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="fa fa-user-circle"></i>
                        ${this.currentUser.name}
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="progress.html"><i class="fa fa-chart-line"></i> My Progress</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" onclick="authManager.logout()"><i class="fa fa-sign-out-alt"></i> Logout</a></li>
                    </ul>
                </li>
            `;
        } else {
            accountNav.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="login.html"><i class="fa fa-sign-in-alt"></i> Login</a>
                </li>
            `;
        }
    }

    setupGlobalHandlers() {
        // Check authentication on page load for protected pages
        document.addEventListener('DOMContentLoaded', () => {
            const currentPage = window.location.pathname.split('/').pop();
            const protectedPages = ['progress.html', 'modules.html', 'assessments.html'];
            
            if (protectedPages.includes(currentPage) && !this.isAuthenticated()) {
                window.location.href = 'login.html';
                return;
            }
            
            this.updateNavigation();
        });
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.auth-message');
        existingMessages.forEach(msg => msg.remove());

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message alert alert-${type} fixed-top m-3`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        messageDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Global functions for HTML onclick handlers
function loginUser(email, password) {
    return authManager.login(email, password);
}

function registerUser(name, email, password) {
    return authManager.register(name, email, password);
}

function loginAsGuest() {
    return authManager.guestLogin();
}

function logoutUser() {
    authManager.logout();
}

// Make available globally
window.authManager = authManager;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.loginAsGuest = loginAsGuest;
window.logoutUser = logoutUser;