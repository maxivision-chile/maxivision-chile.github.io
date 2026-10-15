'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ── Mobile menu ── */
function toggleMenu(btn) {
  const menu = document.getElementById('mobileMenu');
  const open = menu.classList.toggle('open');
  const burger = document.querySelector('.nav-burger');
  if (burger) burger.setAttribute('aria-expanded', String(open));
}

/* ──────────────────────────────────────────────
   Single scroll loop: nav state, progress bar,
   parallax, hero fade, process timeline.
   Scroll just flags; rAF reads layout.
─────────────────────────────────────────────── */
const nav         = document.getElementById('nav');
const progressBar = document.getElementById('scrollProgress');
const heroContent = document.getElementById('heroContent');
const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
const timeline    = document.getElementById('timeline');
const tlFill      = document.getElementById('tlFill');
const tlSteps     = Array.from(document.querySelectorAll('.tl-step'));
const whyRing     = document.querySelector('.why-img-ring');   /* referencia estable (sin transform) */
const whyBox      = document.querySelector('.why-img-box');    /* lo que gira/escala en 3D */

let ticking = false;
function onScroll() {
  if (!ticking) { ticking = true; requestAnimationFrame(update); }
}

function update() {
  ticking = false;
  const y  = window.scrollY;
  const vh = window.innerHeight;

  /* Nav transparency */
  if (y > 60) { nav.classList.remove('transparent'); nav.classList.add('solid'); }
  else        { nav.classList.remove('solid'); nav.classList.add('transparent'); }

  /* Scroll progress bar */
  const docH = document.documentElement.scrollHeight - vh;
  if (progressBar) progressBar.style.transform = `scaleX(${docH > 0 ? clamp(y / docH, 0, 1) : 0})`;

  if (!REDUCED) {
    /* Hero fade + subtle rise */
    if (heroContent && y < vh) {
      const p = clamp(y / (vh * 0.8), 0, 1);
      heroContent.style.opacity   = String(1 - p);
      heroContent.style.transform = `translateY(${p * 48}px)`;
    }

    /* Parallax — translate relative to element's distance from viewport center */
    for (const el of parallaxEls) {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2 - vh / 2;
      const speed = parseFloat(el.dataset.parallax) || 0;
      el.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
    }

    /* Logo 3D: entra desde la pantalla girando + zoom-out hasta asentarse.
       Progreso medido sobre el anillo (sin transform) para evitar jitter. */
    if (whyRing && whyBox) {
      const r = whyRing.getBoundingClientRect();
      const p = clamp((vh * 0.92 - r.top) / (vh * 0.60), 0, 1);
      const e = 1 - Math.pow(1 - p, 3);          /* ease-out para un aterrizaje suave */
      const scale = 2.2 - 1.2 * e;               /* 2.2 → 1.0 (zoom-out) */
      const rotZ  = (1 - e) * 360;               /* giro en su plano: 360° → 0° (no espeja) */
      const rotX  = (1 - e) * 55;                /* inclinación 3D: 55° → 0° (llega desde la pantalla) */
      const op    = clamp(p / 0.35, 0, 1);       /* aparece pronto y gira a la vista */
      whyBox.style.opacity   = op.toFixed(3);
      whyBox.style.transform = `rotateX(${rotX.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
    }
  }

  /* Process timeline progress */
  if (timeline && tlFill) {
    const r = timeline.getBoundingClientRect();
    const p = clamp((vh * 0.6 - r.top) / r.height, 0, 1);
    tlFill.style.transform = `scaleY(${p})`;
    tlSteps.forEach((step, i) => {
      const threshold = (i + 0.4) / tlSteps.length;
      step.classList.toggle('active', p >= threshold);
    });
  }
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
update();

/* ── Hero canvas particles ── */
(function () {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || REDUCED) { if (canvas) canvas.style.display = 'none'; return; }
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  const COUNT = 80;
  const rnd = () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
    opacity: Math.random() * 0.5 + 0.1,
  });
  for (let i = 0; i < COUNT; i++) particles.push(rnd());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(76,132,190,${0.12 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
    }
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(176,191,204,${p.opacity})`; ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── Scroll reveal ── */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

/* ── Animated counters ── */
function animateCounter(el, target, duration = 1600) {
  if (REDUCED) { el.textContent = target; return; }
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(step); else el.textContent = target;
  }
  requestAnimationFrame(step);
}
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { animateCounter(e.target, parseInt(e.target.dataset.target, 10)); counterObs.unobserve(e.target); }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num[data-target]').forEach(el => counterObs.observe(el));

/* ── Año dinámico en el footer ── */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

window.toggleMenu = toggleMenu;
