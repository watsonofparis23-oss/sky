// Components JavaScript for SkyVoyage

// Modal Component
class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.closeBtn = this.modal?.querySelector('.close-modal');
        this.overlay = document.getElementById('overlay');
        
        this.init();
    }
    
    init() {
        if (!this.modal) return;
        
        // Close button event
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }
        
        // Overlay click event
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.close());
        }
        
        // Escape key event
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.close();
            }
        });
    }
    
    open() {
        if (!this.modal) return;
        
        this.modal.style.display = 'flex';
        if (this.overlay) {
            this.overlay.style.display = 'block';
        }
        
        // Focus first input
        const firstInput = this.modal.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        if (!this.modal) return;
        
        this.modal.style.display = 'none';
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Toast Component
class Toast {
    constructor() {
        this.toast = document.getElementById('toast');
        this.message = document.getElementById('toast-message');
        this.timeout = null;
    }
    
    show(message, type = 'success', duration = 3000) {
        if (!this.toast || !this.message) return;
        
        // Clear existing timeout
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        // Update message and type
        this.message.textContent = message;
        this.toast.className = `toast ${type}`;
        
        // Show toast
        this.toast.classList.add('show');
        
        // Auto hide
        this.timeout = setTimeout(() => {
            this.hide();
        }, duration);
    }
    
    hide() {
        if (!this.toast) return;
        
        this.toast.classList.remove('show');
        
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
}

// Dropdown Component
class Dropdown {
    constructor(dropdownId) {
        this.dropdown = document.getElementById(dropdownId);
        this.content = this.dropdown?.querySelector('.dropdown-content');
        
        this.init();
    }
    
    init() {
        if (!this.dropdown || !this.content) return;
        
        this.dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target)) {
                this.close();
            }
        });
    }
    
    toggle() {
        const isVisible = this.content.style.display === 'block';
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-content').forEach(content => {
            if (content !== this.content) {
                content.style.display = 'none';
            }
        });
        
        // Toggle this dropdown
        this.content.style.display = isVisible ? 'none' : 'block';
    }
    
    open() {
        this.content.style.display = 'block';
    }
    
    close() {
        this.content.style.display = 'none';
    }
}

// Search Component
class SearchComponent {
    constructor() {
        this.searchForm = document.querySelector('.search-form');
        this.searchInputs = document.querySelectorAll('.search-form input');
        this.searchTabs = document.querySelectorAll('.search-tab');
        this.returnField = document.getElementById('returnField');
        
        this.init();
    }
    
    init() {
        if (!this.searchForm) return;
        
        // Search tab functionality
        this.searchTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab);
            });
        });
        
        // Auto-complete for airport inputs
        this.setupAutocomplete();
        
        // Form validation
        this.searchForm.addEventListener('submit', (e) => {
            this.validateForm(e);
        });
    }
    
    switchTab(tab) {
        // Remove active class from all tabs
        this.searchTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Handle return field visibility
        const type = tab.getAttribute('data-type');
        if (type === 'one-way') {
            this.returnField.style.display = 'none';
            document.getElementById('return').required = false;
        } else {
            this.returnField.style.display = 'block';
            document.getElementById('return').required = true;
        }
    }
    
    setupAutocomplete() {
        const airports = [
            { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York' },
            { code: 'LHR', name: 'Heathrow Airport', city: 'London' },
            { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris' },
            { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo' },
            { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai' },
            { code: 'SYD', name: 'Kingsford Smith Airport', city: 'Sydney' },
            { code: 'SIN', name: 'Changi Airport', city: 'Singapore' },
            { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles' },
            { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt' },
            { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam' }
        ];
        
        const fromInput = document.getElementById('from');
        const toInput = document.getElementById('to');
        
        [fromInput, toInput].forEach(input => {
            if (!input) return;
            
            input.addEventListener('input', function() {
                const value = this.value.toLowerCase();
                if (value.length < 2) return;
                
                const matches = airports.filter(airport => 
                    airport.city.toLowerCase().includes(value) || 
                    airport.code.toLowerCase().includes(value) ||
                    airport.name.toLowerCase().includes(value)
                );
                
                this.showSuggestions(matches.slice(0, 5));
            });
        });
    }
    
    validateForm(e) {
        const from = document.getElementById('from').value;
        const to = document.getElementById('to').value;
        const departure = document.getElementById('departure').value;
        
        if (!from || !to || !departure) {
            e.preventDefault();
            SkyVoyage.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (from === to) {
            e.preventDefault();
            SkyVoyage.showToast('Departure and destination cannot be the same', 'error');
            return;
        }
        
        const departureDate = new Date(departure);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (departureDate < today) {
            e.preventDefault();
            SkyVoyage.showToast('Departure date cannot be in the past', 'error');
            return;
        }
    }
}

// Flight Card Component
class FlightCard {
    constructor(cardElement) {
        this.card = cardElement;
        this.init();
    }
    
    init() {
        if (!this.card) return;
        
        this.card.addEventListener('click', () => {
            this.handleClick();
        });
        
        // Wishlist functionality
        const wishlistIcon = this.card.querySelector('.wishlist-icon');
        if (wishlistIcon) {
            wishlistIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleWishlist(wishlistIcon);
            });
        }
    }
    
    handleClick() {
        const flightId = this.card.getAttribute('data-flight-id');
        if (flightId) {
            window.location.href = `/flights/details/${flightId}`;
        }
    }
    
    toggleWishlist(icon) {
        icon.classList.toggle('active');
        const heartIcon = icon.querySelector('i');
        
        if (icon.classList.contains('active')) {
            heartIcon.classList.remove('far', 'fa-heart');
            heartIcon.classList.add('fas', 'fa-heart');
            SkyVoyage.showToast('Added to wishlist!');
        } else {
            heartIcon.classList.remove('fas', 'fa-heart');
            heartIcon.classList.add('far', 'fa-heart');
            SkyVoyage.showToast('Removed from wishlist!');
        }
    }
}

// Deal Card Component
class DealCard {
    constructor(cardElement) {
        this.card = cardElement;
        this.init();
    }
    
    init() {
        if (!this.card) return;
        
        this.card.addEventListener('click', () => {
            this.handleClick();
        });
        
        // Book now button
        const bookBtn = this.card.querySelector('.deal-btn');
        if (bookBtn) {
            bookBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.bookDeal();
            });
        }
        
        // Wishlist functionality
        const wishlistIcon = this.card.querySelector('.wishlist-icon');
        if (wishlistIcon) {
            wishlistIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleWishlist(wishlistIcon);
            });
        }
    }
    
    handleClick() {
        // Show deal details or redirect to booking
        const dealId = this.card.getAttribute('data-deal-id');
        if (dealId) {
            // In a real implementation, this would show deal details
            SkyVoyage.showToast('Loading deal details...', 'info');
        }
    }
    
    bookDeal() {
        const dealId = this.card.getAttribute('data-deal-id');
        if (dealId) {
            // In a real implementation, this would redirect to booking
            SkyVoyage.showToast('Redirecting to booking...', 'info');
            setTimeout(() => {
                window.location.href = `/flights/book/${dealId}`;
            }, 1000);
        }
    }
    
    toggleWishlist(icon) {
        icon.classList.toggle('active');
        const heartIcon = icon.querySelector('i');
        
        if (icon.classList.contains('active')) {
            heartIcon.classList.remove('far', 'fa-heart');
            heartIcon.classList.add('fas', 'fa-heart');
            SkyVoyage.showToast('Added to wishlist!');
        } else {
            heartIcon.classList.remove('fas', 'fa-heart');
            heartIcon.classList.add('far', 'fa-heart');
            SkyVoyage.showToast('Removed from wishlist!');
        }
    }
}

// Notification Component
class NotificationComponent {
    constructor() {
        this.notificationBtn = document.getElementById('notificationBtn');
        this.notificationCount = document.getElementById('notificationCount');
        this.notificationsList = document.getElementById('notificationsList');
        
        this.init();
    }
    
    init() {
        if (!this.notificationBtn) return;
        
        // Load notifications
        this.loadNotifications();
        
        // Set up dropdown
        new Dropdown('notificationBtn');
    }
    
    async loadNotifications() {
        try {
            const response = await fetch('/api/notifications');
            const notifications = await response.json();
            
            this.updateNotificationCount(notifications);
            this.renderNotifications(notifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    updateNotificationCount(notifications) {
        if (!this.notificationCount) return;
        
        const unreadCount = notifications.filter(n => !n.read_status).length;
        this.notificationCount.textContent = unreadCount;
        this.notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    renderNotifications(notifications) {
        if (!this.notificationsList) return;
        
        this.notificationsList.innerHTML = notifications.slice(0, 3).map(notification => `
            <div class="notification-item ${notification.read_status ? 'read' : ''}" 
                 onclick="markNotificationAsRead(${notification.id})">
                <div class="notification-icon">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <p>${notification.message}</p>
                    <span class="notification-time">${this.formatTime(notification.created_at)}</span>
                </div>
            </div>
        `).join('');
    }
    
    getNotificationIcon(type) {
        const icons = {
            'booking': 'plane',
            'promotion': 'percent',
            'loyalty': 'star',
            'system': 'cog',
            'alert': 'exclamation-triangle'
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
        
        if (minutes < 60) {
            return `${minutes} minutes ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else {
            return `${days} days ago`;
        }
    }
}

// AI Concierge Component
class AIConcierge {
    constructor() {
        this.conciergeBtn = document.getElementById('aiConciergeBtn');
        this.modal = new Modal('aiConciergeModal');
        this.messages = [];
        
        this.init();
    }
    
    init() {
        if (!this.conciergeBtn) return;
        
        this.conciergeBtn.addEventListener('click', () => {
            this.openConcierge();
        });
    }
    
    openConcierge() {
        this.modal.open();
        this.loadInitialMessages();
    }
    
    loadInitialMessages() {
        this.messages = [
            { sender: 'ai', content: "Hi! I'm your AI travel assistant. How can I help you today?" },
            { sender: 'user', content: "What's the status of my flight to London?" },
            { sender: 'ai', content: "Your flight BA 178 from JFK to LHR is on time. Departure is at 7:30 AM from Terminal 7. Would you like me to check the weather in London or help with anything else?" }
        ];
        
        this.renderMessages();
    }
    
    renderMessages() {
        const chatContainer = document.querySelector('.chat-messages');
        if (!chatContainer) return;
        
        chatContainer.innerHTML = this.messages.map(msg => `
            <div class="message ${msg.sender === 'ai' ? 'ai-message' : 'user-message'}">
                <div class="message-content">
                    ${msg.content}
                </div>
            </div>
        `).join('');
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    async sendMessage(message) {
        if (!message.trim()) return;
        
        // Add user message
        this.messages.push({ sender: 'user', content: message });
        this.renderMessages();
        
        // Simulate AI response
        setTimeout(() => {
            const response = this.generateAIResponse(message);
            this.messages.push({ sender: 'ai', content: response });
            this.renderMessages();
        }, 1000);
    }
    
    generateAIResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('flight')) {
            return "Your flight BA 178 from JFK to LHR is on time. Departure is at 7:30 AM from Terminal 7.";
        } else if (lowerMessage.includes('hotel')) {
            return "I see you've booked the Park Plaza Westminster Bridge. Check-in is at 3 PM. Would you like me to request early check-in?";
        } else if (lowerMessage.includes('weather')) {
            return "In London, it's currently 18°C and partly cloudy. The forecast for your stay shows mild temperatures with a chance of rain on Tuesday.";
        } else if (lowerMessage.includes('restaurant') || lowerMessage.includes('eat')) {
            return "Based on your preferences, I recommend Dishoom Covent Garden for amazing Indian cuisine or Gordon Ramsay's Savoy Grill for a fine dining experience. Would you like me to make a reservation?";
        } else {
            return "I'm here to help with your travel needs. You can ask me about flights, hotels, weather, restaurants, or any other travel-related questions.";
        }
    }
}

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        new Modal(modal.id);
    });
    
    // Initialize toast
    window.toast = new Toast();
    
    // Initialize search component
    new SearchComponent();
    
    // Initialize flight cards
    const flightCards = document.querySelectorAll('.flight-card');
    flightCards.forEach(card => {
        new FlightCard(card);
    });
    
    // Initialize deal cards
    const dealCards = document.querySelectorAll('.deal-card');
    dealCards.forEach(card => {
        new DealCard(card);
    });
    
    // Initialize notification component
    new NotificationComponent();
    
    // Initialize AI concierge
    new AIConcierge();
    
    // Initialize dropdowns
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        new Dropdown(dropdown.id);
    });
});

// Global functions for backward compatibility
function markNotificationAsRead(notificationId) {
    fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            SkyVoyage.showToast('Notification marked as read');
            // Reload notifications
            if (window.notificationComponent) {
                window.notificationComponent.loadNotifications();
            }
        }
    })
    .catch(error => {
        console.error('Error marking notification as read:', error);
    });
}

function sendAIMessage() {
    const input = document.querySelector('#aiConciergeModal .search-input');
    const message = input.value.trim();
    
    if (message && window.aiConcierge) {
        window.aiConcierge.sendMessage(message);
        input.value = '';
    }
}

function askAI(question) {
    const input = document.querySelector('#aiConciergeModal .search-input');
    if (input) {
        input.value = question;
        sendAIMessage();
    }
}

// Export for use in other scripts
window.SkyVoyageComponents = {
    Modal,
    Toast,
    Dropdown,
    SearchComponent,
    FlightCard,
    DealCard,
    NotificationComponent,
    AIConcierge
};