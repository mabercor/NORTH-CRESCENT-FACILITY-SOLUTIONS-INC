(function () {
  "use strict";

  /*
   * =========================================================
   * BOOKING PAGE MASCOT
   * =========================================================
   *
   * The North Crescent mascot guides the visitor through the
   * booking: he peeks up over the step they are on (service,
   * date, time, details, review) with a short motivating line,
   * and congratulates them as each step gets done.
   *
   * On this page the "Chat with Us" mascot stays inside its
   * button (body.nc-page-mascot), so only this guide appears.
   *
   * He waits while the visitor is typing, ducks when his spot
   * leaves the screen, and stops for the visit once the booking
   * is sent or he is hidden with the ×.
   * Uses the shared .nc-fp styles from /concierge-widget.css.
   * =========================================================
   */

  /* The chat button's mascot never pops out on the booking page. */
  document.body.classList.add("nc-page-mascot");

  const $ = function (id) { return document.getElementById(id); };

  const progress = $("booking-progress");
  const reviewSection = $("booking-review");
  const successSection = $("booking-success");
  const reviewButton = $("booking-review-button");
  const submitButton = $("booking-submit-button");

  if (
    !progress || !reviewSection || !reviewButton || !submitButton ||
    (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  ) {
    return;
  }

  const STORAGE_KEY = "ncBookingMascotOff";

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return;
    }
  } catch (error) {
    /* Private mode: continue. */
  }

  const TIMING = {
    firstDelay: 2200,
    typing: 1100,
    visible: 7000,
    gap: 9000,
    retry: 2500,
    afterStep: 900,    // a step was just completed: cheer quickly
    typingPause: 4000,
    hoverHold: 2500
  };

  const isFrench =
    (document.documentElement.lang || "").toLowerCase().indexOf("fr") === 0;

  const TEXT = isFrench
    ? {
        email: [
          "Commencez ici : entrez votre courriel pour réserver en une minute ⏱️",
          "Votre espace impeccable est à quelques clics ✨ Entrez votre courriel"
        ],
        emailMissing: [
          "Il ne manque que votre courriel, juste en haut ☝️"
        ],
        service: [
          "Commençons ! Choisissez le service dont vous avez besoin 👆",
          "Votre espace impeccable commence ici ✨ Choisissez un service"
        ],
        date: [
          "Excellent choix ! 🙌 Choisissez maintenant une date",
          "Les places partent vite, réservez votre date 📅"
        ],
        time: [
          "Presque fini ! Choisissez votre heure préférée ⏰",
          "Matin, après-midi ou soir ? C’est vous qui décidez 😊"
        ],
        details: [
          "Plus que vos coordonnées et c’est terminé ! 📝",
          "Moins d’une minute pour finaliser votre réservation ⏱️"
        ],
        ready: [
          "Tout est prêt ! Cliquez sur « Vérifier et confirmer » ✅",
          "Un clic pour voir le résumé de votre réservation 🚀"
        ],
        review: [
          "Dernière étape ! Envoyez et votre nettoyage est réservé 🎉",
          "Tout est bon ? Envoyez votre demande ✨"
        ],
        hide: "Masquer"
      }
    : {
        email: [
          "Start here: enter your email and book in under a minute ⏱️",
          "Your spotless space is a few clicks away ✨ Enter your email"
        ],
        emailMissing: [
          "Only your email is missing, right up top ☝️"
        ],
        service: [
          "Let’s get started! Pick the service you need 👆",
          "Your spotless space starts here ✨ Choose a service"
        ],
        date: [
          "Great choice! 🙌 Now pick a day that works for you",
          "Spots fill up fast, grab your date 📅"
        ],
        time: [
          "Almost there! Choose your preferred time ⏰",
          "Morning, afternoon or evening? You decide 😊"
        ],
        details: [
          "Just your contact details and you’re done! 📝",
          "Less than a minute to finish your booking ⏱️"
        ],
        ready: [
          "All set! Tap “Review & Confirm” ✅",
          "One click to see your booking summary 🚀"
        ],
        review: [
          "Last step! Send it and your cleaning is booked 🎉",
          "Everything look good? Submit your request ✨"
        ],
        hide: "Hide"
      };

  const ART = "/images/concierge-mascot-";

  /* ---------------------------------------------------------
     SPOTS (one per step; he rises from the host's top edge)
     --------------------------------------------------------- */

  function buildSpot(host, messages, kind, focusTarget) {
    if (!host) {
      return null;
    }

    if (getComputedStyle(host).position === "static") {
      host.style.position = "relative";
    }

    const root = document.createElement("div");
    root.className = "nc-fp nc-fp--booking nc-fp--" + kind;
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
      focusTarget: focusTarget,
      round: 0
    };
  }

  const SPOTS = {
    service: buildSpot($("booking-services"), TEXT.service, "service", function () {
      return document.querySelector("#booking-services input");
    }),
    date: buildSpot($("booking-schedule"), TEXT.date, "date", function () {
      return document.querySelector("#booking-calendar-days button:not([disabled])");
    }),
    time: buildSpot($("booking-time-card"), TEXT.time, "time", function () {
      return document.querySelector("#booking-time-card fieldset:not([hidden]) input");
    }),
    details: buildSpot($("booking-customer"), TEXT.details, "details", function () {
      const fields = document.querySelectorAll("#booking-customer input[required]");
      for (let i = 0; i < fields.length; i += 1) {
        if (!String(fields[i].value).trim()) {
          return fields[i];
        }
      }
      return reviewButton;
    }),
    ready: buildSpot(reviewButton.parentNode, TEXT.ready, "ready", function () {
      return reviewButton;
    }),
    review: buildSpot(submitButton.parentNode, TEXT.review, "review", function () {
      return submitButton;
    })
  };

  /* EMAIL (top of the page). When the email card sits beside the hero
     text (wide screens) there is no room above it, so he rises from the
     top edge of the booking card, just under the email box. When it is
     stacked under the text (tablets, phones), he rises over the box. */
  const emailCard = $("booking-email-card");
  const emailInput = $("booking-start-email");
  const heroCopy = document.querySelector(".booking-hero-copy");
  const stage = $("booking-stage");

  function focusEmail() {
    return emailInput;
  }

  const emailOverCard = buildSpot(emailCard, TEXT.email, "email", focusEmail);
  const emailUnderCard = buildSpot(stage, TEXT.email, "email", focusEmail);
  if (emailUnderCard) {
    emailUnderCard.root.classList.add("nc-fp--email-stage");
  }

  /* Details filled in but the email at the top is still missing. */
  SPOTS.emailMissing = buildSpot($("booking-customer"), TEXT.emailMissing, "email-missing", focusEmail);

  function emailIsValid() {
    return !emailCard || emailCard.classList.contains("is-valid");
  }

  function emailSpot() {
    if (!emailCard || !emailInput) {
      return null;
    }
    const card = emailCard.getBoundingClientRect();
    const copy = heroCopy ? heroCopy.getBoundingClientRect() : null;
    const stacked = !copy || card.top >= copy.bottom - 4;

    if (stacked) {
      return emailOverCard;
    }

    /* Line him up under the right part of the email box. */
    if (emailUnderCard && stage) {
      const stageRect = stage.getBoundingClientRect();
      const right = Math.max(14, Math.round(stageRect.right - card.right + 28));
      emailUnderCard.root.style.setProperty("--nc-fp-r", right + "px");
    }
    return emailUnderCard;
  }

  SPOTS.emailCard = emailOverCard;
  SPOTS.emailStage = emailUnderCard;

  const spots = Object.keys(SPOTS)
    .map(function (key) { return SPOTS[key]; })
    .filter(Boolean);

  /* ---------------------------------------------------------
     WHICH STEP IS THE VISITOR ON?
     --------------------------------------------------------- */

  const STEP_TO_SPOT = { 1: "service", 2: "date", 3: "time", 4: "details" };

  function sent() {
    return successSection ? !successSection.hidden : false;
  }

  function currentKind() {
    if (sent()) {
      return null;
    }
    if (!reviewSection.hidden) {
      return "review";
    }
    if (reviewButton.classList.contains("is-ready")) {
      return "ready";
    }
    const active = progress.querySelector(".is-active[data-booking-step]");
    return active ? STEP_TO_SPOT[active.dataset.bookingStep] || null : "service";
  }

  function onScreen(el) {
    const rect = el.getBoundingClientRect();
    const header = 110;
    return (
      rect.height >= 0 &&
      el.getClientRects().length > 0 &&
      rect.top > header + 90 &&             // room for him above the edge
      rect.top < window.innerHeight - 60
    );
  }

  function pickSpot() {
    const kind = currentKind();

    /* Nothing chosen yet and no email: invite them to start up top. */
    if (kind === "service" && !emailIsValid()) {
      const top = emailSpot();
      if (top && onScreen(top.host)) {
        return top;
      }
    }

    /* All details typed, only the email is missing. */
    if (kind === "details" && !emailIsValid() && detailsTyped()) {
      const top = emailSpot();
      if (top && onScreen(top.host)) {
        return top;
      }
      if (SPOTS.emailMissing && onScreen(SPOTS.emailMissing.host)) {
        return SPOTS.emailMissing;
      }
    }

    const spot = kind ? SPOTS[kind] : null;
    return spot && onScreen(spot.host) ? spot : null;
  }

  function detailsTyped() {
    const fields = document.querySelectorAll("#booking-customer input[required]");
    for (let i = 0; i < fields.length; i += 1) {
      if (!String(fields[i].value).trim()) {
        return false;
      }
    }
    return fields.length > 0;
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
    lastTyping: 0,
    lastKind: null
  };

  function schedule(fn, delay) {
    clearTimeout(state.timer);
    state.timer = setTimeout(fn, delay);
  }

  function isTypingField(el) {
    return Boolean(
      el && el.matches &&
      el.matches("input[type=text], input[type=tel], input[type=email], textarea")
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

    /* Off screen, or the visitor is typing in the field under him: wait. */
    if (
      !spot ||
      (isTypingField(document.activeElement) &&
        spot.host.contains(document.activeElement))
    ) {
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
    if (remember) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch (error) {
        /* Private mode: it still stops for this page view. */
      }
    }
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

      /* Click on him: take the visitor to what they need to do next. */
      if (state.current === spot) {
        const target = spot.focusTarget && spot.focusTarget();
        state.hovering = false;
        retract();
        schedule(show, TIMING.gap);
        if (target) {
          target.focus({ preventScroll: true });
          if (target.scrollIntoView) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }
    });

    spot.root.addEventListener("mouseenter", function () { state.hovering = true; });
    spot.root.addEventListener("mouseleave", function () { state.hovering = false; });
  });

  /* While the visitor is typing, he waits his turn. */
  document.addEventListener("input", function (event) {
    if (isTypingField(event.target)) {
      state.lastTyping = Date.now();
    }
  });

  /* A step was completed (or the view changed): move to the new
     step and cheer the visitor on right away. */
  function onStepChange() {
    if (state.stopped) {
      return;
    }

    if (sent()) {
      stopForVisit(true);
      return;
    }

    const kind = currentKind() + (emailIsValid() ? "" : ":no-email");
    if (kind === state.lastKind) {
      return;
    }
    state.lastKind = kind;

    if (state.current) {
      state.hovering = false;
      retract();
    }
    schedule(show, TIMING.afterStep);
  }

  if ("MutationObserver" in window) {
    const observer = new MutationObserver(onStepChange);
    observer.observe(progress, { subtree: true, attributes: true, attributeFilter: ["class"] });
    observer.observe(reviewButton, { attributes: true, attributeFilter: ["class"] });
    if (emailCard) {
      observer.observe(emailCard, { attributes: true, attributeFilter: ["class"] });
    }
    observer.observe(reviewSection, { attributes: true, attributeFilter: ["hidden"] });
    if (successSection) {
      observer.observe(successSection, { attributes: true, attributeFilter: ["hidden"] });
    }
  }

  /* Scrolling: duck if his spot leaves the screen, come back soon. */
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
      }
    }, 250);
  }, { passive: true });

  /* ---------------------------------------------------------
     START (artwork loads after the page)
     --------------------------------------------------------- */

  function start() {
    state.lastKind = currentKind() + (emailIsValid() ? "" : ":no-email");

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
