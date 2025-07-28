// Global variables
let particles = [];
let mouse = { x: 0, y: 0 };
let lastScrollY = 0;
let ticking = false;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize all components
    initPreloader();
    initParticles();
    initNavigation();
    initScrollAnimations();
    initThemeToggle();
    initTabSwitching();
    initFAQ();
    initContactForm();
    initMouseParallax();
    initSmoothScrolling();

    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Preloader
function initPreloader() {
    const preloader = document.getElementById('preloader');

    // Hide preloader after 2.5 seconds
    setTimeout(() => {
        preloader.classList.add('hidden');
        // Remove from DOM after transition
        setTimeout(() => {
            preloader.remove();
        }, 500);
    }, 2500);
}

// Particles Animation
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles
    function createParticles() {
        particles = [];
        const particleCount = Math.min(100, Math.floor(window.innerWidth / 10));

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    function updateParticles() {
        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Wrap around edges
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;

            // Mouse interaction
            const dx = mouse.x - particle.x;
            const dy = mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                const force = (100 - distance) / 100;
                particle.x -= dx * force * 0.01;
                particle.y -= dy * force * 0.01;
            }
        });
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connections
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') + '20';
        ctx.lineWidth = 1;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw particles
        particles.forEach(particle => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
            ctx.fill();
        });
    }

    function animate() {
        updateParticles();
        drawParticles();
        requestAnimationFrame(animate);
    }

    createParticles();
    animate();

    // Update mouse position
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
}

// Navigation
function initNavigation() {
    const navbar = document.getElementById('navbar');
    let lastScrollY = window.scrollY;

    function updateNavbar() {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 100) {
            if (currentScrollY > lastScrollY) {
                navbar.classList.add('hidden');
            } else {
                navbar.classList.remove('hidden');
            }
        } else {
            navbar.classList.remove('hidden');
        }

        lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNavbar);
            ticking = true;
        }
        ticking = false;
    });
}

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');

                // Special handling for different elements
                if (entry.target.classList.contains('feature-card')) {
                    const delay = Array.from(entry.target.parentNode.children).indexOf(entry.target) * 100;
                    setTimeout(() => {
                        entry.target.style.transitionDelay = delay + 'ms';
                        entry.target.classList.add('animate');
                    }, delay);
                }

                if (entry.target.classList.contains('step')) {
                    const delay = parseInt(entry.target.dataset.step) * 200;
                    setTimeout(() => {
                        entry.target.classList.add('animate');
                    }, delay);
                }

                if (entry.target.classList.contains('faq-item')) {
                    const delay = Array.from(entry.target.parentNode.children).indexOf(entry.target) * 100;
                    setTimeout(() => {
                        entry.target.classList.add('animate');
                    }, delay);
                }
            }
        });
    }, observerOptions);

    // Observe elements
    const elementsToAnimate = document.querySelectorAll('.feature-card, .device-mockup, .step, .faq-item');
    elementsToAnimate.forEach(el => observer.observe(el));
}

// Theme Toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-toggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Tab Switching
function initTabSwitching() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Auto-switch tabs every 3 seconds
    let currentTabIndex = 0;
    const tabSwitchInterval = setInterval(() => {
        currentTabIndex = (currentTabIndex + 1) % tabs.length;
        tabs[currentTabIndex].click();
    }, 3000);

    // Pause auto-switch on hover
    const mockupInterface = document.querySelector('.mockup-interface');
    if (mockupInterface) {
        mockupInterface.addEventListener('mouseenter', () => {
            clearInterval(tabSwitchInterval);
        });
    }
}

// FAQ Accordion
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all FAQ items
            faqItems.forEach(faq => faq.classList.remove('active'));

            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// Contact Form
function initContactForm() {
    // Message Form
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');
    const formError = document.getElementById('formError');
    const errorMessage = document.getElementById('errorMessage');
    const messageTextarea = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    const messageCountSpan = document.getElementById('messageCount');
    const remainingMessages = document.getElementById('remainingMessages');
    const submitBtn = document.getElementById('submitBtn');

    // Character counter
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function() {
            const count = this.value.length;
            charCount.textContent = count;

            if (count > 950) {
                charCount.style.color = '#ef4444';
            } else if (count > 800) {
                charCount.style.color = '#f59e0b';
            } else {
                charCount.style.color = '#64748b';
            }
        });
    }

    // Check message limit on page load
    checkMessageLimit();

    function checkMessageLimit() {
        const today = new Date().toDateString();
        const messageKey = `messages_${today}`;
        const emailKey = `email_${today}`;

        const messagesData = localStorage.getItem(messageKey);
        const storedEmail = localStorage.getItem(emailKey);

        let messageCount = 0;

        if (messagesData) {
            try {
                const data = JSON.parse(messagesData);
                messageCount = data.count || 0;
            } catch (e) {
                messageCount = 0;
            }
        }

        const remaining = Math.max(0, 3 - messageCount);
        messageCountSpan.textContent = remaining;

        if (remaining === 0) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>حد مجاز ارسال پیام تمام شده</span>';
            remainingMessages.style.color = '#ef4444';
        }
    }

    function updateMessageCount(email) {
        const today = new Date().toDateString();
        const messageKey = `messages_${today}`;
        const emailKey = `email_${today}`;

        let messageData = {
            count: 0,
            lastEmail: email
        };

        const existing = localStorage.getItem(messageKey);
        if (existing) {
            try {
                messageData = JSON.parse(existing);
            } catch (e) {
                messageData = { count: 0, lastEmail: email };
            }
        }

        messageData.count += 1;
        messageData.lastEmail = email;

        localStorage.setItem(messageKey, JSON.stringify(messageData));
        localStorage.setItem(emailKey, email);

        checkMessageLimit();
    }

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!email || !message) {
                showError('لطفاً تمام فیلدها را پر کنید');
                return;
            }

            if (!isValidEmail(email)) {
                showError('لطفاً ایمیل معتبری وارد کنید');
                return;
            }

            if (message.length < 10) {
                showError('پیام باید حداقل ۱۰ کاراکتر باشد');
                return;
            }

            // Check message limit
            const today = new Date().toDateString();
            const messageKey = `messages_${today}`;
            const messagesData = localStorage.getItem(messageKey);
            let messageCount = 0;

            if (messagesData) {
                try {
                    const data = JSON.parse(messagesData);
                    messageCount = data.count || 0;
                } catch (e) {
                    messageCount = 0;
                }
            }

            if (messageCount >= 3) {
                showError('شما امروز حداکثر ۳ پیام ارسال کرده‌اید. لطفاً فردا دوباره تلاش کنید');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>در حال ارسال...</span><i class="fas fa-spinner fa-spin"></i>';

            try {
                const response = await fetch('/api/send-message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        message: message
                    })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    updateMessageCount(email);
                    showSuccess('پیام شما با موفقیت ارسال شد!');
                    contactForm.reset();
                    if (charCount) charCount.textContent = '0';
                } else {
                    throw new Error(result.error || 'خطا در ارسال پیام');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                showError(error.message || 'خطا در ارسال پیام. لطفاً دوباره تلاش کنید');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>ارسال پیام</span><i class="fas fa-paper-plane"></i>';
            }
        });
    }

    function showSuccess(message) {
        hideMessages();
        formSuccess.querySelector('span').textContent = message;
        formSuccess.style.display = 'flex';

        setTimeout(() => {
            formSuccess.style.display = 'none';
        }, 5000);
    }

    function showError(message) {
        hideMessages();
        errorMessage.textContent = message;
        formError.style.display = 'flex';

        setTimeout(() => {
            formError.style.display = 'none';
        }, 5000);
    }

    function hideMessages() {
        formSuccess.style.display = 'none';
        formError.style.display = 'none';
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Mouse Parallax Effect
function initMouseParallax() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const moveX = (x - 0.5) * 20;
        const moveY = (y - 0.5) * 20;

        const heroContent = hero.querySelector('.hero-content');
        heroContent.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });

    hero.addEventListener('mouseleave', () => {
        const heroContent = hero.querySelector('.hero-content');
        heroContent.style.transform = 'translate(0, 0)';
    });
}

// Smooth Scrolling
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link');
    const scrollIndicator = document.querySelector('.scroll-indicator');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const featuresSection = document.getElementById('features');
            if (featuresSection) {
                featuresSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
}

// Button Hover Effects
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.btn-primary');

    buttons.forEach(button => {
        button.addEventListener('mouseenter', (e) => {
            const rect = button.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = (e.clientX - rect.left) + 'px';
            ripple.style.top = (e.clientY - rect.top) + 'px';
            button.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// Back to Top Button
(function initBackToTop() {
    const backToTop = document.getElementById('back-to-top');
    if (!backToTop) return;

    // نمایش دکمه هنگام اسکرول پایین
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });

    // اسکرول نرم به بالا هنگام کلیک
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();

// Performance optimization
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

// Optimized scroll handler
const optimizedScrollHandler = debounce(() => {
    // Handle scroll-based animations here
}, 10);

window.addEventListener('scroll', optimizedScrollHandler);

// Intersection Observer for better performance
const createObserver = (callback, options = {}) => {
    const defaultOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    return new IntersectionObserver(callback, { ...defaultOptions, ...options });
};

// Error handling
window.addEventListener('error', (e) => {
    console.error('JavaScript error:', e.error);
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Register service worker when available
    });
}