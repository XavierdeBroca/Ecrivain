/* ============================================================
   Xavier de Broca — interactions & animations
   ============================================================ */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Nav: scrolled state + mobile toggle ---------- */
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");

  const onScrollNav = () => {
    if (window.scrollY > 40) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  };
  onScrollNav();

  navToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    document.body.style.overflow = open ? "hidden" : "";
  });
  // close menu on link click
  nav.querySelectorAll(".nav__links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    })
  );

  /* ---------- Scroll progress bar ---------- */
  const progress = document.getElementById("scrollProgress");
  const onScrollProgress = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
    if (progress) progress.style.width = `${Math.min(scrolled * 100, 100)}%`;
  };

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          onScrollNav();
          onScrollProgress();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
  onScrollProgress();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseInt(el.dataset.delay || "0", 10);
            el.style.transitionDelay = `${delay}ms`;
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Count-up stats ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const isYear = target > 100;
    const duration = 1500;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      const val = Math.round(eased * target);
      el.textContent = isYear ? String(val) : val;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = isYear ? String(target) : target;
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window && !prefersReduced) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCount(e.target);
            cio.unobserve(e.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => cio.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = c.dataset.count));
  }

  /* ---------- 3D tilt on book cards ---------- */
  if (!prefersReduced && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const cover = card.querySelector(".book__cover");
      const MAX = 8; // degrees
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * MAX}deg) rotateX(${-py * MAX}deg) translateY(-4px)`;
        if (cover) cover.style.transform = `translateZ(40px) rotateY(${px * 6}deg)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        if (cover) cover.style.transform = "";
      });
    });
  }

  /* ---------- Graph background animation ---------- */
  const canvas = document.getElementById("neural-bg");
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr;
    const mouse = { x: -9999, y: -9999 };

    // Colors adapted for light theme
    const C_GOLD  = [176, 125, 42];
    const C_BLUE  = [61, 103, 184];
    const C_LIGHT = [220, 215, 200]; // faint edge color

    // Graph state
    let nodes = [];
    let edges = [];
    let signals = []; // traveling dots along edges

    const NODE_COUNT_BASE = 38;
    const LINK_DIST = 200;
    const SPEED = 0.18;

    const buildGraph = () => {
      nodes = Array.from({ length: NODE_COUNT_BASE }, (_, i) => ({
        id: i,
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        r: Math.random() * 2.5 + 2.5,          // visible node radius
        pulse: Math.random() * Math.PI * 2,    // phase for breathing
        pulseSpeed: 0.018 + Math.random() * 0.014,
        blue: Math.random() > 0.55,
        hub: Math.random() > 0.82,             // hub nodes are larger
      }));
      edges = [];
      signals = [];
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth  = window.innerWidth;
      h = canvas.clientHeight = window.innerHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildGraph();
    };

    // Spawn a signal dot on an edge
    const spawnSignal = (a, b) => {
      signals.push({
        from: a, to: b,
        t: 0,
        speed: 0.004 + Math.random() * 0.006,
        blue: nodes[a].blue || nodes[b].blue,
        size: 2.5 + Math.random() * 1.5,
      });
    };

    let signalTimer = 0;
    let raf;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // ── Move nodes ──
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -30)    { n.x = w + 30; }
        else if (n.x > w + 30) { n.x = -30; }
        if (n.y < -30)    { n.y = h + 30; }
        else if (n.y > h + 30) { n.y = -30; }

        // gentle mouse repulsion
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < 140 && d > 1) {
          const f = (140 - d) / 140 * 0.4;
          n.vx += (dx / d) * f; n.vy += (dy / d) * f;
        }
        // dampen velocity
        n.vx *= 0.99; n.vy *= 0.99;
        const maxV = 0.6;
        const spd = Math.hypot(n.vx, n.vy);
        if (spd > maxV) { n.vx = n.vx / spd * maxV; n.vy = n.vy / spd * maxV; }

        n.pulse += n.pulseSpeed;
      }

      // ── Build dynamic edge list ──
      edges = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < LINK_DIST) edges.push({ a: i, b: j, dist });
        }
      }

      // ── Spawn signals occasionally ──
      signalTimer++;
      if (signalTimer > 22 && edges.length > 0 && signals.length < 18) {
        signalTimer = 0;
        const e = edges[Math.floor(Math.random() * edges.length)];
        spawnSignal(e.a, e.b);
      }

      // ── Draw edges ──
      for (const e of edges) {
        const na = nodes[e.a], nb = nodes[e.b];
        const alpha = (1 - e.dist / LINK_DIST) * 0.22;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = `rgba(${C_LIGHT.join(",")}, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // ── Draw mouse-proximity edges ──
      for (const n of nodes) {
        const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (d < LINK_DIST * 0.85) {
          const alpha = (1 - d / (LINK_DIST * 0.85)) * 0.35;
          const col = n.blue ? C_BLUE : C_GOLD;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${col.join(",")}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // ── Draw signals (traveling dots) ──
      signals = signals.filter(s => s.t <= 1);
      for (const s of signals) {
        s.t += s.speed;
        const na = nodes[s.from], nb = nodes[s.to];
        if (!na || !nb) continue;
        const px = na.x + (nb.x - na.x) * s.t;
        const py = na.y + (nb.y - na.y) * s.t;
        const alpha = Math.sin(s.t * Math.PI); // fade in/out
        const col = s.blue ? C_BLUE : C_GOLD;
        // glow
        const grad = ctx.createRadialGradient(px, py, 0, px, py, s.size * 3);
        grad.addColorStop(0, `rgba(${col.join(",")}, ${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(${col.join(",")}, 0)`);
        ctx.beginPath();
        ctx.arc(px, py, s.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        // core dot
        ctx.beginPath();
        ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.join(",")}, ${alpha * 0.9})`;
        ctx.fill();
      }

      // ── Draw nodes ──
      for (const n of nodes) {
        const col = n.blue ? C_BLUE : C_GOLD;
        const breathe = 1 + Math.sin(n.pulse) * 0.18;
        const r = (n.hub ? n.r * 1.7 : n.r) * breathe;

        // outer glow ring
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5);
        grad.addColorStop(0, `rgba(${col.join(",")}, 0.18)`);
        grad.addColorStop(1, `rgba(${col.join(",")}, 0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.join(",")}, ${n.hub ? 0.55 : 0.38})`;
        ctx.fill();

        // inner bright core
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.join(",")}, 0.75)`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener("mouseout",  () => { mouse.x = -9999; mouse.y = -9999; });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(draw);
    });

    resize();
    draw();
  }

  /* ---------- Subtle parallax on hero ---------- */
  if (!prefersReduced) {
    const heroTitle = document.querySelector(".hero__title");
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        if (heroTitle && y < window.innerHeight) {
          heroTitle.style.transform = `translateY(${y * 0.12}px)`;
        }
      },
      { passive: true }
    );
  }
})();
