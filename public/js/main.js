// Global state
let currentUser = null;
let luxuryMode = false;
let notifications = [];

// DOM elements
const hamburgerMenu = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const themeToggle = document.getElementById('theme-toggle');
const aiConciergeBtn = document.getElementById('aiConciergeBtn');
const sosBtn = document.getElementById('sosBtn');
const luxuryToggle = document.getElementById('luxuryToggle');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadNotifications();
    setupEventListeners();
});

// Initialize application
function initializeApp() {
    // Check for saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        const themeThumb = themeToggle.querySelector('.theme-thumb');
        if (themeThumb) {
            themeThumb.classList.add('dark');
        }
    }
    
    // Check for luxury mode
    const savedLuxuryMode = localStorage.getItem('luxuryMode');
    if (savedLuxuryMode === 'true') {
        toggleLuxuryMode();
    }
    
    // Initialize tooltips and other UI elements
    initializeTooltips();
    
    console.log('🚀 SkyVoyage application initialized');
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar toggle for mobile
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', toggleSidebar);
    }
    
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // AI Concierge
    if (aiConciergeBtn) {
        aiConciergeBtn.addEventListener('click', openAIConcierge);
    }
    
    // SOS Button
    if (sosBtn) {
        sosBtn.addEventListener('click', triggerSOS);
    }
    
    // Luxury Mode Toggle
    if (luxuryToggle) {
        luxuryToggle.addEventListener('click', toggleLuxuryMode);
    }
    
    // Dropdown functionality
    setupDropdowns();
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', closeAllDropdowns);
    
    // Auto-hide alerts after 5 seconds
    autoHideAlerts();
}

// Toggle sidebar on mobile
function toggleSidebar() {
    sidebar.classList.toggle('active');
}

// Theme toggle functionality
function toggleTheme() {
    const themeThumb = themeToggle.querySelector('.theme-thumb');
    themeThumb.classList.toggle('dark');
    document.body.classList.toggle('light-mode');
    
    // Save theme preference
    const isLightMode = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
    
    showToast(isLightMode ? 'Light mode activated' : 'Dark mode activated');
}

// Toggle luxury mode
function toggleLuxuryMode() {
    luxuryMode = !luxuryMode;
    
    if (luxuryMode) {
        luxuryToggle.innerHTML = '<i class="fas fa-crown"></i> Luxury Mode ON';
        luxuryToggle.style.background = 'var(--luxury-gold)';
        document.body.classList.add('luxury-mode');
        showToast('Luxury mode activated! You now have access to premium features.');
    } else {
        luxuryToggle.innerHTML = '<i class="fas fa-crown"></i> Luxury Mode';
        luxuryToggle.style.background = 'var(--luxury-gold)';
        document.body.classList.remove('luxury-mode');
        showToast('Luxury mode deactivated');
    }
    
    localStorage.setItem('luxuryMode', luxuryMode.toString());
}

// Setup dropdown functionality
function setupDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            const content = this.querySelector('.dropdown-content');
            const isVisible = content.style.display === 'block';
            
            // Close all dropdowns first
            document.querySelectorAll('.dropdown-content').forEach(item => {
                item.style.display = 'none';
            });
            
            // Open this dropdown if it wasn't already open
            if (!isVisible) {
                content.style.display = 'block';
            }
        });
    });
}

// Close all dropdowns
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content').forEach(item => {
        item.style.display = 'none';
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    
    // Update toast styling based on type
    toast.className = `toast ${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Load notifications
function loadNotifications() {
    // This would typically fetch from an API
    // For now, we'll use mock data
    notifications = [
        {
            id: 1,
            title: 'Flight Confirmation',
            message: 'Your flight to London has been confirmed',
            time: '2 hours ago',
            type: 'booking',
            read: false
        },
        {
            id: 2,
            title: 'Special Offer',
            message: '30% off on your next booking',
            time: '5 hours ago',
            type: 'promotion',
            read: false
        },
        {
            id: 3,
            title: 'Loyalty Points',
            message: 'You\'ve earned 500 loyalty points',
            time: '1 day ago',
            type: 'loyalty',
            read: true
        }
    ];
    
    updateNotificationBadge();
    renderNotifications();
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notificationCount');
    if (badge) {
        const unreadCount = notifications.filter(n => !n.read).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// Render notifications in dropdown
function renderNotifications() {
    const notificationsList = document.getElementById('notificationsList');
    if (!notificationsList) return;
    
    notificationsList.innerHTML = notifications.slice(0, 3).map(notification => `
        <div class="notification-item ${notification.read ? 'read' : ''}" onclick="markNotificationAsRead(${notification.id})">
            <div class="notification-icon">
                <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <p>${notification.message}</p>
                <span class="notification-time">${notification.time}</span>
            </div>
        </div>
    `).join('');
}

// Get notification icon based on type
function getNotificationIcon(type) {
    const icons = {
        'booking': 'plane',
        'promotion': 'percent',
        'loyalty': 'star',
        'system': 'cog',
        'alert': 'exclamation-triangle'
    };
    return icons[type] || 'bell';
}

// Mark notification as read
function markNotificationAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        updateNotificationBadge();
        renderNotifications();
        showToast('Notification marked as read');
    }
}

// Open AI Concierge
function openAIConcierge() {
    // This would open a modal or navigate to AI concierge page
    showToast('AI Travel Concierge opened');
    // In a real implementation, this would open a modal or navigate to the AI concierge interface
}

// Trigger SOS
function triggerSOS() {
    const confirmed = confirm('Are you sure you want to trigger emergency SOS? This will notify your emergency contacts and local authorities.');
    if (confirmed) {
        showToast('Emergency SOS activated! Help is on the way. Your location is being shared with emergency services.', 'error');
        // In a real implementation, this would send emergency alerts
    }
}

// Initialize tooltips
function initializeTooltips() {
    // Add tooltip functionality to elements with data-tooltip attribute
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

// Show tooltip
function showTooltip(e) {
    const tooltip = e.target.getAttribute('data-tooltip');
    if (!tooltip) return;
    
    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'tooltip';
    tooltipElement.textContent = tooltip;
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.background = 'var(--dark)';
    tooltipElement.style.color = 'white';
    tooltipElement.style.padding = '8px 12px';
    tooltipElement.style.borderRadius = '6px';
    tooltipElement.style.fontSize = '0.8rem';
    tooltipElement.style.zIndex = '10000';
    tooltipElement.style.pointerEvents = 'none';
    
    document.body.appendChild(tooltipElement);
    
    const rect = e.target.getBoundingClientRect();
    tooltipElement.style.left = rect.left + (rect.width / 2) - (tooltipElement.offsetWidth / 2) + 'px';
    tooltipElement.style.top = rect.top - tooltipElement.offsetHeight - 8 + 'px';
    
    e.target._tooltipElement = tooltipElement;
}

// Hide tooltip
function hideTooltip(e) {
    if (e.target._tooltipElement) {
        document.body.removeChild(e.target._tooltipElement);
        e.target._tooltipElement = null;
    }
}

// Auto-hide alerts
function autoHideAlerts() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 300);
        }, 5000);
    });
}

// Utility functions
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
}

function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(new Date(date));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export functions for use in other scripts
window.SkyVoyage = {
    showToast,
    formatCurrency,
    formatDate,
    formatTime,
    debounce,
    throttle,
    toggleLuxuryMode,
    markNotificationAsRead
};