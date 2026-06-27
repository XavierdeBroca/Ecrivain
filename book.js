/* Shared JS for book pages */
(() => {
  "use strict";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* nav scroll */
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
    document.body.style.overflow = open ? "hidden" : "";
  });
  nav.querySelectorAll(".nav__links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      document.body.style.overflow = "";
    })
  );

  /* scroll progress */
  const prog = document.getElementById("scrollProgress");
  const onScrollProg = () => {
    const h = document.documentElement;
    const pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
    if (prog) prog.style.width = `${Math.min(pct * 100, 100)}%`;
  };
  let tick = false;
  window.addEventListener("scroll", () => {
    if (!tick) { requestAnimationFrame(() => { onScrollNav(); onScrollProg(); tick = false; }); tick = true; }
  }, { passive: true });
  onScrollProg();

  /* reveal */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target;
          el.style.transitionDelay = `${parseInt(el.dataset.delay || "0", 10)}ms`;
          el.classList.add("is-visible");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* 3D book hover tilt */
  const book3d = document.querySelector(".book-3d");
  if (book3d && !prefersReduced && window.matchMedia("(hover: hover)").matches) {
    const MAX = 12;
    book3d.addEventListener("mousemove", (e) => {
      const r = book3d.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      book3d.style.animation = "none";
      book3d.style.transform = `perspective(1000px) rotateY(${-22 + px * MAX}deg) rotateX(${4 - py * MAX}deg) translateY(-10px)`;
    });
    book3d.addEventListener("mouseleave", () => {
      book3d.style.transform = "";
      book3d.style.animation = "";
    });
  }

  /* ---------- Graph background ---------- */
  if (!prefersReduced) {
    // Inject canvas into body
    const canvas = document.createElement("canvas");
    canvas.id = "graph-bg";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0.45;";
    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d");
    let w, h, dpr;
    const mouse = { x: -9999, y: -9999 };
    const C_GOLD  = [176, 125, 42];
    const C_BLUE  = [61, 103, 184];
    const C_LIGHT = [180, 170, 150];
    let nodes = [], edges = [], signals = [];
    let signalTimer = 0, raf;

    const buildGraph = () => {
      nodes = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 2 + 2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.016 + Math.random() * 0.012,
        blue: Math.random() > 0.55,
        hub: Math.random() > 0.82,
      }));
      edges = []; signals = [];
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

    const spawnSignal = (a, b) => {
      signals.push({ from: a, to: b, t: 0, speed: 0.004 + Math.random() * 0.006, blue: nodes[a].blue || nodes[b].blue, size: 2.2 + Math.random() * 1.2 });
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < -30) n.x = w + 30; else if (n.x > w + 30) n.x = -30;
        if (n.y < -30) n.y = h + 30; else if (n.y > h + 30) n.y = -30;
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 130 && d > 1) { const f = (130 - d) / 130 * 0.35; n.vx += dx / d * f; n.vy += dy / d * f; }
        n.vx *= 0.99; n.vy *= 0.99;
        const spd = Math.hypot(n.vx, n.vy); if (spd > 0.55) { n.vx = n.vx / spd * 0.55; n.vy = n.vy / spd * 0.55; }
        n.pulse += n.pulseSpeed;
      }
      edges = [];
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < 190) edges.push({ a: i, b: j, dist });
        }
      signalTimer++;
      if (signalTimer > 24 && edges.length && signals.length < 14) {
        signalTimer = 0;
        const e = edges[Math.floor(Math.random() * edges.length)];
        spawnSignal(e.a, e.b);
      }
      for (const e of edges) {
        const na = nodes[e.a], nb = nodes[e.b];
        const alpha = (1 - e.dist / 190) * 0.20;
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = `rgba(${C_LIGHT.join(",")},${alpha})`; ctx.lineWidth = 0.8; ctx.stroke();
      }
      for (const n of nodes) {
        const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (d < 160) {
          const col = n.blue ? C_BLUE : C_GOLD;
          ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${col.join(",")},${(1 - d / 160) * 0.32})`; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      signals = signals.filter(s => s.t <= 1);
      for (const s of signals) {
        s.t += s.speed;
        const na = nodes[s.from], nb = nodes[s.to]; if (!na || !nb) continue;
        const px = na.x + (nb.x - na.x) * s.t, py = na.y + (nb.y - na.y) * s.t;
        const alpha = Math.sin(s.t * Math.PI), col = s.blue ? C_BLUE : C_GOLD;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, s.size * 3);
        grad.addColorStop(0, `rgba(${col.join(",")},${alpha * 0.55})`);
        grad.addColorStop(1, `rgba(${col.join(",")},0)`);
        ctx.beginPath(); ctx.arc(px, py, s.size * 3, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.join(",")},${alpha * 0.85})`; ctx.fill();
      }
      for (const n of nodes) {
        const col = n.blue ? C_BLUE : C_GOLD;
        const breathe = 1 + Math.sin(n.pulse) * 0.16;
        const r = (n.hub ? n.r * 1.7 : n.r) * breathe;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5);
        grad.addColorStop(0, `rgba(${col.join(",")},0.16)`); grad.addColorStop(1, `rgba(${col.join(",")},0)`);
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 3.5, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.join(",")},${n.hub ? 0.50 : 0.34})`; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.join(",")},0.72)`; ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener("mouseout",  () => { mouse.x = -9999; mouse.y = -9999; });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(draw);
    });
    resize(); draw();
  }
})();
