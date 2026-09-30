'use client';

import { useEffect } from 'react';

// Every card on every page (and anything marked data-reveal) fades and slides up the first time it
// scrolls into view, staggered when several appear together. Done once here instead of wrapping
// ~30 pages' cards in motion components. Styles live in globals.css ([data-sr]).
const TARGETS = '.glass-card, [data-reveal]';
// Navigation chrome, dropdowns, modals, and elements framer-motion already animates are left alone.
const SKIP_INSIDE = 'nav, header, aside, .fixed, [data-no-reveal]';
const STAGGER_MS = 70;
const MAX_STAGGER_MS = 350;
const CLEANUP_MS = 900;

const shouldAnimate = (el: HTMLElement) =>
  !el.dataset.sr
  && !el.closest(SKIP_INSIDE)
  // Only the outermost card animates; cards nested in an animating card come along with it.
  && !el.parentElement?.closest(TARGETS)
  // framer-motion writes inline opacity/transform on the elements it animates itself.
  && !el.style.opacity && !el.style.transform;

export default function ScrollReveal() {
  useEffect(() => {
    // Reduced-motion users still get a plain fade (no sliding) — see globals.css.
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      let batch = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        observer.unobserve(el);
        el.style.transitionDelay = `${Math.min(batch * STAGGER_MS, MAX_STAGGER_MS)}ms`;
        batch += 1;
        el.dataset.sr = 'shown';
        // Drop our styles once the animation is over so hover effects and later re-renders are untouched.
        window.setTimeout(() => {
          delete el.dataset.sr;
          el.style.transitionDelay = '';
        }, CLEANUP_MS + MAX_STAGGER_MS);
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    const prepare = (el: HTMLElement, skipIfVisible: boolean) => {
      if (!shouldAnimate(el)) return;
      // On first load, content already on screen stays put (hiding it would flash); only what's
      // below the fold — or rendered later, e.g. after data loads — animates in.
      if (skipIfVisible && el.getBoundingClientRect().top < window.innerHeight) return;
      el.dataset.sr = 'hidden';
      observer.observe(el);
    };

    const scan = (root: ParentNode, skipIfVisible: boolean) => {
      if (root instanceof HTMLElement && root.matches(TARGETS)) prepare(root, skipIfVisible);
      root.querySelectorAll<HTMLElement>(TARGETS).forEach((el) => prepare(el, skipIfVisible));
    };

    scan(document, true);

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scan(node, false);
        });
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
