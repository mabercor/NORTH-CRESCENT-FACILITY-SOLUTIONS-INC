(function () {
  "use strict";

  /*
   * =========================================================
   * CONTACT PAGE MASCOT
   * =========================================================
   *
   * The North Crescent mascot peeks up over the quote form to
   * encourage the visitor to finish their request:
   *
   *   - at the top of the form (first fields): "enter your
   *     details and we'll prepare your quote in minutes"
   *   - over the "Get My Free Quote" button: "you're one step
   *     away from a spotless space"
   *
   * Only the spot that is on screen is used. He waits while the
   * visitor is typing, and stops for the visit once the request
   * is sent or he is hidden with the ×.
   * =========================================================
   */

  const form = document.getElementById("contactForm");
  const submit = document.getElementById("submitBtn");
  const nameField = document.getElementById("clientName");
  const emailField = document.getElementById("emailAddress");

  if (
    !form || !submit || !nameField || !emailField ||
    (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  const STORAGE_KEY = "ncContactMascotOff";

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return;
    }
  } catch (error) {
    /* Private mode: continue. */
  }

  /* Tells the "Chat with Us" mascot to stay inside its button here. */
  document.body.classList.add("nc-page-mascot");

  const TIMING = {
    firstDelay: 2000,
    typing: 1200,
    visible: 7000,
    gap: 9000,
    retry: 2500,      // nothing on screen yet: look again soon
    typingPause: 4000,
    hoverHold: 2500
  };

  const isFrench =
    (document.documentElement.lang || "").toLowerCase().indexOf("fr") === 0;

  const TEXT = isFrench
    ? {
        top: [
          "Entrez vos coordonnées et nous préparons votre soumission en quelques minutes ⏱️",
          "Rapide, professionnel et au meilleur prix ✨"
        ],
        bottom: [
          "Vous êtes à un pas d’un espace impeccable ! ✨",
          "Un clic et votre soumission est en route 🚀"
        ],
        hide: "Masquer"
      }
    : {
        top: [
          "Enter your details and we’ll prepare your quote in minutes ⏱️",
          "Fast, professional and at the best price ✨"
        ],
        bottom: [
          "You’re one step away from a spotless space! ✨",
          "One click and your quote is on its way 🚀"
        ],
        hide: "Hide"
      };

  const ART = "/images/concierge-mascot-";

  /* ---------------------------------------------------------
     BUILD ONE SPOT
     host: positioned element; the mascot rises from its top edge
     --------------------------------------------------------- */

  function buildSpot(host, messages, kind) {
    const root = document.createElement("div");
    root.className = "nc-fp nc-fp--" + kind;
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
    host.appendChild(root);

    return {
      kind: kind,
      host: host,
      root: root,
      text: root.querySelector(".nc-fp-text"),
      messages: messages,
      round: 0
    };
  }

  /* Top of the form: over the email field (right column), or over
     the name field when the two fields are stacked on phones. */
  const topOverEmail = buildSpot(emailField.parentNode, TEXT.top, "top");
  const topOverName = buildSpot(nameField.parentNode, TEXT.top, "top");

  /* Over the submit button: a zero-height anchor sitting on its top edge. */
  const submitAnchor = document.createElement("div");
  submitAnchor.className = "nc-fp-anchor";
  submit.parentNode.insertBefore(submitAnchor, submit);
  const bottomSpot = buildSpot(submitAnchor, TEXT.bottom, "bottom");

  const spots = [topOverEmail, topOverName, bottomSpot];

  function topSpot() {
    const nameTop = nameField.getBoundingClientRect().top;
    const emailTop = emailField.getBoundingClientRect().top;
    return emailTop > nameTop + 8 ? topOverName : topOverEmail;
  }

  function onScreen(el) {
    const rect = el.getBoundingClientRect();
    const header = 110;
    return (
      rect.height > 0 &&
      rect.top > header + 90 &&           // room for the mascot above it
      rect.bottom < window.innerHeight - 40
    );
  }

  function pickSpot() {
    if (onScreen(submit)) {
      return bottomSpot;
    }
    const top = topSpot();
    return onScreen(top.host) ? top : null;
  }

  /* ---------------------------------------------------------
     STATE
     --------------------------------------------------------- */

  const state = {
    timer: 0,
    stepTimer: 0,
    current: null,
    hovering: false,
    stopped: false,
    lastTyping: 0
  };

  function schedule(fn, delay) {
    clearTimeout(state.timer);
    state.timer = setTimeout(fn, delay);
  }

  function sent() {
    return (
      submit.classList.contains("is-done") ||
      document.body.classList.contains("nc-modal-open")
    );
  }

  function blocked() {
    return (
      document.hidden ||
      sent() ||
      Date.now() - state.lastTyping < TIMING.typingPause ||
      document.body.classList.contains("menu-open") ||
      document.body.classList.contains("nc-concierge-widget-open")
    );
  }

  function retract() {
    const spot = state.current;
    clearTimeout(state.stepTimer);
    if (!spot) {
      return;
    }
    spot.root.classList.remove("is-typing", "is-talking");
    state.stepTimer = setTimeout(function () {
      spot.root.classList.remove("is-out", "is-waving");
    }, 200);
    state.current = null;
  }

  function show() {
    if (state.stopped) {
      return;
    }

    if (blocked()) {
      schedule(show, TIMING.retry);
      return;
    }

    const spot = pickSpot();

    /* The field he would sit on is being used: wait. */
    if (!spot || spot.host.contains(document.activeElement)) {
      schedule(show, TIMING.retry);
      return;
    }

    spot.text.textContent = spot.messages[spot.round % spot.messages.length];
    spot.round += 1;

    state.current = spot;
    spot.root.classList.add("is-out");

    clearTimeout(state.stepTimer);
    state.stepTimer = setTimeout(function () {
      spot.root.classList.add("is-typing");
      state.stepTimer = setTimeout(function () {
        spot.root.classList.remove("is-typing");
        spot.root.classList.add("is-talking", "is-waving");
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

  function stopForVisit(remember) {
    state.stopped = true;
    clearTimeout(state.timer);
    retract();
    document.body.classList.remove("nc-page-mascot");
    if (remember) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch (error) {
        /* Private mode: it still stops for this page view. */
      }
    }
  }

  /* First required field still empty, so a click takes them there. */
  function nextField() {
    const fields = form.querySelectorAll(
      "input[required], select[required], textarea[required]"
    );
    for (let i = 0; i < fields.length; i += 1) {
      const f = fields[i];
      if (f.type !== "hidden" && f.getClientRects().length && !String(f.value).trim()) {
        return f;
      }
    }
    return submit;
  }

  /* ---------------------------------------------------------
     EVENTS
     --------------------------------------------------------- */

  spots.forEach(function (spot) {
    spot.root.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (event.target.closest(".nc-fp-close")) {
        stopForVisit(true);
        return;
      }

      if (state.current === spot) {
        const target = nextField();
        retract();
        schedule(show, TIMING.gap);
        target.focus();
        if (target.scrollIntoView) {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    });

    spot.root.addEventListener("mouseenter", function () { state.hovering = true; });
    spot.root.addEventListener("mouseleave", function () { state.hovering = false; });
  });

  /* While the visitor is typing, he waits his turn. */
  form.addEventListener("input", function () {
    state.lastTyping = Date.now();
  });

  /* The visitor moved into the field he is sitting on: duck right away. */
  form.addEventListener("focusin", function () {
    if (state.current && state.current.host.contains(document.activeElement)) {
      state.hovering = false;
      retract();
      schedule(show, TIMING.gap);
    }
  });

  /* Scrolling: duck if his spot leaves the screen, and greet the
     visitor quickly the first time they reach the submit button. */
  let scrollQueued = false;

  window.addEventListener("scroll", function () {
    if (scrollQueued || state.stopped) {
      return;
    }
    scrollQueued = true;

    setTimeout(function () {
      scrollQueued = false;

      if (state.current && !onScreen(state.current.host)) {
        state.hovering = false;
        retract();
        schedule(show, TIMING.retry);
        return;
      }

      if (!state.current && bottomSpot.round === 0 && onScreen(submit) && !blocked()) {
        schedule(show, 900);
      }
    }, 250);
  }, { passive: true });

  /* Request sent: he is done for this visit. */
  if ("MutationObserver" in window) {
    new MutationObserver(function () {
      if (sent()) {
        stopForVisit(true);
      }
    }).observe(submit, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------------------------------------------------------
     START (artwork loads after the page)
     --------------------------------------------------------- */

  function start() {
    const imgs = [];
    spots.forEach(function (spot) {
      spot.root.querySelectorAll("img").forEach(function (img) {
        img.src = ART + img.dataset.layer + ".webp";
        imgs.push(img);
      });
    });

    Promise.all(
      imgs.map(function (img) {
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
