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
    "Open North Crescent Concierge"
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
      Concierge
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
              North Crescent Concierge
            </h2>

            <span class="nc-concierge-widget-status">

              <span
                aria-hidden="true"
              ></span>

              Here to help

            </span>

          </div>

        </div>


        <button
          type="button"
          class="nc-concierge-widget-close"
          aria-label="Close Concierge"
          data-concierge-close
        >
          ×
        </button>

      </header>


      <div class="nc-concierge-widget-frame-wrap">

        <iframe
          id="ncConciergeWidgetFrame"
          title="North Crescent Cleaning Concierge"
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
      "/cleaning-concierge.html?" +
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
     INITIALIZE
     --------------------------------------------------------- */

  /*
   * Make sure the button is available after
   * the page DOM has been initialized.
   */

})();
