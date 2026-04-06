
// === UTILITY FUNCTIONS ===
// Debounce helper for performance
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

document.addEventListener("DOMContentLoaded", () => {

    // --- 0. PERFORMANCE CHECK ---
    const isDesktop = window.matchMedia("(pointer: fine)").matches;

    // --- 1. SIDEBAR SYSTEM ---
    const sideBar = document.querySelector('.sidebar');
    const menu = document.querySelector('.menu-icon');
    const closeIcon = document.querySelector('.close-icon');

    if (menu && sideBar) {
        menu.addEventListener("click", () => {
            sideBar.classList.remove("close-sidebar");
            sideBar.classList.add("open-sidebar");
        });
    }

    if (closeIcon && sideBar) {
        closeIcon.addEventListener("click", () => {
            sideBar.classList.remove("open-sidebar");
            sideBar.classList.add("close-sidebar");
        });
    }

    // Close sidebar when clicking a link inside it
    if (sideBar) {
        sideBar.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', () => {
                sideBar.classList.remove("open-sidebar");
                sideBar.classList.add("close-sidebar");
            });
        });
    }

    // --- 2. ROBUST VIDEO PLAYBACK SYSTEM (Hover to Play) ---
    const videoList = document.querySelectorAll('.cinematic-video');

    videoList.forEach(video => {
        let playPromise;

        // Find the parent project-card to attach hover listeners
        const hoverTarget = video.closest('.project-card') || video.parentElement;
        if (!hoverTarget) return; // null-check fix

        const handleMouseEnter = () => {
            try {
                gsap.to(video, { scale: 1.03, duration: 0.4, ease: "power2.out" });
                playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn('Video play interrupted:', error.message);
                    });
                }
            } catch (error) {
                console.error('Error in video hover:', error);
            }
        };

        const handleMouseLeave = () => {
            try {
                gsap.to(video, { scale: 1, duration: 0.4, ease: "power2.out" });
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        video.pause();
                        video.currentTime = 0;
                    }).catch(() => {
                        video.pause();
                    });
                } else {
                    video.pause();
                }
            } catch (error) {
                console.error('Error in video leave:', error);
            }
        };

        hoverTarget.addEventListener("mouseenter", handleMouseEnter);
        hoverTarget.addEventListener("mouseleave", handleMouseLeave);
    });

    // ================================================================
    // 3. ELITE UI UPGRADES (DESKTOP)
    // ================================================================
    if (isDesktop) {

        // --- 3.1 3D TILT CARDS ---
        const tiltCards = document.querySelectorAll('.card, .project-card');

        tiltCards.forEach(card => {
            const handleTiltMove = debounce((e) => {
                try {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    const rotateX = ((y - centerY) / centerY) * -5;
                    const rotateY = ((x - centerX) / centerX) * 5;

                    gsap.to(card, {
                        duration: 0.5,
                        rotateX: rotateX,
                        rotateY: rotateY,
                        transformPerspective: 1000,
                        scale: 1.01,
                        ease: "power2.out"
                    });
                } catch (error) {
                    console.error('Error in tilt animation:', error);
                }
            }, 16); // 16ms = ~60fps

            card.addEventListener('mousemove', handleTiltMove);

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    duration: 0.8,
                    rotateX: 0,
                    rotateY: 0,
                    scale: 1,
                    ease: "power2.out"
                });
            });
        });
    }

    // --- 4. DATA DECRYPTION TEXT (FIX: preserve icons/emoji) ---
    const letters = "ABCDEF0123456789";
    const headers = document.querySelectorAll(".section-title, .developer-title, .arsenal-title, .global-title, .card h1");

    headers.forEach(header => {
        // Store original text content only (strip child elements like <i> icons)
        const childElements = [];
        header.childNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                childElements.push(node.cloneNode(true));
            }
        });

        // Get only the raw text (without icons)
        const originalText = Array.from(header.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent)
            .join('');
        
        if (!originalText.trim()) return; // Skip if no text content

        header.dataset.value = originalText;

        let interval = null;

        const animateText = () => {
            let iterations = 0;
            clearInterval(interval);

            interval = setInterval(() => {
                // Reconstruct: scrambled text + preserved child elements
                const scrambled = originalText
                    .split("")
                    .map((letter, index) => {
                        if (letter === ' ') return ' ';
                        if (index < iterations) return originalText[index];
                        return letters[Math.floor(Math.random() * letters.length)];
                    })
                    .join("");

                // Clear and rebuild
                header.textContent = scrambled;
                childElements.forEach(el => header.appendChild(el.cloneNode(true)));

                if (iterations >= originalText.length) {
                    clearInterval(interval);
                    header.textContent = originalText;
                    childElements.forEach(el => header.appendChild(el.cloneNode(true)));
                }

                iterations += 1 / 3;
            }, 30);
        };

        header.addEventListener("mouseenter", animateText);
        
        header.addEventListener("mouseleave", () => {
            clearInterval(interval);
            header.textContent = originalText;
            childElements.forEach(el => header.appendChild(el.cloneNode(true)));
        });
    });

    // --- 5. LAZY LOADING & ROBUST ERROR HANDLING FOR VIDEOS ---
    const lazyVideos = document.querySelectorAll('video[data-src]');
    if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const video = entry.target;
                    
                    if (video.dataset.src) {
                        video.src = video.dataset.src;
                        
                        video.onerror = () => {
                            console.warn(`Video failed to load: ${video.src || 'unknown source'}`);
                            video.style.display = 'none';
                            const parent = video.closest('.project-vidbox') || video.parentElement;
                            if (parent && parent.classList.contains('hud-frame')) {
                                parent.style.background = '#080020';
                                const notice = document.createElement('div');
                                notice.style.cssText = 'color:rgba(255,255,255,0.5); font-size:12px; text-align:center; padding:20px;';
                                notice.textContent = 'Video Unavailable';
                                parent.appendChild(notice);
                            }
                        };

                        video.load();
                        if (video.hasAttribute('autoplay')) {
                            const playPromise = video.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(() => { /* silent catch */ });
                            }
                        }
                    }

                    videoObserver.unobserve(video);
                }
            });
        });

        lazyVideos.forEach(video => videoObserver.observe(video));
    }

    // --- 6. ACCESSIBILITY: Keyboard Navigation for Cards ---
    const focusableCards = document.querySelectorAll('.card, .project-card');
    focusableCards.forEach(card => {
        if (!card.hasAttribute('tabindex')) {
            card.setAttribute('tabindex', '0');
        }
        card.setAttribute('role', 'article');
    });

    // --- 7. STEALTH MODE THEME TOGGLE ---
    const themeToggle = document.getElementById('stealth-toggle');
    if (themeToggle) {
        // Check for saved preference
        const savedTheme = localStorage.getItem('portfolio-theme');
        if (savedTheme === 'stealth') {
            document.body.classList.add('stealth-mode');
            themeToggle.innerHTML = '<i class="bx bx-sun"></i>';
            themeToggle.title = 'Switch to Arc Reactor Mode';
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('stealth-mode');
            const isStealth = document.body.classList.contains('stealth-mode');

            if (isStealth) {
                themeToggle.innerHTML = '<i class="bx bx-sun"></i>';
                themeToggle.title = 'Switch to Arc Reactor Mode';
                localStorage.setItem('portfolio-theme', 'stealth');
            } else {
                themeToggle.innerHTML = '<i class="bx bx-moon"></i>';
                themeToggle.title = 'Switch to Stealth Mode';
                localStorage.setItem('portfolio-theme', 'arc-reactor');
            }
        });
    }
});