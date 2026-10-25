(function () {
  "use strict";

  /*
   * =========================================================
   * CONCIERGE PAGE MASCOT
   * =========================================================
   *
   * On the full Concierge page the North Crescent mascot peeks
   * up from behind the email field, waves and asks the visitor
   * to enter their email to start the conversation, then ducks
   * back down. Repeats until the visitor uses the field, the
   * conversation starts, or the mascot is hidden (remembered
   * for the visit).
   *
   * Not shown inside the site chat widget (?embed=1) or for
   * visitors who prefer reduced motion.
   * =========================================================
   */

  const input = document.getElementById("conciergeEmail");
  const chatSection = document.getElementById("conciergeChatSection");

  if (
    !input ||
    document.body.classList.contains("concierge-embed-mode") ||
    (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  const STORAGE_KEY = "ncConciergePageMascotOff";

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return;
    }
  } catch (error) {
    /* Private mode: continue. */
  }

  const TIMING = {
    firstDelay: 1800,
    typing: 1200,
    visible: 7000,
    gap: 10000,
    hoverHold: 2500
  };

  const isFrench =
    (document.documentElement.lang || "").toLowerCase().indexOf("fr") === 0;

  const TEXT = isFrench
    ? {
        messages: [
          "Entrez votre courriel pour commencer la conversation 👇",
          "Votre courriel suffit pour commencer à discuter ! ✉️"
        ],
        hide: "Masquer"
      }
    : {
        messages: [
          "Enter your email to start the conversation 👇",
          "Just your email and we can start chatting! ✉️"
        ],
        hide: "Hide"
      };

  /* Anchor wraps the field so the mascot can hide behind it. */
  const anchor = document.createElement("div");
  anchor.className = "cc-mascot-anchor";
  input.parentNode.insertBefore(anchor, input);

  const bubble = document.createElement("div");
  bubble.className = "cc-mascot-bubble";
  bubble.setAttribute("aria-hidden", "true");
  bubble.innerHTML = `
    <button type="button" class="cc-mascot-close" tabindex="-1" title="${TEXT.hide}">×</button>
    <span class="cc-mascot-dots"><i></i><i></i><i></i></span>
    <span class="cc-mascot-text"></span>
  `;

  const stage = document.createElement("div");
  stage.className = "cc-mascot-stage";
  stage.setAttribute("aria-hidden", "true");
  stage.innerHTML = `
    <div class="cc-mascot-figure">
      <div class="cc-mascot-bob">
        <img class="cc-mascot-layer" data-layer="base" alt="" width="420" height="386" decoding="async" draggable="false">
        <img class="cc-mascot-layer cc-mascot-hand" data-layer="hand" alt="" width="420" height="386" decoding="async" draggable="false">
        <img class="cc-mascot-layer" data-layer="cuff" alt="" width="420" height="386" decoding="async" draggable="false">
      </div>
    </div>
  `;

  anchor.appendChild(stage);
  anchor.appendChild(input);
  anchor.appendChild(bubble);

  const textEl = bubble.querySelector(".cc-mascot-text");
  const layers = Array.prototype.slice.call(stage.querySelectorAll("img"));

  const state = {
    timer: 0,
    stepTimer: 0,
    out: false,
    hovering: false,
    stopped: false,
    round: 0
  };

  function schedule(fn, delay) {
    clearTimeout(state.timer);
    state.timer = setTimeout(fn, delay);
  }

  function chatStarted() {
    return chatSection && !chatSection.hidden;
  }

  function blocked() {
    return (
      document.hidden ||
      chatStarted() ||
      document.activeElement === input ||
      input.value.trim() !== "" ||
      input.getClientRects().length === 0 ||
      document.body.classList.contains("menu-open")
    );
  }

  function retract() {
    clearTimeout(state.stepTimer);
    anchor.classList.remove("is-typing", "is-talking");
    state.stepTimer = setTimeout(function () {
      anchor.classList.remove("is-out", "is-waving");
      state.out = false;
    }, 200);
  }

  function show() {
    if (state.stopped) {
      return;
    }

    if (blocked()) {
      schedule(show, TIMING.gap);
      return;
    }

    textEl.textContent = TEXT.messages[state.round % TEXT.messages.length];
    state.round += 1;

    state.out = true;
    anchor.classList.add("is-out");

    clearTimeout(state.stepTimer);
    state.stepTimer = setTimeout(function () {
      anchor.classList.add("is-typing");
      state.stepTimer = setTimeout(function () {
        anchor.classList.remove("is-typing");
        anchor.classList.add("is-talking", "is-waving");
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

  /* Click the mascot or its bubble: go straight to the email field. */
  function onClick(event) {
    if (event.target.closest(".cc-mascot-close")) {
      event.preventDefault();
      stopForVisit();
      return;
    }
    if (state.out) {
      input.focus();
    }
  }

  stage.addEventListener("click", onClick);
  bubble.addEventListener("click", onClick);

  [stage, bubble].forEach(function (el) {
    el.addEventListener("mouseenter", function () { state.hovering = true; });
    el.addEventListener("mouseleave", function () { state.hovering = false; });
  });

  /* The visitor is using the field: duck down right away. */
  input.addEventListener("focus", function () {
    state.hovering = false;
    clearTimeout(state.timer);
    retract();
  });

  input.addEventListener("blur", function () {
    if (!state.stopped && input.value.trim() === "" && !chatStarted()) {
      schedule(show, TIMING.gap);
    }
  });

  /* Once the conversation starts, the mascot is done for this visit. */
  if (chatSection && "MutationObserver" in window) {
    new MutationObserver(function () {
      if (chatStarted()) {
        stopForVisit();
      }
    }).observe(chatSection, { attributes: true, attributeFilter: ["hidden"] });
  }

  function start() {
    layers.forEach(function (img) {
      img.src = "/images/concierge-mascot-" + img.dataset.layer + ".webp";
    });

    Promise.all(
      layers.map(function (img) {
        return img.decode ? img.decode().catch(function () {}) : null;
      })
    ).then(function () {
      schedule(show, TIMING.firstDelay);
    });
  }

  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
})();
