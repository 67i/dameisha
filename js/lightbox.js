(function() {
    'use strict';

    var Lightbox = {
        images: [],
        currentIndex: 0,
        _keydownHandler: null,

        init: function(images, imgSelector, options) {
            this.images = images || [];
            this.currentIndex = 0;
            this._bindEvents(imgSelector, options || {});
        },

        open: function(index) {
            if (index !== undefined) {
                this.currentIndex = index;
            }
            var lightbox = document.getElementById('lightbox');
            var lightboxImg = document.getElementById('lightboxImg');
            var lightboxCounter = document.getElementById('lightboxCounter');
            if (!lightbox || !lightboxImg) return;

            lightbox.classList.add('active');
            lightboxImg.src = this.images[this.currentIndex];
            if (lightboxCounter) {
                lightboxCounter.textContent = (this.currentIndex + 1) + ' / ' + this.images.length;
            }
            document.body.style.overflow = 'hidden';
        },

        close: function() {
            var lightbox = document.getElementById('lightbox');
            if (!lightbox) return;
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        },

        prev: function() {
            this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
            this._updateDisplay();
        },

        next: function() {
            this.currentIndex = (this.currentIndex + 1) % this.images.length;
            this._updateDisplay();
        },

        _updateDisplay: function() {
            var lightboxImg = document.getElementById('lightboxImg');
            var lightboxCounter = document.getElementById('lightboxCounter');
            if (lightboxImg) {
                lightboxImg.src = this.images[this.currentIndex];
            }
            if (lightboxCounter) {
                lightboxCounter.textContent = (this.currentIndex + 1) + ' / ' + this.images.length;
            }
        },

        _bindEvents: function(imgSelector, options) {
            var self = this;
            var lightbox = document.getElementById('lightbox');
            var lightboxClose = document.getElementById('lightboxClose');
            var lightboxPrev = document.getElementById('lightboxPrev');
            var lightboxNext = document.getElementById('lightboxNext');

            var galleryImgs = document.querySelectorAll(imgSelector);
            galleryImgs.forEach(function(img) {
                img.style.cursor = 'pointer';
                img.addEventListener('click', function() {
                    var idx = parseInt(this.getAttribute('data-index'));
                    self.open(isNaN(idx) ? 0 : idx);
                });
            });

            if (options.introImageId) {
                var introImage = document.getElementById(options.introImageId);
                if (introImage && this.images.length > 0) {
                    introImage.style.cursor = 'pointer';
                    introImage.addEventListener('click', function() {
                        self.open(0);
                    });
                }
            }

            if (lightboxClose) {
                lightboxClose.addEventListener('click', function() { self.close(); });
            }
            if (lightboxPrev) {
                lightboxPrev.addEventListener('click', function() { self.prev(); });
            }
            if (lightboxNext) {
                lightboxNext.addEventListener('click', function() { self.next(); });
            }

            if (lightbox) {
                lightbox.addEventListener('click', function(e) {
                    if (e.target === lightbox) {
                        self.close();
                    }
                });
            }

            if (this._keydownHandler) {
                document.removeEventListener('keydown', this._keydownHandler);
            }
            this._keydownHandler = function(e) {
                if (!lightbox || !lightbox.classList.contains('active')) return;
                if (e.key === 'Escape') self.close();
                if (e.key === 'ArrowLeft') self.prev();
                if (e.key === 'ArrowRight') self.next();
            };
            document.addEventListener('keydown', this._keydownHandler);
        }
    };

    window.Lightbox = Lightbox;
})();
