// Flights JavaScript for SkyVoyage

// Flight Search Component
class FlightSearch {
    constructor() {
        this.searchForm = document.querySelector('.search-form');
        this.searchTabs = document.querySelectorAll('.search-tab');
        this.returnField = document.getElementById('returnField');
        this.loader = document.getElementById('loader');
        this.searchResults = document.getElementById('search-results');
        
        this.init();
    }
    
    init() {
        if (!this.searchForm) return;
        
        this.setupSearchTabs();
        this.setupFormValidation();
        this.setupDateInputs();
        this.setupAutocomplete();
    }
    
    setupSearchTabs() {
        this.searchTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab);
            });
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
    
    setupFormValidation() {
        this.searchForm.addEventListener('submit', (e) => {
            this.validateAndSubmit(e);
        });
    }
    
    validateAndSubmit(e) {
        const from = document.getElementById('from').value;
        const to = document.getElementById('to').value;
        const departure = document.getElementById('departure').value;
        const returnDate = document.getElementById('return').value;
        
        // Basic validation
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
        
        // Date validation
        const departureDate = new Date(departure);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (departureDate < today) {
            e.preventDefault();
            SkyVoyage.showToast('Departure date cannot be in the past', 'error');
            return;
        }
        
        // Return date validation
        if (returnDate) {
            const returnDateObj = new Date(returnDate);
            if (returnDateObj <= departureDate) {
                e.preventDefault();
                SkyVoyage.showToast('Return date must be after departure date', 'error');
                return;
            }
        }
        
        // Show loading state
        this.showLoading();
    }
    
    showLoading() {
        if (this.loader) {
            this.loader.style.display = 'block';
        }
        
        if (this.searchResults) {
            this.searchResults.style.display = 'none';
        }
    }
    
    setupDateInputs() {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        
        const departureInput = document.getElementById('departure');
        const returnInput = document.getElementById('return');
        
        if (departureInput && !departureInput.value) {
            departureInput.valueAsDate = today;
        }
        
        if (returnInput && !returnInput.value) {
            returnInput.valueAsDate = nextWeek;
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
            { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam' },
            { code: 'MAD', name: 'Madrid-Barajas Airport', city: 'Madrid' },
            { code: 'FCO', name: 'Leonardo da Vinci Airport', city: 'Rome' },
            { code: 'BCN', name: 'Barcelona-El Prat Airport', city: 'Barcelona' },
            { code: 'MUC', name: 'Munich Airport', city: 'Munich' },
            { code: 'ZUR', name: 'Zurich Airport', city: 'Zurich' }
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
}

// Flight Results Component
class FlightResults {
    constructor() {
        this.sortSelect = document.getElementById('sort-by');
        this.filterSelect = document.getElementById('filter-by');
        this.flightCards = document.querySelectorAll('.flight-card-enhanced');
        this.wishlistIcons = document.querySelectorAll('.wishlist-icon');
        
        this.init();
    }
    
    init() {
        this.setupSorting();
        this.setupFiltering();
        this.setupWishlist();
        this.setupFlightCards();
    }
    
    setupSorting() {
        if (!this.sortSelect) return;
        
        this.sortSelect.addEventListener('change', () => {
            this.sortFlights(this.sortSelect.value);
        });
    }
    
    sortFlights(sortBy) {
        const container = document.querySelector('.search-results');
        const cards = Array.from(this.flightCards);
        
        switch (sortBy) {
            case 'Price: Low to High':
                cards.sort((a, b) => {
                    const priceA = parseFloat(a.getAttribute('data-price') || 0);
                    const priceB = parseFloat(b.getAttribute('data-price') || 0);
                    return priceA - priceB;
                });
                break;
                
            case 'Price: High to Low':
                cards.sort((a, b) => {
                    const priceA = parseFloat(a.getAttribute('data-price') || 0);
                    const priceB = parseFloat(b.getAttribute('data-price') || 0);
                    return priceB - priceA;
                });
                break;
                
            case 'Duration: Shortest':
                cards.sort((a, b) => {
                    const durationA = this.parseDuration(a.querySelector('.flight-duration span')?.textContent);
                    const durationB = this.parseDuration(b.querySelector('.flight-duration span')?.textContent);
                    return durationA - durationB;
                });
                break;
                
            case 'Departure: Earliest':
                cards.sort((a, b) => {
                    const timeA = a.querySelector('.flight-time')?.textContent;
                    const timeB = b.querySelector('.flight-time')?.textContent;
                    return timeA?.localeCompare(timeB) || 0;
                });
                break;
        }
        
        // Reappend sorted cards
        cards.forEach(card => {
            container.appendChild(card);
        });
        
        SkyVoyage.showToast(`Sorted by: ${sortBy}`);
    }
    
    parseDuration(durationText) {
        if (!durationText) return 0;
        const match = durationText.match(/(\d+)h\s*(\d+)m/);
        if (match) {
            return parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        return 0;
    }
    
    setupFiltering() {
        if (!this.filterSelect) return;
        
        this.filterSelect.addEventListener('change', () => {
            this.filterFlights(this.filterSelect.value);
        });
    }
    
    filterFlights(filterBy) {
        this.flightCards.forEach(card => {
            let show = true;
            
            switch (filterBy) {
                case 'Non-stop Only':
                    const duration = card.querySelector('.flight-duration span')?.textContent;
                    if (duration && duration.includes('stop')) {
                        show = false;
                    }
                    break;
                    
                case 'Business Class':
                    const classInfo = card.querySelector('.flight-price-desc')?.textContent;
                    if (!classInfo || !classInfo.toLowerCase().includes('business')) {
                        show = false;
                    }
                    break;
            }
            
            card.style.display = show ? 'flex' : 'none';
        });
        
        SkyVoyage.showToast(`Filter applied: ${filterBy}`);
    }
    
    setupWishlist() {
        this.wishlistIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleWishlist(icon);
            });
        });
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
    
    setupFlightCards() {
        this.flightCards.forEach(card => {
            card.addEventListener('click', () => {
                this.handleFlightCardClick(card);
            });
        });
    }
    
    handleFlightCardClick(card) {
        const flightId = card.getAttribute('data-flight-id');
        if (flightId) {
            window.location.href = `/flights/details/${flightId}`;
        } else {
            // Show flight detail modal
            this.showFlightDetails(card);
        }
    }
    
    showFlightDetails(card) {
        // In a real implementation, this would show a modal with flight details
        SkyVoyage.showToast('Loading flight details...', 'info');
    }
}

// Flight Booking Component
class FlightBooking {
    constructor() {
        this.bookingForm = document.getElementById('flightBookingForm');
        this.passengerCount = document.getElementById('passengers');
        this.travelClass = document.getElementById('class');
        
        this.init();
    }
    
    init() {
        if (!this.bookingForm) return;
        
        this.setupFormValidation();
        this.setupPassengerDetails();
        this.setupPriceCalculation();
    }
    
    setupFormValidation() {
        this.bookingForm.addEventListener('submit', (e) => {
            this.validateBooking(e);
        });
    }
    
    validateBooking(e) {
        const requiredFields = this.bookingForm.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        if (!isValid) {
            e.preventDefault();
            SkyVoyage.showToast('Please fill in all required fields', 'error');
        }
    }
    
    setupPassengerDetails() {
        if (!this.passengerCount) return;
        
        this.passengerCount.addEventListener('change', () => {
            this.updatePassengerDetails();
        });
    }
    
    updatePassengerDetails() {
        const count = parseInt(this.passengerCount.value);
        const passengerDetailsContainer = document.getElementById('passengerDetails');
        
        if (!passengerDetailsContainer) return;
        
        passengerDetailsContainer.innerHTML = '';
        
        for (let i = 1; i <= count; i++) {
            const passengerDiv = document.createElement('div');
            passengerDiv.className = 'passenger-detail';
            passengerDiv.innerHTML = `
                <h4>Passenger ${i}</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="firstName${i}">First Name</label>
                        <input type="text" id="firstName${i}" name="passengerDetails[${i}][firstName]" required>
                    </div>
                    <div class="form-group">
                        <label for="lastName${i}">Last Name</label>
                        <input type="text" id="lastName${i}" name="passengerDetails[${i}][lastName]" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="dateOfBirth${i}">Date of Birth</label>
                        <input type="date" id="dateOfBirth${i}" name="passengerDetails[${i}][dateOfBirth]" required>
                    </div>
                    <div class="form-group">
                        <label for="passport${i}">Passport Number</label>
                        <input type="text" id="passport${i}" name="passengerDetails[${i}][passportNumber]">
                    </div>
                </div>
            `;
            
            passengerDetailsContainer.appendChild(passengerDiv);
        }
    }
    
    setupPriceCalculation() {
        if (!this.passengerCount || !this.travelClass) return;
        
        const updatePrice = () => {
            const count = parseInt(this.passengerCount.value);
            const travelClass = this.travelClass.value;
            
            // Mock price calculation
            let basePrice = 500; // Base economy price
            
            switch (travelClass) {
                case 'premium':
                    basePrice = 750;
                    break;
                case 'business':
                    basePrice = 1200;
                    break;
                case 'first':
                    basePrice = 2500;
                    break;
            }
            
            const totalPrice = basePrice * count;
            const priceDisplay = document.getElementById('totalPrice');
            
            if (priceDisplay) {
                priceDisplay.textContent = `$${totalPrice.toLocaleString()}`;
            }
        };
        
        this.passengerCount.addEventListener('change', updatePrice);
        this.travelClass.addEventListener('change', updatePrice);
        
        // Initial price calculation
        updatePrice();
    }
}

// Flight Status Component
class FlightStatus {
    constructor() {
        this.statusElements = document.querySelectorAll('.flight-status');
        this.init();
    }
    
    init() {
        this.statusElements.forEach(element => {
            this.updateStatus(element);
        });
    }
    
    updateStatus(element) {
        const flightNumber = element.getAttribute('data-flight-number');
        if (!flightNumber) return;
        
        // Mock status update
        const statuses = ['On Time', 'Delayed', 'Boarding', 'Departed', 'Arrived'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        element.textContent = randomStatus;
        element.className = `flight-status status-${randomStatus.toLowerCase().replace(' ', '-')}`;
    }
}

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize flight search
    new FlightSearch();
    
    // Initialize flight results
    new FlightResults();
    
    // Initialize flight booking
    new FlightBooking();
    
    // Initialize flight status
    new FlightStatus();
    
    // Setup destination card functionality
    const destinationCards = document.querySelectorAll('.destination-card');
    destinationCards.forEach(card => {
        card.addEventListener('click', function() {
            const destination = this.getAttribute('data-destination');
            const toInput = document.getElementById('to');
            if (toInput) {
                toInput.value = destination.charAt(0).toUpperCase() + destination.slice(1);
                document.querySelector('.search-form').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Setup deal card functionality
    const dealCards = document.querySelectorAll('.deal-card');
    dealCards.forEach(card => {
        card.addEventListener('click', function() {
            const dealId = this.getAttribute('data-deal-id');
            if (dealId) {
                SkyVoyage.showToast('Redirecting to booking...', 'info');
                setTimeout(() => {
                    window.location.href = `/flights/book/${dealId}`;
                }, 1000);
            }
        });
    });
    
    // Setup urgency timers
    const urgencyTimers = document.querySelectorAll('.urgency-timer');
    urgencyTimers.forEach(timer => {
        this.startUrgencyTimer(timer);
    });
});

// Utility functions
function startUrgencyTimer(timerElement) {
    let time = 86400; // 24 hours in seconds
    
    setInterval(() => {
        time--;
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;
        
        timerElement.innerHTML = `<i class="fas fa-bolt"></i> FLASH SALE: Ends in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (time <= 0) {
            time = 86400; // Reset to 24 hours
        }
    }, 1000);
}

function formatFlightTime(timeString) {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}

function formatFlightDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function calculateFlightDuration(departureTime, arrivalTime) {
    const dep = new Date(departureTime);
    const arr = new Date(arrivalTime);
    const duration = Math.round((arr - dep) / (1000 * 60)); // minutes
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    return `${hours}h ${minutes}m`;
}

// Export for use in other scripts
window.FlightUtils = {
    FlightSearch,
    FlightResults,
    FlightBooking,
    FlightStatus,
    startUrgencyTimer,
    formatFlightTime,
    formatFlightDate,
    calculateFlightDuration
};