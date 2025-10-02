// Authentication JavaScript for SkyVoyage

// Form validation utilities
const FormValidator = {
    // Email validation
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Password strength validation
    checkPasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
        
        Object.values(checks).forEach(check => {
            if (check) score++;
        });
        
        return {
            score: score,
            strength: score < 2 ? 'weak' : score < 3 ? 'medium' : score < 4 ? 'strong' : 'very-strong',
            checks: checks
        };
    },
    
    // Phone number validation
    isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },
    
    // Date validation
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },
    
    // Age validation (must be 18+)
    isValidAge(dateString) {
        const birthDate = new Date(dateString);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 18;
        }
        
        return age >= 18;
    }
};

// Password visibility toggle
function setupPasswordToggle(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.innerHTML = '<i class="fas fa-eye"></i>';
    toggle.style.cssText = `
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 5px;
        z-index: 10;
    `;
    
    const inputGroup = input.parentElement;
    inputGroup.style.position = 'relative';
    inputGroup.appendChild(toggle);
    
    toggle.addEventListener('click', function() {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
}

// Password strength indicator
function setupPasswordStrength(inputId, indicatorId) {
    const input = document.getElementById(inputId);
    const indicator = document.getElementById(indicatorId);
    
    if (!input || !indicator) return;
    
    input.addEventListener('input', function() {
        const password = this.value;
        const strength = FormValidator.checkPasswordStrength(password);
        
        // Update strength bar
        const strengthBar = indicator.querySelector('.password-strength-bar');
        if (strengthBar) {
            strengthBar.className = 'password-strength-bar';
            strengthBar.classList.add(strength.strength);
        }
        
        // Update strength text
        const strengthText = indicator.querySelector('.strength-text');
        if (strengthText) {
            strengthText.textContent = `Password strength: ${strength.strength}`;
            strengthText.className = `strength-text ${strength.strength}`;
        }
    });
}

// Real-time form validation
function setupFormValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        // Real-time validation
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            // Clear previous error state
            this.classList.remove('error');
            const errorMsg = this.parentElement.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        });
    });
    
    // Form submission validation
    form.addEventListener('submit', function(e) {
        let isValid = true;
        
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            e.preventDefault();
            SkyVoyage.showToast('Please fix the errors in the form', 'error');
        }
    });
}

// Validate individual field
function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const required = field.hasAttribute('required');
    
    // Clear previous error state
    field.classList.remove('error');
    const existingError = field.parentElement.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Required field validation
    if (required && !value) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    // Type-specific validation
    switch (type) {
        case 'email':
            if (value && !FormValidator.isValidEmail(value)) {
                showFieldError(field, 'Please enter a valid email address');
                return false;
            }
            break;
            
        case 'password':
            if (value && value.length < 6) {
                showFieldError(field, 'Password must be at least 6 characters long');
                return false;
            }
            break;
            
        case 'tel':
            if (value && !FormValidator.isValidPhone(value)) {
                showFieldError(field, 'Please enter a valid phone number');
                return false;
            }
            break;
            
        case 'date':
            if (value && !FormValidator.isValidDate(value)) {
                showFieldError(field, 'Please enter a valid date');
                return false;
            }
            
            // Age validation for date of birth
            if (field.id === 'dateOfBirth' && value && !FormValidator.isValidAge(value)) {
                showFieldError(field, 'You must be at least 18 years old');
                return false;
            }
            break;
            
        case 'url':
            if (value) {
                try {
                    new URL(value);
                } catch {
                    showFieldError(field, 'Please enter a valid URL');
                    return false;
                }
            }
            break;
    }
    
    // Custom validation for specific fields
    if (field.id === 'confirmPassword') {
        const passwordField = document.getElementById('password');
        if (passwordField && value !== passwordField.value) {
            showFieldError(field, 'Passwords do not match');
            return false;
        }
    }
    
    // IATA/ICAO code validation
    if (field.id === 'iataCode' && value && value.length !== 3) {
        showFieldError(field, 'IATA code must be exactly 3 characters');
        return false;
    }
    
    if (field.id === 'icaoCode' && value && value.length !== 4) {
        showFieldError(field, 'ICAO code must be exactly 4 characters');
        return false;
    }
    
    return true;
}

// Show field error
function showFieldError(field, message) {
    field.classList.add('error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    field.parentElement.appendChild(errorDiv);
}

// Auto-format input fields
function setupInputFormatting() {
    // Phone number formatting
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function() {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 10) {
                value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            }
            this.value = value;
        });
    });
    
    // IATA/ICAO code formatting
    const iataInput = document.getElementById('iataCode');
    const icaoInput = document.getElementById('icaoCode');
    
    if (iataInput) {
        iataInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase().substring(0, 3);
        });
    }
    
    if (icaoInput) {
        icaoInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase().substring(0, 4);
        });
    }
    
    // Postal code formatting
    const postalInput = document.getElementById('postalCode');
    if (postalInput) {
        postalInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }
}

// Loading state management
function setupLoadingStates() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"], input[type="submit"]');
            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
                
                const originalText = submitBtn.textContent || submitBtn.value;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                
                // Re-enable after 10 seconds (fallback)
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    submitBtn.classList.remove('loading');
                }, 10000);
            }
        });
    });
}

// Initialize authentication features
document.addEventListener('DOMContentLoaded', function() {
    // Setup password toggles
    setupPasswordToggle('password');
    setupPasswordToggle('confirmPassword');
    setupPasswordToggle('registerPassword');
    
    // Setup password strength indicators
    setupPasswordStrength('password', 'passwordStrength');
    setupPasswordStrength('registerPassword', 'passwordStrength');
    
    // Setup form validation
    setupFormValidation('registerForm');
    setupFormValidation('vendorRegisterForm');
    setupFormValidation('loginForm');
    setupFormValidation('vendorLoginForm');
    setupFormValidation('adminLoginForm');
    
    // Setup input formatting
    setupInputFormatting();
    
    // Setup loading states
    setupLoadingStates();
    
    // Initialize date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            
            if (input.id === 'departure') {
                input.valueAsDate = today;
            } else if (input.id === 'return') {
                input.valueAsDate = nextWeek;
            }
        }
    });
    
    // Setup auth tab switching
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            authTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show/hide forms
            const forms = document.querySelectorAll('.auth-form');
            forms.forEach(form => {
                form.classList.remove('active');
            });
            
            const targetForm = document.getElementById(tabName + 'Form');
            if (targetForm) {
                targetForm.classList.add('active');
            }
        });
    });
    
    // Auto-hide alerts
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
    
    // Focus management
    const firstInput = document.querySelector('input:not([type="hidden"]), textarea, select');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
});

// Utility functions
function showToast(message, type = 'success') {
    if (window.SkyVoyage && window.SkyVoyage.showToast) {
        window.SkyVoyage.showToast(message, type);
    } else {
        alert(message);
    }
}

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

// Export for use in other scripts
window.AuthUtils = {
    FormValidator,
    setupPasswordToggle,
    setupPasswordStrength,
    setupFormValidation,
    validateField,
    showFieldError,
    setupInputFormatting,
    setupLoadingStates,
    showToast,
    formatCurrency,
    formatDate
};