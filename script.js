// Theme Management
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('portfolio-theme') || 'terminal';
        this.themes = ['terminal', 'modern', 'neon', 'minimal'];
        this.init();
    }

    init() {
        this.setTheme(this.currentTheme);
        this.bindEvents();
        this.initTypingAnimation();
    }

    setTheme(themeName) {
        if (!this.themes.includes(themeName)) return;
        
        document.body.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;
        localStorage.setItem('portfolio-theme', themeName);
        
        // Update active theme option
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-theme') === themeName) {
                option.classList.add('active');
            }
        });
    }

    bindEvents() {
        // Theme switcher button
        const themeSwitcher = document.getElementById('themeSwitcher');
        const themeModal = document.getElementById('themeModal');
        
        if (themeSwitcher && themeModal) {
            themeSwitcher.addEventListener('click', () => {
                themeModal.classList.add('active');
            });

            // Close modal when clicking outside
            themeModal.addEventListener('click', (e) => {
                if (e.target === themeModal) {
                    themeModal.classList.remove('active');
                }
            });

            // Theme option selection
            const themeOptions = document.querySelectorAll('.theme-option');
            themeOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const selectedTheme = option.getAttribute('data-theme');
                    this.setTheme(selectedTheme);
                    themeModal.classList.remove('active');
                });
            });
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && themeModal.classList.contains('active')) {
                themeModal.classList.remove('active');
            }
        });
    }

    initTypingAnimation() {
        const typingElement = document.querySelector('.typing-text');
        if (!typingElement) return;

        const text = "Hi, I am Ethan Cao";
        const speed = 100;
        let i = 0;

        typingElement.textContent = '';

        function typeWriter() {
            if (i < text.length) {
                typingElement.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        }

        // Start typing animation after a brief delay
        setTimeout(typeWriter, 500);
    }
}

// Smooth Scrolling Navigation
class Navigation {
    constructor() {
        this.init();
    }

    init() {
        this.handleSmoothScrolling();
        this.handleActiveNavLinks();
        this.handleMobileNavigation();
    }

    handleSmoothScrolling() {
        // Smooth scrolling for nav links
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const navHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = targetElement.offsetTop - navHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    handleActiveNavLinks() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

        window.addEventListener('scroll', () => {
            let current = '';
            const navHeight = document.querySelector('.navbar').offsetHeight;

            sections.forEach(section => {
                const sectionTop = section.offsetTop - navHeight - 100;
                const sectionHeight = section.offsetHeight;
                
                if (window.pageYOffset >= sectionTop && 
                    window.pageYOffset < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }

    handleMobileNavigation() {
        // Add mobile navigation toggle if needed
        // This can be expanded for mobile hamburger menu
    }
}

// Project Cards Animation
class ProjectAnimation {
    constructor() {
        this.init();
    }

    init() {
        this.observeProjectCards();
        this.handleProjectHovers();
        this.enableInteractiveCards();
    }

    observeProjectCards() {
        const projectCards = document.querySelectorAll('.project-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationDelay = `${entry.target.dataset.delay || 0}ms`;
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        projectCards.forEach((card, index) => {
            card.dataset.delay = index * 200;
            observer.observe(card);
        });
    }

    handleProjectHovers() {
        const projectCards = document.querySelectorAll('.project-card:not(.coming-soon)');
        
        projectCards.forEach(card => {
            const overlay = card.querySelector('.project-overlay');
            const image = card.querySelector('.project-image img');
            
            card.addEventListener('mouseenter', () => {
                if (overlay) overlay.style.opacity = '1';
                if (image) image.style.transform = 'scale(1.05)';
            });

            card.addEventListener('mouseleave', () => {
                if (overlay) overlay.style.opacity = '0';
                if (image) image.style.transform = 'scale(1)';
            });
        });
    }

    enableInteractiveCards() {
        const cards = document.querySelectorAll('.project-card:not(.coming-soon)');
        const maxTilt = 12; // degrees

        cards.forEach(card => {
            card.classList.add('interactive');
            card.style.transformStyle = 'preserve-3d';

            const handleMove = (e) => {
                const rect = card.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const mouseX = e.clientX - centerX;
                const mouseY = e.clientY - centerY;
                
                const rotateX = (mouseY / (rect.height / 2)) * -maxTilt;
                const rotateY = (mouseX / (rect.width / 2)) * maxTilt;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            };

            const reset = () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
            };

            card.addEventListener('mouseenter', () => {
                card.style.transition = 'none';
            });

            card.addEventListener('mousemove', handleMove);
            
            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.3s ease';
                reset();
            });

            // Make whole card clickable (unless clicking a link/button inside)
            card.addEventListener('click', (e) => {
                const interactive = e.target.closest('a, button');
                if (interactive) return;
                const detailsLink = card.querySelector('.project-actions a[href]') || card.querySelector('.project-image a[href]');
                if (detailsLink && detailsLink.getAttribute('href')) {
                    window.location.href = detailsLink.getAttribute('href');
                }
            });
        });
    }
}


// Contact Form Handler
class ContactForm {
    constructor() {
        this.init();
    }

    init() {
        const form = document.querySelector('.contact-form form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Here you would typically send the data to a server
        // For now, we'll just show a success message
        this.showMessage('Message sent successfully! I\'ll get back to you soon.', 'success');
        
        // Reset form
        e.target.reset();
    }

    showMessage(message, type) {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `form-message ${type}`;
        messageEl.textContent = message;
        
        // Style the message
        Object.assign(messageEl.style, {
            padding: '1rem',
            marginTop: '1rem',
            borderRadius: '6px',
            textAlign: 'center',
            fontWeight: '500',
            backgroundColor: type === 'success' ? 'var(--accent-primary)' : '#ff4444',
            color: 'var(--bg-primary)',
            opacity: '0',
            transform: 'translateY(10px)',
            transition: 'all 0.3s ease'
        });

        // Add to form
        const form = document.querySelector('.contact-form form');
        form.appendChild(messageEl);

        // Animate in
        setTimeout(() => {
            messageEl.style.opacity = '1';
            messageEl.style.transform = 'translateY(0)';
        }, 100);

        // Remove after 5 seconds
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 5000);
    }
}


// Performance and Utility Functions
class Utils {
    static debounce(func, wait) {
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

    static throttle(func, limit) {
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
}

// Add CSS animations dynamically
function addAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(50px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .animate-in {
            /* animation: fadeInUp 0.6s ease forwards; */
            opacity: 1;
            transform: translateY(0);
        }
        


        .nav-link.active {
            color: var(--accent-primary) !important;
        }

        .nav-link.active::after {
            width: 100% !important;
        }

        .theme-option.active {
            border-color: var(--accent-primary) !important;
            background: var(--accent-primary) !important;
            color: var(--bg-primary) !important;
        }
    `;
    document.head.appendChild(style);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add animations
    addAnimations();
    
    // Initialize all components
    new ThemeManager();
    new Navigation();
    new ProjectAnimation();
    new ContactForm();

    // Add 3D card tilt effect
    initCardTilt();

    // Add scroll-based navbar background
    const navbar = document.querySelector('.navbar');
    const handleScroll = Utils.throttle(() => {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(0, 0, 0, 0.95)';
        } else {
            navbar.style.background = 'rgba(0, 0, 0, 0.9)';
        }
    }, 10);

    window.addEventListener('scroll', handleScroll);

    // Preload images for better performance
    const imagesToPreload = [
        'https://via.placeholder.com/400x250/1a1a1a/00ff00?text=Bonsai+Robotics',
        'https://via.placeholder.com/400x250/1a1a1a/00ff00?text=Wordle+Solver',
        'https://via.placeholder.com/400x250/1a1a1a/666666?text=Coming+Soon'
    ];

    imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
    });

    console.log('🔐 Cybersecurity Portfolio Loaded Successfully');
    console.log('Current Theme:', localStorage.getItem('portfolio-theme') || 'terminal');
});

// Simple 3D card tilt function
function initCardTilt() {
    console.log('🔧 Initializing card tilt...');
    const cards = document.querySelectorAll('.project-card:not(.coming-soon)');
    console.log('Found cards:', cards.length);
    
    cards.forEach((card, index) => {
        let isHovering = false;
        
        // Remove any existing event listeners
        card.removeEventListener('mouseenter', card._mouseenter);
        card.removeEventListener('mouseleave', card._mouseleave);
        card.removeEventListener('mousemove', card._mousemove);
        
        // Define the event handlers
        card._mouseenter = () => {
            isHovering = true;
            console.log('Card', index, 'entered');
        };
        
        card._mouseleave = () => {
            isHovering = false;
            card.style.setProperty('transform', 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)', 'important');
            console.log('Card', index, 'left');
        };
        
        card._mousemove = (e) => {
            if (!isHovering) return;
            
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            // Moderate tilt - balanced effect
            const rotateX = (y - centerY) / centerY * -15;  // Reduced from -25
            const rotateY = (x - centerX) / centerX * 15;   // Reduced from 25
            
            // Balanced effects
            card.style.setProperty('transform', `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px) scale3d(1.02, 1.02, 1.02)`, 'important');
        };
        
        // Add event listeners
        card.addEventListener('mouseenter', card._mouseenter);
        card.addEventListener('mouseleave', card._mouseleave);
        card.addEventListener('mousemove', card._mousemove);

        // Make whole card clickable
        card.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;
            const link = card.querySelector('.project-actions a, .project-image a');
            if (link) {
                link.click();
            }
        });
    });
    
    console.log('Card tilt initialization complete');
}


