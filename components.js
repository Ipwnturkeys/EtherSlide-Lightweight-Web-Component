/**
 * Represents a slider component.
 * @class
 * @extends HTMLElement
 */
class Slider extends HTMLElement {
    constructor() {
        super();

        this.handleStart = this.handleStart.bind(this);

        this.slider = this; // Reference to the slider
        this.slideIndex = 0; // Current slide index
        this.autoLoop = false; // Auto loop disabled by default
        this.infiniteLoop = false; // Infinite loop disabled by default
        this.isAnimating = false; // Flag to track animation state
    
        this.desktopPerView ||= 1; // Number of slides per view on desktop
        this.tabletPerView ||= 1; // Number of slides per view on tablet
        this.mobilePerView ||= 1; // Number of slides per view on mobile
    
        this.autoLoopInterval = 1000; // Time in ms between automatic transitions
        this.slides = []; // Array to store slides

        this.isHorizontalSwipe = null; // Initialize to null
        this.lastMoveTime = 0; // Initialize last move time for velocity calculation
    }

    connectedCallback() {
        this.autoLoop = this.hasAttribute('auto-loop');
        this.infiniteLoop = this.hasAttribute('infinite-loop');

        this.desktopPerView = this.getAttribute('desktop-per-view') || this.desktopPerView;
        this.tabletPerView = this.getAttribute('tablet-per-view') || this.tabletPerView;
        this.mobilePerView = this.getAttribute('mobile-per-view') || this.mobilePerView;

        if (this.querySelector('.kos-slide')) {
            this.slides = Array.from(this.querySelectorAll('.kos-slide'));
            console.log(this.slides);
        } else {
            const observer = new MutationObserver(() => {
                if (this.querySelector('.kos-slide')) {
                    observer.disconnect();
                    this.slides = Array.from(this.querySelectorAll('.kos-slide'));
                    console.log(this.slides);
                }
            });
    
            observer.observe(this, { childList: true });
        }

        if (this.infiniteLoop) this.prepareInfiniteLoop();
        if (this.autoLoop) this.startAutoLoop();

        this.setupEventListeners();
    }

    disconnectedCallback() {
        if (this.autoLoopTimer) {
            clearInterval(this.autoLoopTimer);
        }
    }

    /**
     * Prepares the slider for an infinite loop by cloning slides if available,
     * or sets up a MutationObserver to wait for slides to be available.
     */
    prepareInfiniteLoop = () => {
        if (this.slides && this.slides.length > 0) {
            this.cloneSlidesForLoop();
        } else {
            // Set up a MutationObserver to wait for slides to be available
            const observer = new MutationObserver(() => {
                if (this.querySelector('.kos-slide')) {
                    this.slides = Array.from(this.querySelectorAll('.kos-slide'));
                    if (this.slides.length > 0) {
                        observer.disconnect();
                        this.cloneSlidesForLoop();
                    }
                }
            });
    
            observer.observe(this, { childList: true, subtree: true });
        }
    }

    /**
     * Starts the auto loop for the slider.
     * If there is an existing timer, it will be cleared before starting a new one.
     * The auto loop advances the slide and recursively calls itself to create a loop.
     */
    startAutoLoop() {
        if (this.autoLoopTimer) {
            clearTimeout(this.autoLoopTimer); // Clear existing timer if any
        }
    
        this.autoLoopTimer = setTimeout(() => {
            this.advanceSlide();
            this.startAutoLoop(); // Recursively call to create a loop
        }, this.autoLoopInterval);
    }

    /**
     * Advances the slide to the next position.
     * 
     * @returns {void}
     */
    advanceSlide() {
        if (!this.isAnimating && !this.isDragging) {
            this.slideIndex++;
    
            // Check if nearing the end of the slides and clone more slides if needed
            if (this.infiniteLoop && this.slideIndex >= this.slides.length - this.desktopPerView) {
                this.cloneAdditionalSlides();
            }
    
            this.removeOldClones(); // Remove old clones
            this.updateSlidePosition();
        }
    }

    cloneAdditionalSlides() {
        const sliderContainer = this.querySelector('.slider-container');
        const numOfClones = Math.max(this.desktopPerView, this.tabletPerView, this.mobilePerView);
    
        // Add clones to the end
        for (let i = 0; i < numOfClones; i++) {
            const clone = this.slides[i % this.slides.length].cloneNode(true);
            sliderContainer.appendChild(clone);
        }
    
        this.slides = Array.from(this.querySelectorAll('.kos-slide'));
    }

    removeOldClones() {
        const sliderContainer = this.querySelector('.slider-container');
        const numOfClones = Math.max(this.desktopPerView, this.tabletPerView, this.mobilePerView);
        const totalSlides = this.slides.length;
        const originalSlidesCount = totalSlides - 2 * numOfClones;
    
        if (this.slideIndex >= originalSlidesCount + numOfClones || this.slideIndex < numOfClones) {
            for (let i = 0; i < numOfClones; i++) {
                if (this.slideIndex < numOfClones) {
                    const lastSlide = sliderContainer.lastElementChild;
                    sliderContainer.removeChild(lastSlide);
                } else {
                    const firstSlide = sliderContainer.firstElementChild;
                    sliderContainer.removeChild(firstSlide);
                }
            }
        }
    
        this.slides = Array.from(this.querySelectorAll('.kos-slide'));
    }

    /**
     * Clones the slides for the loop functionality.
     */
    cloneSlidesForLoop() {
        const numOfClones = Math.max(this.desktopPerView, this.tabletPerView, this.mobilePerView);
        const sliderContainer = this.querySelector('.slider-container');
    
        // Clone the last 'numOfClones' slides and prepend them
        for (let i = 0; i < numOfClones; i++) {
            const clone = this.slides[this.slides.length - 1 - i].cloneNode(true);
            sliderContainer.insertBefore(clone, sliderContainer.firstChild);
        }
    
        // Clone the first 'numOfClones' slides and append them
        for (let i = 0; i < numOfClones; i++) {
            const clone = this.slides[i].cloneNode(true);
            sliderContainer.appendChild(clone);
        }
    
        // Refresh the slides list
        this.slides = Array.from(this.querySelectorAll('.kos-slide'));
    
        // Adjust slideIndex to start at the first real slide (after the cloned last slide)
        this.slideIndex = numOfClones;
        this.updateSlidePosition(true); // Skip animation on initial positioning
    }

    /**
     * Sets up event listeners for touch and mouse events.
     */
    setupEventListeners = () => {
        // Touch events
        this.addEventListener('touchstart', this.handleStart);
        this.addEventListener('touchmove', this.handleMove);
        this.addEventListener('touchend', this.handleEnd);

        // Mouse events
        this.addEventListener('mousedown', this.handleStart);
        document.addEventListener('mousemove', this.handleMove); // attached to document to handle drag outside the element
        document.addEventListener('mouseup', this.handleEnd);
    }

    /**
     * Updates the position of the slide in the slider container.
     * @param {boolean} immediate - Indicates whether the transition should be immediate or not. Default is false.
     */
    updateSlidePosition(immediate = false) {
        const sliderContainer = this.querySelector('.slider-container');
        const slideWidth = this.slides[0].clientWidth;
        const offset = -(slideWidth * this.slideIndex);
        sliderContainer.style.transition = immediate ? 'none' : '';
        sliderContainer.style.transform = `translateX(${offset}px)`;
    
        if (!immediate) {
            this.isAnimating = true;
            sliderContainer.addEventListener('transitionend', () => {
                this.isAnimating = false;
                // Moved the infinite loop handling logic here
                if (this.infiniteLoop) {
                    if (this.slideIndex === 0) {
                        this.slideIndex = this.slides.length - (2 * this.desktopPerView);
                        this.updateSlidePosition(true);
                    } else if (this.slideIndex >= this.slides.length - this.desktopPerView) {
                        this.slideIndex = this.desktopPerView;
                        this.updateSlidePosition(true);
                    }
                }
                this.handleTransitionEnd(); // Call after any potential index adjustments
            }, { once: true });
        }
    }

    /**
     * Handles the transition end event.
     * Starts the next slide after the current transition has ended if autoLoop is enabled and not currently dragging.
     */
    handleTransitionEnd() {
        // Start the next slide after the current transition has ended
        if (this.autoLoop && !this.isDragging) {
            this.startAutoLoop();
        }
    }

    /**
     * Sets the translateX value of the slider container without animation.
     * @param {number} translateX - The translateX value in pixels.
     */
    setTranslateWithoutAnimation = (translateX) => {
        const sliderContainer = this.querySelector('.slider-container');
        sliderContainer.style.transition = 'none';
        sliderContainer.style.transform = `translateX(${translateX}px)`;
    
        // Force reflow to apply the transition change immediately
        sliderContainer.offsetHeight;
    
        // Re-enable transitions
        sliderContainer.style.transition = '';
    }

    handleStart = (event) => {
        console.log('Start dragging');
        this.isDragging = true;
        this.startTranslate = this.getCurrentTranslate();
        const touchPoint = event.touches ? event.touches[0] : event;
        this.touchStartX = touchPoint.clientX;
        this.touchStartY = touchPoint.clientY;
        this.isHorizontalSwipe = false;  // Added to track swipe direction
    
        document.addEventListener('mousemove', this.handleMove);
        document.addEventListener('mouseup', this.handleEnd);

        this.isHorizontalSwipe = null; // Reset swipe direction at the start

        // Pause the auto-loop when the user starts dragging
        if (this.autoLoopTimer) {
            clearTimeout(this.autoLoopTimer); // Use clearTimeout instead of clearInterval
        }
    }

    /**
     * Handles the move event for the slider component.
     * 
     * @param {Event} event - The move event.
     */
    handleMove = (event) => {
        if (!this.isDragging) return;

        const touchPoint = event.touches ? event.touches[0] : event;
        const currentX = touchPoint.clientX;
        const currentY = touchPoint.clientY;
        const diffX = currentX - this.touchStartX;
        const diffY = currentY - this.touchStartY;
        const now = Date.now();

        // Determine swipe direction if not already established
        if (this.isHorizontalSwipe === null) {
            if (Math.abs(diffX) > Math.abs(diffY)) {
                this.isHorizontalSwipe = true;
            } else if (Math.abs(diffY) > Math.abs(diffX)) {
                this.isDragging = false;
                return; // Ignore vertical swipes
            }
        }

        if (this.isHorizontalSwipe) {
            let newTranslate = this.startTranslate + diffX;
            this.setTranslate(newTranslate);
        }

        this.lastMoveTime = now;
    }

    /**
     * Handles the end of dragging event.
     */
    handleEnd = () => {
        console.log('End dragging');
        if (this.isHorizontalSwipe) {
            const now = Date.now();
            const timeElapsed = now - this.lastMoveTime;
            const translateX = this.getCurrentTranslate();
            const draggedDistance = translateX - this.startTranslate;
            const velocity = Math.abs(draggedDistance) / timeElapsed; // Swipe velocity

            let shouldChangeSlide = Math.abs(draggedDistance) > 25; // Adjust as needed
            shouldChangeSlide = shouldChangeSlide || velocity > 0.5; // Consider velocity for quick swipes

            if (shouldChangeSlide) {
                const direction = draggedDistance > 0 ? -1 : 1;
                this.slideIndex += direction;
            }

            // Clamp slideIndex within bounds
            this.slideIndex = Math.max(0, Math.min(this.slideIndex, this.slides.length - 1));
        }

        this.updateSlidePosition();

        this.isDragging = false;
        this.isHorizontalSwipe = false;
        this.lastMoveTime = 0;

        document.removeEventListener('mousemove', this.handleMove);
        document.removeEventListener('mouseup', this.handleEnd);

        this.isHorizontalSwipe = null; // Reset swipe direction

        // Resume the auto-loop after a period of inactivity
        if (this.autoLoop) {
            setTimeout(() => this.startAutoLoop(), 5000); // Resume with a delay
        }

        if (this.infiniteLoop) {
            if (this.slideIndex < 0) {
                this.cloneAdditionalSlides(); // Clone additional slides as needed
            } else if (this.slideIndex >= this.slides.length - this.desktopPerView) {
                this.cloneAdditionalSlides();
            }
        }
    
        this.removeOldClones(); // Remove old clones
        this.updateSlidePosition();
    }

    /**
     * Sets the translateX value of the slider container.
     * @param {number} translateX - The value to set for the translateX property.
     */
    setTranslate = (translateX) => {
        const sliderContainer = this.querySelector('.slider-container');
        sliderContainer.style.transform = `translateX(${translateX}px)`;
    }

    /**
     * Returns the current translateX value of the slider container.
     * @returns {number} The translateX value.
     */
    getCurrentTranslate = () => {
        const sliderContainer = this.querySelector('.slider-container');
        const style = window.getComputedStyle(sliderContainer);
        const matrix = new WebKitCSSMatrix(style.transform);
        return matrix.m41; // m41 is the translateX value in the matrix
    }
}

customElements.define('kos-slider', Slider);
