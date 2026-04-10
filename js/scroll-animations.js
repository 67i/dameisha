(function() {
    function initScrollAnimations() {
        var animatedElements = document.querySelectorAll(
            '.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale, ' +
            '.benefits-animate, .benefits-animate-left, .benefits-animate-right, .benefits-animate-scale, ' +
            '.benefits-timeline-item, .benefits-theme-card, .benefits-logic-item'
        );

        if (animatedElements.length === 0) return;

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-visible');
                    entry.target.classList.add('benefits-visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        animatedElements.forEach(function(el) {
            observer.observe(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScrollAnimations);
    } else {
        initScrollAnimations();
    }
})();
