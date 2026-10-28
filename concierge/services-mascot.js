(function () {
  "use strict";

  /*
   * =========================================================
   * HOME PAGE — SERVICES MASCOT
   * =========================================================
   *
   * The North Crescent mascot peeks up over the first services
   * card ("Commercial & Professional Cleaning Services") and
   * invites the visitor to explore the services and pick one.
   *
   * He only appears while that card is on screen. While he is
   * out, the "Chat with Us" mascot stays inside its button, and
   * he waits if that one is already out, so they never talk at
   * the same time. Hidden with the × for the rest of the visit.
   * Uses the shared .nc-fp styles from /concierge-widget.css.
   * =========================================================
   */

  const card = document.querySelector(".services-overview-card");
  const grid = card && card.parentNode;
  const list = card && card.querySelector(".services-button-list");

  if (
    !card || !grid || !list ||
    (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  const STORAGE_KEY = "ncServicesMascotOff";

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return;
    }
  } catch (error) {
    /* Private mode: continue. */
  }

  const TIMING = {
    firstDelay: 1200,   // once the card comes on screen
    typing: 1100,
    visible: 7000,
    gap: 10000,
    retry: 2000,
    hoverHold: 2500
  };

  const isFrench =
    (document.documentElement.lang || "").toLowerCase().indexOf("fr") === 0;

  const TEXT = isFrench
    ? {
        messages: [
          "Découvrez nos services 👇 Choisissez celui qu’il vous faut",
          "Touchez un service pour voir comment nous pouvons vous aider ✨",
          "Bureau, maison ou chantier ? Nous avons le service pour vous 🧽"
        ],
        hide: "Masquer"
      }
    : {
        messages: [
          "Discover our services 👇 Pick the one you need",
          "Tap a service to see how we can help you ✨",
          "Office, home or job site? We have the right service for you 🧽"
        ],
        hide: "Hide"
      };

  const ART = "/images/concierge-mascot-";

  /* The card clips its content, so he lives on the grid (not as a
     grid cell: absolutely positioned) and is lined up over the card. */
  if (getComputedStyle(grid).position === "static") {
    grid.style.position = "relative";
  }

  const root = document.createElement("div");
  root.className = "nc-fp nc-fp--offset nc-fp--services";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="nc-fp-bubble">
      <button type="button" class="nc-fp-close" tabindex="-1" title="${TEXT.hide}">×</button>
      <span class="nc-fp-dots"><i></i><i></i><i></i></span>
      <span class="nc-fp-text"></span>
    </div>
    <div class="nc-fp-stage">
      <div class="nc-fp-figure">
        <div class="nc-fp-bob">
          <img class="nc-fp-layer" data-layer="base" alt="" width="420" height="386" decoding="async" draggable="false">
          <img class="nc-fp-layer nc-fp-hand" data-layer="hand" alt="" width="420" height="386" decoding="async" draggable="false">
          <img class="nc-fp-layer" data-layer="cuff" alt="" width="420" height="386" decoding="async" draggable="false">
        </div>
      </div>
    </div>
  `;
  grid.appendChild(root);

  const textEl = root.querySelector(".nc-fp-text");

  const state = {
    timer: 0,
    stepTimer: 0,
    out: false,
    hovering: false,
    stopped: false,
    started: false,
    round: 0
  };

  function schedule(fn, delay) {
    clearTimeout(state.timer);
    state.timer = setTimeout(fn, delay);
  }

  /* Line him up over the right side of the first card. */
  function place() {
    const g = grid.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    root.style.top = Math.round(c.top - g.top) + "px";
    root.style.setProperty("--nc-fp-r", Math.max(14, Math.round(g.right - c.right + 18)) + "px");
  }

  function onScreen() {
    const rect = card.getBoundingClientRect();
    const header = 110;
    return (
      rect.top > header + 90 &&
      rect.top < window.innerHeight - 120
    );
  }

  function blocked() {
    return (
      document.hidden ||
      document.body.classList.contains("menu-open") ||
      document.body.classList.contains("nc-concierge-widget-open") ||
      Boolean(document.querySelector(".nc-peek.is-out"))
    );
  }

  function retract() {
    clearTimeout(state.stepTimer);
    root.classList.remove("is-typing", "is-talking");
    state.stepTimer = setTimeout(function () {
      root.classList.remove("is-out", "is-waving");
      /* The chat button's mascot may come out again. */
      document.body.classList.remove("nc-page-mascot");
    }, 200);
    state.out = false;
  }

  function show() {
    if (state.stopped) {
      return;
    }

    if (blocked() || !onScreen()) {
      schedule(show, TIMING.retry);
      return;
    }

    place();
    textEl.textContent = TEXT.messages[state.round % TEXT.messages.length];
    state.round += 1;

    document.body.classList.add("nc-page-mascot");
    state.out = true;
    root.classList.add("is-out");

    clearTimeout(state.stepTimer);
    state.stepTimer = setTimeout(function () {
      root.classList.add("is-typing");
      state.stepTimer = setTimeout(function () {
        root.classList.remove("is-typing");
        root.classList.add("is-talking", "is-waving");
      }, TIMING.typing);
    }, 500);

    schedule(hide, TIMING.visible);
  }

  function hide() {
    if (state.hovering) {
      schedule(hide, TIMING.hoverHold);
      return;
    }
    retract();
    if (!state.stopped) {
      schedule(show, TIMING.gap);
    }
  }

  function stopForVisit() {
    state.stopped = true;
    clearTimeout(state.timer);
    retract();
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (error) {
      /* Private mode: it still stops for this page view. */
    }
  }

  /* ---------------------------------------------------------
     EVENTS
     --------------------------------------------------------- */

  root.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (event.target.closest(".nc-fp-close")) {
      stopForVisit();
      return;
    }

    /* Click on him: bring the list of services into view. */
    if (state.out) {
      const first = list.querySelector("a");
      state.hovering = false;
      retract();
      schedule(show, TIMING.gap);
      list.scrollIntoView({ behavior: "smooth", block: "center" });
      if (first) {
        first.focus({ preventScroll: true });
      }
    }
  });

  root.addEventListener("mouseenter", function () { state.hovering = true; });
  root.addEventListener("mouseleave", function () { state.hovering = false; });

  /* Duck when the card scrolls away. */
  let scrollQueued = false;

  window.addEventListener("scroll", function () {
    if (scrollQueued || state.stopped || !state.out) {
      return;
    }
    scrollQueued = true;
    setTimeout(function () {
      scrollQueued = false;
      if (state.out && !onScreen()) {
        state.hovering = false;
        retract();
        schedule(show, TIMING.retry);
      }
    }, 250);
  }, { passive: true });

  window.addEventListener("resize", function () {
    if (state.out) {
      place();
    }
  });

  /* ---------------------------------------------------------
     START: load the artwork when the section gets close
     --------------------------------------------------------- */

  function start() {
    if (state.started) {
      return;
    }
    state.started = true;

    const imgs = Array.prototype.slice.call(root.querySelectorAll("img"));
    imgs.forEach(function (img) {
      img.src = ART + img.dataset.layer + ".webp";
    });

    Promise.all(
      imgs.map(function (img) {
        return img.decode ? img.decode().catch(function () {}) : null;
      })
    ).then(function () {
      schedule(show, TIMING.firstDelay);
    });
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        start();
      }
    }, { rootMargin: "300px 0px" });
    io.observe(card);
  } else {
    window.addEventListener("load", start, { once: true });
  }
})();
