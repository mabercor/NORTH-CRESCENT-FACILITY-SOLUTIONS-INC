(function () {
  "use strict";

  /*
   * =========================================================
   * NORTH CRESCENT CONCIERGE WIDGET
   * =========================================================
   *
   * Opens the existing Cleaning Concierge application
   * inside a lightweight floating chat panel.
   *
   * The full Concierge page remains the single source
   * for the actual chat experience.
   * =========================================================
   */

  /* ---------------------------------------------------------
     DO NOT LOAD THE WIDGET ON THE FULL CONCIERGE PAGE
     --------------------------------------------------------- */

  if (
    document.body &&
    document.body.dataset.page === "cleaning-concierge"
  ) {
    return;
  }


  /* ---------------------------------------------------------
     DETECT CURRENT SERVICE CONTEXT
     --------------------------------------------------------- */

  function getCurrentService() {

    const path =
      window.location.pathname.toLowerCase();

    if (path.includes("airbnb")) {
      return "airbnb";
    }

    if (
      path.includes("post-construction") ||
      path.includes("post_construction")
    ) {
      return "post-construction";
    }

    if (
      path.includes("move-in") ||
      path.includes("move-out") ||
      path.includes("move_in") ||
      path.includes("move_out")
    ) {
      return "move-in-out";
    }

    if (path.includes("janitorial")) {
      return "janitorial";
    }

    if (path.includes("commercial")) {
      return "commercial";
    }

    if (path.includes("residential")) {
      return "residential";
    }

    return null;
  }


  /* ---------------------------------------------------------
     CURRENT PAGE
     --------------------------------------------------------- */

  const currentService =
    getCurrentService();


  /* ---------------------------------------------------------
     LANGUAGE (pages under /fr/ use <html lang="fr">)
     --------------------------------------------------------- */

  const isFrench =
    (document.documentElement.lang || "")
      .toLowerCase()
      .indexOf("fr") === 0;

  const TEXT = isFrench
    ? {
        open: "Ouvrir le concierge North Crescent",
        label: "Discuter avec nous",
        title: "Concierge North Crescent",
        status: "Ici pour vous aider",
        close: "Fermer le concierge",
        frame: "Concierge de nettoyage North Crescent",
        page: "/fr/cleaning-concierge.html?"
      }
    : {
        open: "Open North Crescent Concierge",
        label: "Chat with Us",
        title: "North Crescent Concierge",
        status: "Here to help",
        close: "Close Concierge",
        frame: "North Crescent Cleaning Concierge",
        page: "/cleaning-concierge.html?"
      };

  const source =
    window.location.pathname
      .split("/")
      .filter(Boolean)
      .pop() ||
    "website";


  /* ---------------------------------------------------------
     CREATE FLOATING BUTTON
     --------------------------------------------------------- */

  const button =
    document.createElement("button");

  button.type = "button";

  button.id =
    "ncConciergeWidgetButton";

  button.className =
    "nc-concierge-widget-button";

  button.setAttribute(
    "aria-label",
    TEXT.open
  );

  button.setAttribute(
    "aria-expanded",
    "false"
  );

   button.innerHTML = `
    <span
      class="nc-concierge-widget-icon"
      aria-hidden="true"
    >
      💬
    </span>

    <span class="nc-concierge-widget-label">
      ${TEXT.label}
    </span>
  `;


  /* ---------------------------------------------------------
     CREATE WIDGET CONTAINER
     --------------------------------------------------------- */

  const widget =
    document.createElement("div");

  widget.id =
    "ncConciergeWidget";

  widget.className =
    "nc-concierge-widget";

  widget.hidden = true;

  widget.innerHTML = `
    <div
      class="nc-concierge-widget-backdrop"
      data-concierge-close
      aria-hidden="true"
    ></div>

    <section
      class="nc-concierge-widget-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ncConciergeWidgetTitle"
    >

      <header class="nc-concierge-widget-header">

        <div class="nc-concierge-widget-identity">

          <div
            class="nc-concierge-widget-avatar"
            aria-hidden="true"
          >
            NC
          </div>

          <div>

            <h2 id="ncConciergeWidgetTitle">
              ${TEXT.title}
            </h2>

            <span class="nc-concierge-widget-status">

              <span
                aria-hidden="true"
              ></span>

              ${TEXT.status}

            </span>

          </div>

        </div>


        <button
          type="button"
          class="nc-concierge-widget-close"
          aria-label="${TEXT.close}"
          data-concierge-close
        >
          ×
        </button>

      </header>


      <div class="nc-concierge-widget-frame-wrap">

        <iframe
          id="ncConciergeWidgetFrame"
          title="${TEXT.frame}"
          loading="lazy"
          src="about:blank"
        ></iframe>

      </div>

    </section>
  `;


  /* ---------------------------------------------------------
     ADD WIDGET TO PAGE
     --------------------------------------------------------- */

  document.body.appendChild(button);

  document.body.appendChild(widget);


  /* ---------------------------------------------------------
     GET IFRAME
     --------------------------------------------------------- */

  const iframe =
    widget.querySelector(
      "#ncConciergeWidgetFrame"
    );


  /* ---------------------------------------------------------
     BUILD CONCIERGE URL
     --------------------------------------------------------- */

  function buildConciergeUrl() {

    const params =
      new URLSearchParams();

    params.set(
      "embed",
      "1"
    );

    params.set(
      "source",
      source
    );

    if (currentService) {

      params.set(
        "service",
        currentService
      );

    }

    return (
      TEXT.page +
      params.toString()
    );
  }


  /* ---------------------------------------------------------
     FOCUS EMAIL FIELD AFTER IFRAME LOAD
     --------------------------------------------------------- */

  iframe.addEventListener(
    "load",
    function () {

      try {

        const emailInput =
          iframe.contentDocument &&
          iframe.contentDocument.getElementById(
            "conciergeEmail"
          );

        if (emailInput) {
          emailInput.focus();
        }

      } catch (error) {

        /*
         * Same-origin is expected.
         * If focus is unavailable, the Concierge
         * continues working normally.
         */

      }

    }
  );


  /* ---------------------------------------------------------
     OPEN WIDGET
     --------------------------------------------------------- */

  function openWidget() {

    if (
      !iframe.src ||
      iframe.src === "about:blank"
    ) {

      iframe.src =
        buildConciergeUrl();

    }


    widget.hidden = false;

    document.body.classList.add(
      "nc-concierge-widget-open"
    );

    button.classList.add(
      "nc-concierge-widget-button-active"
    );

    button.setAttribute(
      "aria-expanded",
      "true"
    );

    /* The visitor found the chat: the mascot stops inviting for this visit. */
    stopPeekForSession();

  }


  /* ---------------------------------------------------------
     CLOSE WIDGET
     --------------------------------------------------------- */

  function closeWidget() {

    widget.hidden = true;

    document.body.classList.remove(
      "nc-concierge-widget-open"
    );

    button.classList.remove(
      "nc-concierge-widget-button-active"
    );

    button.setAttribute(
      "aria-expanded",
      "false"
    );

  }


  /* ---------------------------------------------------------
     TOGGLE BUTTON
     --------------------------------------------------------- */

  button.addEventListener(
    "click",
    function () {

      if (widget.hidden) {

        openWidget();

      } else {

        closeWidget();

      }

    }
  );


  /* ---------------------------------------------------------
     CLOSE BUTTON / BACKDROP
     --------------------------------------------------------- */

  widget.addEventListener(
    "click",
    function (event) {

      const closeTarget =
        event.target.closest(
          "[data-concierge-close]"
        );

      if (closeTarget) {

        closeWidget();

      }

    }
  );


  /* ---------------------------------------------------------
     ESCAPE KEY
     --------------------------------------------------------- */

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape" &&
        !widget.hidden
      ) {

        closeWidget();

      }

    }
  );


  /* ---------------------------------------------------------
     MASCOT PEEK
     The North Crescent mascot pops out of the "Chat with Us"
     button, waves and invites the visitor to chat, then hides
     back inside the button. Repeats in a loop until the visitor
     opens the chat or hides the mascot (remembered for the visit).
     --------------------------------------------------------- */

  const PEEK = {
    firstDelay: 3500,   // after page load, before the first appearance
    typing: 1300,       // "typing…" dots before the message shows
    visible: 6800,      // total time outside the button
    gap: 12000,         // time hidden inside the button between appearances
    hoverHold: 2500,    // stays out this long after the pointer leaves it
    storageKey: "ncConciergePeekOff",
    images: "/images/concierge-mascot-"
  };

  const PEEK_TEXT = isFrench
    ? {
        messages: [
          "Bonjour ! 👋 Besoin d'une soumission rapide ?",
          "Des questions sur nos services ? Discutons !",
          "Un nettoyage à réserver ? Je peux vous aider."
        ],
        cta: "Écrivez-nous →",
        hide: "Masquer"
      }
    : {
        messages: [
          "Hi there! 👋 Need a quick quote?",
          "Questions about our services? Let's chat!",
          "Booking a cleaning? I can help."
        ],
        cta: "Chat now →",
        hide: "Hide"
      };

  let peekState = null;

  function peekIsOff() {
    try {
      return sessionStorage.getItem(PEEK.storageKey) === "1";
    } catch (error) {
      return false;
    }
  }

  function stopPeekForSession() {
    try {
      sessionStorage.setItem(PEEK.storageKey, "1");
    } catch (error) {
      /* Private mode: it still stops for this page view. */
    }

    if (!peekState) {
      return;
    }

    peekState.stopped = true;
    clearTimeout(peekState.timer);
    clearTimeout(peekState.stepTimer);
    peekState.root.className = "nc-peek";
  }

  function initPeek() {

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || peekIsOff()) {
      return;
    }

    const root = document.createElement("div");
    root.className = "nc-peek";
    root.setAttribute("aria-hidden", "true");

    root.innerHTML = `
      <div class="nc-peek-bubble">
        <button type="button" class="nc-peek-close" tabindex="-1" title="${PEEK_TEXT.hide}">×</button>
        <span class="nc-peek-dots"><i></i><i></i><i></i></span>
        <span class="nc-peek-message">
          <span class="nc-peek-text"></span>
          <span class="nc-peek-cta">${PEEK_TEXT.cta}</span>
        </span>
      </div>
      <div class="nc-peek-figure">
        <div class="nc-peek-bob">
          <img class="nc-peek-layer" data-layer="base" alt="" width="420" height="386" decoding="async" draggable="false">
          <img class="nc-peek-layer nc-peek-hand" data-layer="hand" alt="" width="420" height="386" decoding="async" draggable="false">
          <img class="nc-peek-layer" data-layer="cuff" alt="" width="420" height="386" decoding="async" draggable="false">
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const textEl = root.querySelector(".nc-peek-text");
    const layers = Array.prototype.slice.call(
      root.querySelectorAll("img[data-layer]")
    );

    peekState = {
      root: root,
      timer: 0,
      stepTimer: 0,
      stopped: false,
      out: false,
      hovering: false,
      round: 0
    };

    /* Sit just under the button, centered on it, tucked behind it. */
    function placePeek() {
      const rect = button.getBoundingClientRect();
      const width = root.offsetWidth || 180;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.min(left, window.innerWidth - width - 8);
      root.style.left = Math.round(left) + "px";
      root.style.top = Math.round(rect.bottom - 6) + "px";
    }

    function blocked() {
      return (
        document.hidden ||
        !widget.hidden ||
        document.body.classList.contains("menu-open") ||
        getComputedStyle(button).visibility === "hidden" ||
        button.getClientRects().length === 0
      );
    }

    function popButton() {
      button.classList.remove("nc-peek-pop");
      void button.offsetWidth;
      button.classList.add("nc-peek-pop");
      setTimeout(function () {
        button.classList.remove("nc-peek-pop");
      }, 500);
    }

    function schedule(fn, delay) {
      clearTimeout(peekState.timer);
      peekState.timer = setTimeout(fn, delay);
    }

    function show() {
      if (peekState.stopped) {
        return;
      }

      if (blocked()) {
        schedule(show, PEEK.gap);
        return;
      }

      textEl.textContent =
        PEEK_TEXT.messages[peekState.round % PEEK_TEXT.messages.length];
      peekState.round += 1;

      placePeek();
      popButton();
      peekState.out = true;
      root.classList.add("is-out");

      clearTimeout(peekState.stepTimer);
      peekState.stepTimer = setTimeout(function () {
        root.classList.add("is-typing");

        peekState.stepTimer = setTimeout(function () {
          root.classList.remove("is-typing");
          root.classList.add("is-talking", "is-waving");
        }, PEEK.typing);
      }, 450);

      schedule(hide, PEEK.visible);
    }

    function hide() {
      if (peekState.hovering) {
        schedule(hide, PEEK.hoverHold);
        return;
      }

      clearTimeout(peekState.stepTimer);
      root.classList.remove("is-typing", "is-talking");

      peekState.stepTimer = setTimeout(function () {
        root.classList.remove("is-out", "is-waving");
        peekState.out = false;
        setTimeout(popButton, 300);
      }, 220);

      if (!peekState.stopped) {
        schedule(show, PEEK.gap);
      }
    }

    /* Click on the mascot or its bubble opens the chat. */
    root.addEventListener("click", function (event) {
      if (event.target.closest(".nc-peek-close")) {
        event.stopPropagation();
        root.classList.remove("is-typing", "is-talking");
        root.classList.remove("is-out", "is-waving");
        stopPeekForSession();
        return;
      }

      if (peekState.out) {
        openWidget();
      }
    });

    root.addEventListener("mouseenter", function () {
      peekState.hovering = true;
    });

    root.addEventListener("mouseleave", function () {
      peekState.hovering = false;
    });

    window.addEventListener("resize", function () {
      if (peekState.out) {
        placePeek();
      }
    });

    /* Load the artwork only when it is about to be used. */
    function start() {
      layers.forEach(function (img) {
        img.src = PEEK.images + img.dataset.layer + ".webp";
      });

      Promise.all(
        layers.map(function (img) {
          return img.decode ? img.decode().catch(function () {}) : null;
        })
      ).then(function () {
        schedule(show, PEEK.firstDelay);
      });
    }

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }
  }

  initPeek();


  /* ---------------------------------------------------------
     INITIALIZE
     --------------------------------------------------------- */

  /*
   * Make sure the button is available after
   * the page DOM has been initialized.
   */

})();
