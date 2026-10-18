// v4: scroll-held sections with GSAP ScrollTrigger + Lenis.
// Without JS, or with "reduce motion" on, every section shows as a normal, readable block.
(function () {
  var bar = document.querySelector(".bar");

  // Header picks up a blurred backing once you leave the top.
  function onScroll() { bar.classList.toggle("scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Script Craft: tabs (works with or without motion).
  var tablist = document.querySelector(".tabs");
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tablist.hidden = false;
    select(tabs[0]);
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("fx");
  var vh = function () { return window.innerHeight; };

  // Smooth scroll
  if (window.Lenis) {
    var lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      var el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el);
    });
  }

  var mm = gsap.matchMedia();
  var hero = document.querySelector(".hero");

  // 1. Hero: the full-bleed card pulls back into a wall of work, then sinks.
  mm.add({ desk: "(min-width: 761px)", phone: "(max-width: 760px)" }, function (ctx) {
    var desk = ctx.conditions.desk;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero, start: "top top",
        end: function () { return "+=" + (hero.offsetHeight - 2 * vh()); },
        scrub: 0.8, invalidateOnRefresh: true
      }
    });
    tl.fromTo(".hero-card", { scale: 1, borderRadius: 0 }, { scale: desk ? 0.56 : 0.66, borderRadius: 18, ease: "power2.inOut", duration: 1 }, 0)
      .to(".hero-hint", { opacity: 0, duration: 0.2 }, 0)
      .fromTo(".tile", { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, stagger: 0.03, duration: 0.6 }, 0.15)
      .fromTo(".col-l", { y: 0 }, { y: function () { return -0.32 * vh(); }, ease: "none", duration: 1.4 }, 0.4)
      .fromTo(".col-r", { y: 0 }, { y: function () { return 0.12 * vh(); }, ease: "none", duration: 1.4 }, 0.4)
      .to(".hero-card", { y: function () { return 0.16 * vh(); }, ease: "none", duration: 0.8 }, 1);
  });

  // 2. Entry 01 rises over the wall through a growing curve.
  var intro = document.querySelector(".intro");
  gsap.fromTo(intro, { clipPath: "ellipse(40% 30vh at 50% 100vh)" }, {
    clipPath: "ellipse(130% 140vh at 50% 100vh)", ease: "none",
    scrollTrigger: {
      trigger: intro, start: "top bottom", end: "top top", scrub: true,
      onLeave: function () { intro.style.clipPath = "none"; }
    }
  });

  // 3. The Archive: the section holds; each scroll step wipes the next deck into the viewer.
  mm.add("(min-width: 900px) and (min-height: 620px)", function () {
    var archive = document.querySelector(".archive");
    var records = gsap.utils.toArray(".record");
    var chapters = gsap.utils.toArray(".chapter");
    archive.classList.add("viewer-on");
    var current = -1;
    function show(i) {
      if (i === current) return;
      current = i;
      var ch = +records[i].dataset.ch;
      records.forEach(function (r, k) { r.classList.toggle("shown", k <= i); });
      chapters.forEach(function (c, k) {
        c.classList.toggle("on", k === ch);
        c.classList.toggle("done", k < ch);
      });
    }
    show(0);
    ScrollTrigger.create({
      trigger: archive, start: "top top", end: "bottom bottom",
      onUpdate: function (self) { show(Math.min(records.length - 1, Math.floor(self.progress * records.length))); }
    });
    gsap.fromTo(".track-fill", { scaleY: 0 }, {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: archive, start: "top top", end: "bottom bottom", scrub: true }
    });
    return function () {
      archive.classList.remove("viewer-on");
      records.forEach(function (r) { r.classList.remove("shown"); });
      chapters.forEach(function (c) { c.classList.remove("on", "done"); });
    };
  });

  // 4. Work in Motion: the counter runs up; the row of cards slides sideways while held.
  var count = document.querySelector(".count");
  if (count) {
    gsap.from(count, {
      textContent: 0, snap: { textContent: 1 }, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: count, start: "top 85%", once: true }
    });
  }
  gsap.from(".track .card", {
    y: 70, opacity: 0, stagger: 0.06, duration: 0.8, ease: "power3.out",
    scrollTrigger: { trigger: ".strip", start: "top 85%", once: true }
  });
  mm.add("(min-width: 900px)", function () {
    var strip = document.querySelector(".strip");
    var track = document.querySelector(".track");
    strip.classList.add("is-pinned");
    var dist = function () { return Math.max(0, track.scrollWidth - strip.clientWidth); };
    var slide = gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: {
        trigger: strip, start: "center center",
        end: function () { return "+=" + dist(); },
        pin: true, scrub: 0.6, invalidateOnRefresh: true
      }
    });
    gsap.utils.toArray(".track .card").forEach(function (card) {
      ScrollTrigger.create({ containerAnimation: slide, trigger: card, start: "left 55%", end: "right 55%", toggleClass: "on" });
    });
    return function () { strip.classList.remove("is-pinned"); };
  });

  // 5. Frame by Frame: each still opens like a shutter as its row arrives.
  gsap.utils.toArray(".stills li").forEach(function (li) {
    var st = { trigger: li, start: "top 88%", once: true };
    gsap.fromTo(li.querySelector(".thumb"), { clipPath: "inset(0 0 0 100% round 14px)" },
      { clipPath: "inset(0 0 0 0% round 14px)", duration: 1, ease: "power3.inOut", scrollTrigger: st });
    gsap.from(li.querySelector(".t"), { y: 30, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: st });
  });

  // 6. Brand cloud: names drift into focus around the line, then blur away.
  mm.add("(min-height: 500px)", function () {
    var cloud = document.querySelector(".cloud");
    cloud.classList.add("cloud-on");
    var names = gsap.utils.toArray(".names li");
    var tl = gsap.timeline({ scrollTrigger: { trigger: cloud, start: "top top", end: "bottom bottom", scrub: 0.6 } });
    tl.fromTo(".cloud-line", { opacity: 0.2, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.5 }, 0.1);
    names.forEach(function (n, i) {
      tl.fromTo(n, { opacity: 0, filter: "blur(14px)", y: 70 }, { opacity: 0.95, filter: "blur(0px)", y: 0, duration: 0.5 }, i * 0.05)
        .to(n, { opacity: 0.12, filter: "blur(10px)", y: -70, duration: 0.5 }, 0.75 + i * 0.04);
    });
    return function () { cloud.classList.remove("cloud-on"); };
  });

  // Headings and rows ease in once.
  gsap.utils.toArray(".h-xl, .intro .label, .prose p, .foot-card").forEach(function (el) {
    gsap.from(el, { y: 50, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });
  gsap.from(".contents li", {
    y: 40, opacity: 0, stagger: 0.08, duration: 0.7, ease: "power3.out",
    scrollTrigger: { trigger: ".contents", start: "top 85%", once: true }
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
