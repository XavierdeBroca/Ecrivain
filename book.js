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
})();
