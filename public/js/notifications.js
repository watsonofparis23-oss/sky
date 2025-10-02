// Notifications JavaScript for SkyVoyage

// Notification Manager
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.notificationCount = document.getElementById('notificationCount');
        this.notificationsList = document.getElementById('notificationsList');
        this.notificationBtn = document.getElementById('notificationBtn');
        
        this.init();
    }
    
    init() {
        this.loadNotifications();
        this.setupEventListeners();
        this.setupRealTimeUpdates();
    }
    
    async loadNotifications() {
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                this.notifications = await response.json();
                this.updateNotificationCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    updateNotificationCount() {
        if (!this.notificationCount) return;
        
        const unreadCount = this.notifications.filter(n => !n.read_status).length;
        this.notificationCount.textContent = unreadCount;
        this.notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
        
        // Add pulse animation for new notifications
        if (unreadCount > 0) {
            this.notificationCount.classList.add('pulse');
        } else {
            this.notificationCount.classList.remove('pulse');
        }
    }
    
    renderNotifications() {
        if (!this.notificationsList) return;
        
        const recentNotifications = this.notifications.slice(0, 5);
        
        this.notificationsList.innerHTML = recentNotifications.map(notification => `
            <div class="notification-item ${notification.read_status ? 'read' : ''}" 
                 onclick="markNotificationAsRead(${notification.id})">
                <div class="notification-icon">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <p>${notification.message}</p>
                    <span class="notification-time">${this.formatTime(notification.created_at)}</span>
                </div>
                ${!notification.read_status ? '<div class="unread-indicator"></div>' : ''}
            </div>
        `).join('');
    }
    
    getNotificationIcon(type) {
        const icons = {
            'booking': 'plane',
            'promotion': 'percent',
            'loyalty': 'star',
            'system': 'cog',
            'alert': 'exclamation-triangle',
            'support': 'headset',
            'payment': 'credit-card',
            'flight': 'plane-departure',
            'refund': 'money-bill-wave'
        };
        return icons[type] || 'bell';
    }
    
    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) {
            return 'Just now';
        } else if (minutes < 60) {
            return `${minutes} minutes ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    }
    
    setupEventListeners() {
        // Notification button click
        if (this.notificationBtn) {
            this.notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotifications();
            });
        }
        
        // Close notifications when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.notificationBtn?.contains(e.target)) {
                this.closeNotifications();
            }
        });
    }
    
    toggleNotifications() {
        const dropdown = this.notificationBtn?.querySelector('.dropdown-content');
        if (dropdown) {
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                this.loadNotifications(); // Refresh notifications when opening
            }
        }
    }
    
    closeNotifications() {
        const dropdown = this.notificationBtn?.querySelector('.dropdown-content');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }
    
    setupRealTimeUpdates() {
        // Simulate real-time updates every 30 seconds
        setInterval(() => {
            this.checkForNewNotifications();
        }, 30000);
    }
    
    async checkForNewNotifications() {
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const newNotifications = await response.json();
                const hasNewNotifications = newNotifications.length > this.notifications.length;
                
                if (hasNewNotifications) {
                    this.notifications = newNotifications;
                    this.updateNotificationCount();
                    this.renderNotifications();
                    this.showNewNotificationAlert();
                }
            }
        } catch (error) {
            console.error('Error checking for new notifications:', error);
        }
    }
    
    showNewNotificationAlert() {
        const unreadCount = this.notifications.filter(n => !n.read_status).length;
        if (unreadCount > 0) {
            SkyVoyage.showToast(`You have ${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`, 'info');
        }
    }
    
    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // Update local state
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.read_status = true;
                    this.updateNotificationCount();
                    this.renderNotifications();
                }
                
                SkyVoyage.showToast('Notification marked as read');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            SkyVoyage.showToast('Error updating notification', 'error');
        }
    }
    
    async markAllAsRead() {
        try {
            const unreadNotifications = this.notifications.filter(n => !n.read_status);
            
            for (const notification of unreadNotifications) {
                await fetch(`/api/notifications/${notification.id}/read`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Update local state
            this.notifications.forEach(n => n.read_status = true);
            this.updateNotificationCount();
            this.renderNotifications();
            
            SkyVoyage.showToast('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            SkyVoyage.showToast('Error updating notifications', 'error');
        }
    }
}

// Push Notification Manager
class PushNotificationManager {
    constructor() {
        this.isSupported = 'Notification' in window;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        
        this.init();
    }
    
    async init() {
        if (!this.isSupported) {
            console.log('Push notifications are not supported');
            return;
        }
        
        await this.requestPermission();
    }
    
    async requestPermission() {
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
        
        return this.permission === 'granted';
    }
    
    showNotification(title, options = {}) {
        if (this.permission !== 'granted') {
            console.log('Notification permission not granted');
            return;
        }
        
        const notification = new Notification(title, {
            icon: '/images/logo.png',
            badge: '/images/badge.png',
            tag: 'skyvoyage-notification',
            requireInteraction: false,
            silent: false,
            ...options
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
        
        return notification;
    }
    
    showFlightNotification(flightNumber, status) {
        this.showNotification(`Flight ${flightNumber} Update`, {
            body: `Your flight status has been updated: ${status}`,
            icon: '/images/flight-icon.png'
        });
    }
    
    showBookingNotification(bookingReference, message) {
        this.showNotification(`Booking ${bookingReference}`, {
            body: message,
            icon: '/images/booking-icon.png'
        });
    }
    
    showPromotionNotification(title, message) {
        this.showNotification(title, {
            body: message,
            icon: '/images/promotion-icon.png'
        });
    }
}

// Toast Notification Manager
class ToastNotificationManager {
    constructor() {
        this.toastContainer = this.createToastContainer();
        this.toasts = [];
        
        this.init();
    }
    
    init() {
        document.body.appendChild(this.toastContainer);
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        return container;
    }
    
    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type);
        this.toastContainer.appendChild(toast);
        this.toasts.push(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Auto-remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        return toast;
    }
    
    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getToastIcon(type);
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="toastManager.removeToast(this.parentElement)">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toast.style.cssText = `
            background: ${this.getToastColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 300px;
            max-width: 400px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        return toast;
    }
    
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    getToastColor(type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || '#3b82f6';
    }
    
    removeToast(toast) {
        toast.classList.remove('show');
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }
}

// Initialize notification system
document.addEventListener('DOMContentLoaded', function() {
    // Initialize notification manager
    window.notificationManager = new NotificationManager();
    
    // Initialize push notification manager
    window.pushNotificationManager = new PushNotificationManager();
    
    // Initialize toast notification manager
    window.toastManager = new ToastNotificationManager();
    
    // Override global showToast function
    window.SkyVoyage = window.SkyVoyage || {};
    window.SkyVoyage.showToast = (message, type = 'info') => {
        toastManager.show(message, type);
    };
});

// Global functions for backward compatibility
function markNotificationAsRead(notificationId) {
    if (window.notificationManager) {
        window.notificationManager.markAsRead(notificationId);
    }
}

function markAllNotificationsAsRead() {
    if (window.notificationManager) {
        window.notificationManager.markAllAsRead();
    }
}

function showNotification(title, options) {
    if (window.pushNotificationManager) {
        window.pushNotificationManager.showNotification(title, options);
    }
}

function showFlightNotification(flightNumber, status) {
    if (window.pushNotificationManager) {
        window.pushNotificationManager.showFlightNotification(flightNumber, status);
    }
}

function showBookingNotification(bookingReference, message) {
    if (window.pushNotificationManager) {
        window.pushNotificationManager.showBookingNotification(bookingReference, message);
    }
}

function showPromotionNotification(title, message) {
    if (window.pushNotificationManager) {
        window.pushNotificationManager.showPromotionNotification(title, message);
    }
}

// Export for use in other scripts
window.NotificationSystem = {
    NotificationManager,
    PushNotificationManager,
    ToastNotificationManager,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    showNotification,
    showFlightNotification,
    showBookingNotification,
    showPromotionNotification
};