/* ============================================================================
   Kevin Z's CC Commander — Landing Page Scripts
   Terminal animations, copy-to-clipboard, scroll effects
   ============================================================================ */

(function () {
  'use strict';

  // --- Intersection Observer for scroll-triggered fade-in ---
  function initScrollAnimations() {
    var targets = document.querySelectorAll('.fade-in');
    if (!targets.length) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      targets.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  // --- Copy to clipboard for terminal blocks ---
  function initCopyToClipboard() {
    var terminals = document.querySelectorAll('[data-copy]');

    terminals.forEach(function (el) {
      el.addEventListener('click', function () {
        var text = el.getAttribute('data-copy');
        if (!text) return;

        navigator.clipboard.writeText(text).then(function () {
          showCopyToast(el);
        }).catch(function () {
          // Fallback for older browsers
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand('copy');
            showCopyToast(el);
          } catch (e) { /* silently fail */ }
          document.body.removeChild(ta);
        });
      });
    });
  }

  function showCopyToast(parentEl) {
    var toast = parentEl.querySelector('.copy-toast');
    if (!toast) return;
    toast.classList.add('visible');
    setTimeout(function () {
      toast.classList.remove('visible');
    }, 1500);
  }

  // --- Animated stat counters ---
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target, prefersReducedMotion);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  function animateCounter(el, instant) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';

    if (instant || isNaN(target)) {
      el.textContent = prefix + target + suffix;
      return;
    }

    var duration = 1200;
    var start = performance.now();

    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * target);
      el.textContent = prefix + current + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // --- Expandable CCC domain cards ---
  function initExpandableCards() {
    var cards = document.querySelectorAll('.mega-card');

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var isExpanded = card.classList.contains('expanded');
        // Collapse all others
        cards.forEach(function (c) { c.classList.remove('expanded'); });
        // Toggle clicked card
        if (!isExpanded) {
          card.classList.add('expanded');
        }
      });
    });
  }

  // --- Smooth scroll for navigation links ---
  function initSmoothScroll() {
    var navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = link.getAttribute('href');
        if (targetId === '#') return;
        var targetEl = document.querySelector(targetId);
        if (!targetEl) return;

        e.preventDefault();
        var offset = 80; // account for fixed nav
        var top = targetEl.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
  }

  // --- Terminal typing animation for hero ---
  function initHeroTyping() {
    var el = document.getElementById('hero-typed');
    if (!el) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var text = el.getAttribute('data-text') || el.textContent;

    if (prefersReducedMotion) {
      el.textContent = text;
      el.style.opacity = '1';
      return;
    }

    el.textContent = '';
    el.style.opacity = '1';
    var cursor = document.getElementById('hero-cursor');

    var i = 0;
    var speed = 35;

    function type() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else if (cursor) {
        cursor.style.display = 'inline';
      }
    }

    // Start typing after a small delay
    setTimeout(type, 600);
  }

  // --- Decision tree terminal animation ---
  function initDecisionTree() {
    var lines = document.querySelectorAll('.dt-line');
    if (!lines.length) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      lines.forEach(function (line) { line.style.opacity = '1'; });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          revealLines(lines);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    observer.observe(lines[0].closest('.terminal-body'));
  }

  function revealLines(lines) {
    lines.forEach(function (line, i) {
      setTimeout(function () {
        line.style.opacity = '1';
        line.style.transform = 'translateY(0)';
      }, i * 200);
    });
  }

  // --- Nav background on scroll ---
  function initNavScroll() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var scrollThreshold = 50;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          if (window.scrollY > scrollThreshold) {
            nav.style.borderBottomColor = 'rgba(217, 119, 6, 0.15)';
          } else {
            nav.style.borderBottomColor = '';
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // --- Keyboard accessibility for expandable cards ---
  function initKeyboardNav() {
    var cards = document.querySelectorAll('.mega-card');
    cards.forEach(function (card) {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-expanded', 'false');

      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });

      // Update aria-expanded on toggle
      var observer = new MutationObserver(function () {
        card.setAttribute('aria-expanded', card.classList.contains('expanded') ? 'true' : 'false');
      });
      observer.observe(card, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // --- Initialize everything on DOM ready ---
  function init() {
    initScrollAnimations();
    initCopyToClipboard();
    initCounters();
    initExpandableCards();
    initSmoothScroll();
    initHeroTyping();
    initDecisionTree();
    initNavScroll();
    initKeyboardNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
