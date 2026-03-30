
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

    // --- 2. ROBUST VIDEO PLAYBACK SYSTEM (Hover to Play) ---
    const videoList = document.querySelectorAll('.cinematic-video');

    videoList.forEach(video => {
        let playPromise;

        // Find the parent project-card to attach hover listeners
        const hoverTarget = video.closest('.project-card') || video.parentElement;

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

        // --- 3.1 CUSTOM CURSOR ---
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        const follower = document.createElement('div');
        follower.className = 'custom-cursor-follower';
        document.body.appendChild(cursor);
        document.body.appendChild(follower);

        const cursorStyle = document.createElement('style');
        cursorStyle.innerHTML = `
            .custom-cursor { 
                position: fixed; width: 6px; height: 6px; 
                background: #72a1de; border-radius: 50%; 
                pointer-events: none; z-index: 10000; 
                transform: translate(-50%, -50%); 
                mix-blend-mode: difference; 
            }
            .custom-cursor-follower { 
                position: fixed; width: 40px; height: 40px; 
                border: 1px solid rgba(114, 161, 222, 0.5); 
                border-radius: 50%; pointer-events: none; 
                z-index: 9999; transform: translate(-50%, -50%); 
                transition: transform 0.1s; 
            }
            .cursor-hover { 
                transform: translate(-50%, -50%) scale(1.5); 
                background: rgba(114, 161, 222, 0.1); 
                border-color: #fff; 
            }
        `;
        document.head.appendChild(cursorStyle);

        const moveX = gsap.quickTo(cursor, "x", { duration: 0.1 });
        const moveY = gsap.quickTo(cursor, "y", { duration: 0.1 });
        const followX = gsap.quickTo(follower, "x", { duration: 0.5, ease: "power2.out" });
        const followY = gsap.quickTo(follower, "y", { duration: 0.5, ease: "power2.out" });

        // Debounced mouse move for better performance
        const handleMouseMove = (e) => {
            moveX(e.clientX);
            moveY(e.clientY);
            followX(e.clientX);
            followY(e.clientY);
        };

        window.addEventListener("mousemove", handleMouseMove);

        // --- 3.2 3D TILT CARDS ---
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
            }, 10);

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

    // --- 4. DATA DECRYPTION TEXT (OPTIMIZED MATRIX EFFECT) ---
    const letters = "ABCDEF0123456789";
    const headers = document.querySelectorAll(".section-title, .developer-title, .arsenal-title, .global-title, .card h1");

    headers.forEach(header => {
        if (!header.dataset.value) {
            header.dataset.value = header.innerText;
        }

        let interval = null;

        const animateText = (event) => {
            let iterations = 0;
            const originalText = event.target.dataset.value;

            clearInterval(interval);

            interval = setInterval(() => {
                event.target.innerText = event.target.innerText
                    .split("")
                    .map((letter, index) => {
                        if (index < iterations) return originalText[index];
                        return letters[Math.floor(Math.random() * letters.length)];
                    })
                    .join("");

                if (iterations >= originalText.length) {
                    clearInterval(interval);
                    event.target.innerText = originalText;
                }

                iterations += 1 / 3;
            }, 30);
        };

        header.addEventListener("mouseenter", animateText);
        
        header.addEventListener("mouseleave", (event) => {
            clearInterval(interval);
            event.target.innerText = event.target.dataset.value;
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
                            if (video.parentElement && video.parentElement.classList.contains('project-vidbox')) {
                                video.parentElement.style.background = '#080020';
                                video.parentElement.innerHTML += '<div style="color:white; opacity:0.5; font-size:12px;">Video Unavailable</div>';
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
});