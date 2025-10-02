// SkyVoyage Frontend Application
class SkyVoyageApp {
    constructor() {
        this.currentUser = null;
        this.apiBaseUrl = '/api';
        this.isAuthenticated = false;
        
        // Initialize the application
        this.init();
    }

    async init() {
        // Check authentication status
        await this.checkAuthStatus();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Initialize UI components
        this.initUIComponents();
        
        // Load initial data
        this.loadInitialData();
    }

    // Authentication Methods
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.updateUIForAuthenticated();
            } else {
                this.isAuthenticated = false;
                this.updateUIForGuest();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.isAuthenticated = false;
            this.updateUIForGuest();
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.updateUIForAuthenticated();
                this.showToast('Login successful!');
                this.closeModal('authModal');
                return { success: true };
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    async register(userData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.updateUIForAuthenticated();
                this.showToast('Registration successful!');
                this.closeModal('authModal');
                return { success: true };
            } else {
                throw new Error(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showToast(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await fetch(`${this.apiBaseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            this.currentUser = null;
            this.isAuthenticated = false;
            this.updateUIForGuest();
            this.showToast('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Flight Search Methods
    async searchFlights(searchParams) {
        try {
            this.showLoader();
            
            const queryParams = new URLSearchParams(searchParams);
            const response = await fetch(`${this.apiBaseUrl}/flight/search?${queryParams}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.displayFlightResults(data);
                return data;
            } else {
                throw new Error('Flight search failed');
            }
        } catch (error) {
            console.error('Flight search error:', error);
            this.showToast('Flight search failed', 'error');
        } finally {
            this.hideLoader();
        }
    }

    async getPopularDestinations() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/flight/destinations/popular`);
            if (response.ok) {
                const data = await response.json();
                return data.destinations;
            }
        } catch (error) {
            console.error('Error fetching destinations:', error);
        }
        return [];
    }

    async getFlightDeals() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/flight/deals/current`);
            if (response.ok) {
                const data = await response.json();
                return data.deals;
            }
        } catch (error) {
            console.error('Error fetching deals:', error);
        }
        return [];
    }

    // User Data Methods
    async getUserNotifications() {
        if (!this.isAuthenticated) return [];
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/notifications`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                return data.notifications;
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
        return [];
    }

    async getLoyaltyInfo() {
        if (!this.isAuthenticated) return null;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/user/loyalty`, {
                credentials: 'include'
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching loyalty info:', error);
        }
        return null;
    }

    // UI Update Methods
    updateUIForAuthenticated() {
        // Hide auth buttons, show user menu
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('notificationBtn').style.display = 'block';
        document.getElementById('userBtn').style.display = 'flex';
        document.getElementById('sidebarLogoutItem').style.display = 'block';

        // Update user info
        if (this.currentUser) {
            const initials = (this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0)).toUpperCase();
            document.querySelectorAll('.user-avatar').forEach(avatar => {
                avatar.textContent = initials;
            });
            
            document.querySelectorAll('.user-profile span').forEach(span => {
                span.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            });

            // Update stats
            if (this.currentUser.loyaltyPoints) {
                document.getElementById('loyaltyPointsCount').textContent = this.currentUser.loyaltyPoints.toLocaleString();
            }
        }
    }

    updateUIForGuest() {
        // Show auth buttons, hide user menu
        document.getElementById('authButtons').style.display = 'flex';
        document.getElementById('notificationBtn').style.display = 'none';
        document.getElementById('userBtn').style.display = 'none';
        document.getElementById('sidebarLogoutItem').style.display = 'none';
    }

    displayFlightResults(data) {
        const container = document.getElementById('flight-results-container');
        const resultsSection = document.getElementById('search-results');
        const resultCount = document.getElementById('resultCount');

        if (!data.outboundFlights || data.outboundFlights.length === 0) {
            container.innerHTML = '<div class="no-results">No flights found for your search criteria.</div>';
            resultCount.textContent = '0 flights found';
            resultsSection.style.display = 'block';
            return;
        }

        resultCount.textContent = `${data.outboundFlights.length} flights found from ${data.searchParams.from.city} to ${data.searchParams.to.city}`;

        container.innerHTML = data.outboundFlights.map(flight => {
            const departureTime = new Date(flight.departure_datetime);
            const arrivalTime = new Date(flight.arrival_datetime);
            
            return `
                <div class="flight-card-enhanced" data-flight-id="${flight.id}">
                    <div class="flight-info-enhanced">
                        <div class="airline-logo">
                            <i class="fas fa-plane"></i>
                        </div>
                        <div class="flight-times">
                            <div class="flight-time">${departureTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div class="flight-date">${departureTime.toLocaleDateString()}</div>
                            <div class="flight-code">${flight.flight_number}</div>
                        </div>
                        <div class="flight-duration">
                            <span>${Math.floor(flight.flight_duration / 60)}h ${flight.flight_duration % 60}m</span>
                        </div>
                        <div class="flight-times">
                            <div class="flight-time">${arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div class="flight-date">${arrivalTime.toLocaleDateString()}</div>
                        </div>
                        <div class="flight-details">
                            <div>${flight.airline_name}</div>
                            <div>${flight.origin_code} → ${flight.dest_code}</div>
                            ${flight.wifi_available ? '<i class="fas fa-wifi" title="WiFi Available"></i>' : ''}
                            ${flight.meal_service ? '<i class="fas fa-utensils" title="Meal Service"></i>' : ''}
                        </div>
                    </div>
                    <div class="flight-price">
                        <div class="flight-price-amount">$${flight.price}</div>
                        <div class="flight-price-desc">per person</div>
                        <button class="btn-primary book-flight-btn" data-flight-id="${flight.id}">Book Now</button>
                    </div>
                </div>
            `;
        }).join('');

        resultsSection.style.display = 'block';
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Event Listeners
    initEventListeners() {
        // Authentication events
        document.getElementById('headerLoginBtn').addEventListener('click', () => this.showLoginForm());
        document.getElementById('headerRegisterBtn').addEventListener('click', () => this.showRegisterForm());
        document.getElementById('sidebarLoginBtn').addEventListener('click', () => this.showLoginForm());
        document.getElementById('sidebarRegisterBtn').addEventListener('click', () => this.showRegisterForm());
        document.getElementById('sidebarLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Modal events
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Auth form events
        document.getElementById('loginForm').addEventListener('submit', this.handleLoginForm.bind(this));
        document.getElementById('registerForm').addEventListener('submit', this.handleRegisterForm.bind(this));

        // Auth tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchAuthTab(tabName);
            });
        });

        // Flight search events
        document.getElementById('search-flights').addEventListener('click', this.handleFlightSearch.bind(this));
        document.getElementById('headerSearchBtn').addEventListener('click', this.handleHeaderSearch.bind(this));

        // Booking type selection
        document.querySelectorAll('.booking-type').forEach(type => {
            type.addEventListener('click', () => {
                document.querySelectorAll('.booking-type').forEach(t => t.classList.remove('active'));
                type.classList.add('active');
            });
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', this.toggleTheme.bind(this));

        // Mobile menu toggle
        document.querySelector('.menu-toggle').addEventListener('click', this.toggleSidebar.bind(this));

        // Dropdown toggles
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = dropdown.querySelector('.dropdown-content');
                const isVisible = content.style.display === 'block';
                
                // Close all dropdowns
                document.querySelectorAll('.dropdown-content').forEach(item => {
                    item.style.display = 'none';
                });
                
                // Open this dropdown if it wasn't already open
                if (!isVisible) {
                    content.style.display = 'block';
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-content').forEach(item => {
                item.style.display = 'none';
            });
        });

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    // Event Handlers
    async handleLoginForm(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        await this.login(email, password);
    }

    async handleRegisterForm(e) {
        e.preventDefault();
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        await this.register({ firstName, lastName, email, password });
    }

    async handleFlightSearch() {
        const from = document.getElementById('searchFrom').value;
        const to = document.getElementById('searchTo').value;
        const departure = document.getElementById('searchDeparture').value;
        const returnDate = document.getElementById('searchReturn').value;
        const passengers = document.getElementById('searchPassengers').value;
        const flightClass = document.getElementById('searchClass').value;

        if (!from || !to || !departure) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        const searchParams = {
            from,
            to,
            departure,
            passengers: parseInt(passengers.split(' ')[0]),
            class: flightClass.toLowerCase().replace(' ', '_')
        };

        if (returnDate) {
            searchParams.return = returnDate;
        }

        await this.searchFlights(searchParams);
    }

    handleHeaderSearch() {
        const from = document.getElementById('headerFrom').value;
        const to = document.getElementById('headerTo').value;
        const date = document.getElementById('headerDate').value;

        if (from) document.getElementById('searchFrom').value = from;
        if (to) document.getElementById('searchTo').value = to;
        if (date) document.getElementById('searchDeparture').value = date;

        if (from && to && date) {
            this.handleFlightSearch();
        } else {
            // Scroll to search form
            document.querySelector('.flight-search-form').scrollIntoView({ behavior: 'smooth' });
        }
    }

    // UI Helper Methods
    showLoginForm() {
        this.switchAuthTab('login');
        this.showModal('authModal');
    }

    showRegisterForm() {
        this.switchAuthTab('register');
        this.showModal('authModal');
    }

    switchAuthTab(tabName) {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Form`).classList.add('active');
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showLoader() {
        document.getElementById('loader').style.display = 'block';
        document.getElementById('search-results').style.display = 'none';
    }

    hideLoader() {
        document.getElementById('loader').style.display = 'none';
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        
        toastMessage.textContent = message;
        
        // Set toast color based on type
        if (type === 'error') {
            toast.style.background = 'var(--danger)';
        } else {
            toast.style.background = 'var(--success)';
        }
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    toggleTheme() {
        const themeThumb = document.querySelector('.theme-thumb');
        themeThumb.classList.toggle('dark');
        document.body.classList.toggle('light-mode');
        
        const isDark = !document.body.classList.contains('light-mode');
        this.showToast(isDark ? 'Dark mode activated' : 'Light mode activated');
    }

    toggleSidebar() {
        document.querySelector('.sidebar').classList.toggle('active');
    }

    initUIComponents() {
        // Set initial date values
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        document.getElementById('searchDeparture').valueAsDate = today;
        document.getElementById('searchReturn').valueAsDate = nextWeek;
        document.getElementById('headerDate').valueAsDate = today;
    }

    async loadInitialData() {
        try {
            // Load notifications count
            if (this.isAuthenticated) {
                const notifications = await this.getUserNotifications();
                if (notifications.length > 0) {
                    document.getElementById('notificationCount').textContent = notifications.length;
                    document.querySelector('.notification-badge').textContent = notifications.filter(n => !n.is_read).length;
                }

                // Load loyalty info
                const loyaltyInfo = await this.getLoyaltyInfo();
                if (loyaltyInfo) {
                    document.getElementById('loyaltyPointsCount').textContent = loyaltyInfo.loyaltyPoints.toLocaleString();
                }
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Airport search with autocomplete
    async searchAirports(query) {
        if (query.length < 2) return [];
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/flight/airports/search?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                return data.airports;
            }
        } catch (error) {
            console.error('Airport search error:', error);
        }
        return [];
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.skyVoyageApp = new SkyVoyageApp();
});