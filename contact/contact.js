/* =========================================================
   NORTH CRESCENT FACILITY SOLUTIONS
   CONTACT FORM
   File: /contact/contact.js

   - Live validation with clear messages (nothing fails silently)
   - Progress meter, floating labels, smooth "preferred days"
   - Google address suggestions (fails gracefully)
   - Cloudflare Turnstile + honeypot + minimum fill time
   - Sends the same field names the Make scenario already uses
   - Accessible success modal with the "send photos by text" step
   ========================================================= */

(() => {
  "use strict";

  const ENDPOINT = "/.netlify/functions/contact-form";
  const PHONE_DISPLAY = "+1 (428) 888-0542";
  const SMS_NUMBER = "+14288880542";
  const MIN_FILL_SECONDS = 3;
  const MESSAGE_MIN = 10;
  const REQUEST_TIMEOUT_MS = 20000;

  /* Pages under /fr/ use <html lang="fr">: messages follow the page language.
     What is sent to the office (field values, frequency label) stays in English. */
  const FR = (document.documentElement.lang || "").toLowerCase().indexOf("fr") === 0;
  const tr = (en, fr) => (FR ? fr : en);

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const LINK_PATTERN = /(https?:\/\/|www\.)\S+/gi;

  const FREQUENCY_LABELS = {
    "30": "Every day",
    "8": "2 times per week",
    "4": "4 times per month",
    "2": "2 times per month",
    "custom": "Custom"
  };

  const FREQUENCY_LABELS_FR = {
    "30": "Tous les jours",
    "8": "2 fois par semaine",
    "4": "4 fois par mois",
    "2": "2 fois par mois",
    "custom": "Sur mesure"
  };

  /* Frequencies that need the "preferred days" picker */
  const FREQUENCIES_WITH_DAYS = ["8", "4", "2", "custom"];

  const form = document.getElementById("contactForm");
  if (!form) return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const el = {
    card: $(".nc-form-card"),
    submit: $("#submitBtn"),
    submitLabel: $(".nc-submit-label", form),
    status: $("#formStatus"),
    progressFill: $("#progressFill"),
    progressLabel: $("#progressLabel"),
    frequency: $("#visitsPerMonth"),
    daysReveal: $("#daysReveal"),
    daysBox: $("#daysBox"),
    daysError: $("#daysError"),
    message: $("#operationalSummary"),
    counter: $("#messageCounter"),
    address: $("#serviceAddress"),
    city: $("#city"),
    province: $("#province"),
    postalCode: $("#postalCode"),
    honeypot: $("#website"),
    turnstileError: $("#turnstileError"),
    modal: $("#successModal"),
    smsLink: $("#smsLink")
  };

  const SUBMIT_TEXT = el.submitLabel ? el.submitLabel.textContent.trim() : tr("Get My Free Quote", "Obtenir ma soumission gratuite");
  const formLoadedAt = Date.now();

  let turnstileToken = "";
  let isSubmitting = false;
  let lastFocused = null;

  /* ---------------------------------------------------------
     VALIDATION RULES
     Each returns "" when valid, or the message to show.
  --------------------------------------------------------- */

  const digitsOf = (value) => (value.match(/\d/g) || []).length;

  const RULES = {
    clientName: (v) =>
      v.trim().length >= 2 ? "" : tr("Please enter your full name.", "Veuillez entrer votre nom complet."),

    emailAddress: (v) =>
      EMAIL_PATTERN.test(v.trim()) ? "" : tr("Please enter a valid email address.", "Veuillez entrer une adresse courriel valide."),

    phoneNumber: (v) =>
      digitsOf(v) >= 10 ? "" : tr("Please enter a phone number with area code.", "Veuillez entrer un numéro de téléphone avec l’indicatif régional."),

    serviceAddress: (v) =>
      v.trim().length >= 6 ? "" : tr("Please enter the service address.", "Veuillez entrer l’adresse du service."),

    serviceType: (v) =>
      v ? "" : tr("Please choose a service.", "Veuillez choisir un service."),

    /* Frequency and time slot are optional: fewer steps for the client, we confirm them when we call. */
    visitsPerMonth: () => "",

    timeSlot: () => "",

    squareFootage: (v) => {
      if (v === "") return "";
      const n = Number(v);
      return n > 0 && n < 1000000 ? "" : tr("Please enter a valid size, or leave it empty.", "Veuillez entrer une superficie valide, ou laissez le champ vide.");
    },

    operationalSummary: (v) => {
      const text = v.trim();
      if (text.length < MESSAGE_MIN) {
        return tr(
          "Please tell us a little about your space (at least " + MESSAGE_MIN + " characters).",
          "Parlez-nous un peu de votre espace (au moins " + MESSAGE_MIN + " caractères)."
        );
      }
      if ((text.match(LINK_PATTERN) || []).length > 1) {
        return tr("Please remove the web links from your message.", "Veuillez retirer les liens web de votre message.");
      }
      return "";
    }
  };

  /* Fields that count toward the progress meter */
  const REQUIRED = [
    "clientName", "emailAddress", "phoneNumber", "serviceAddress",
    "serviceType", "operationalSummary"
  ];

  const touched = new Set();

  const fieldOf = (name) => form.elements[name];
  const wrapperOf = (control) => control.closest(".nc-field");

  const valueOf = (name) => {
    const control = fieldOf(name);
    return control ? control.value : "";
  };

  /* ---------------------------------------------------------
     FIELD STATE (valid / invalid icons, messages)
  --------------------------------------------------------- */

  const STATE_ICONS =
    '<svg class="is-ok" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10" fill="#08A99D"/>' +
      '<path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>' +
    '<svg class="is-bad" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10" fill="#C0392B"/>' +
      '<path d="M12 7v6M12 16.6v.01" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>' +
    '</svg>';

  $$(".nc-field", form).forEach((field) => {
    const state = document.createElement("span");
    state.className = "nc-state";
    state.setAttribute("aria-hidden", "true");
    state.innerHTML = STATE_ICONS;
    field.appendChild(state);
  });

  function syncFilled(control) {
    const wrapper = wrapperOf(control);
    if (!wrapper) return;
    wrapper.classList.toggle("is-filled", control.value !== "");
  }

  function setFieldState(name, message, { silent = false } = {}) {
    const control = fieldOf(name);
    if (!control) return;

    const wrapper = wrapperOf(control);
    const errorEl = $("#" + name + "-error");
    const hasValue = control.value.trim() !== "";

    if (!wrapper) return;

    if (message && !silent) {
      wrapper.classList.add("is-invalid");
      wrapper.classList.remove("is-valid");
      control.setAttribute("aria-invalid", "true");
      if (errorEl) errorEl.textContent = message;
    } else {
      wrapper.classList.remove("is-invalid");
      control.removeAttribute("aria-invalid");
      if (errorEl) errorEl.textContent = "";
      wrapper.classList.toggle("is-valid", !message && hasValue);
    }
  }

  function validateField(name, { silent = false } = {}) {
    const rule = RULES[name];
    if (!rule) return "";
    const message = rule(valueOf(name));
    setFieldState(name, message, { silent });
    return message;
  }

  /* ---------------------------------------------------------
     DAYS PICKER
  --------------------------------------------------------- */

  const daysNeeded = () => FREQUENCIES_WITH_DAYS.includes(el.frequency.value);
  const selectedDays = () =>
    $$('input[name="recurringVisits[]"]:checked', form).map((box) => box.value);

  function toggleDays() {
    const open = daysNeeded();

    el.daysReveal.classList.toggle("is-open", open);
    el.daysReveal.toggleAttribute("inert", !open);
    el.daysReveal.setAttribute("aria-hidden", open ? "false" : "true");

    if (!open) {
      $$('input[name="recurringVisits[]"]', form).forEach((box) => { box.checked = false; });
      el.daysBox.classList.remove("is-invalid");
      el.daysError.textContent = "";
    }

    updateProgress();
  }

  function validateDays({ silent = false } = {}) {
    if (!daysNeeded()) return "";

    const message = ""; /* preferred days are optional too */

    if (silent) return message;

    el.daysBox.classList.toggle("is-invalid", Boolean(message));
    el.daysError.textContent = message;
    return message;
  }

  /* ---------------------------------------------------------
     PROGRESS METER
  --------------------------------------------------------- */

  function updateProgress() {
    const names = REQUIRED.slice(); /* optional fields (frequency, days, time, size) do not count */

    const done = names.filter((name) => {
      if (name === "__days") return validateDays({ silent: true }) === "";
      return valueOf(name).trim() !== "" && RULES[name](valueOf(name)) === "";
    }).length;

    const total = names.length;
    const percent = Math.round((done / total) * 100);

    el.progressFill.style.width = percent + "%";
    el.progressLabel.textContent =
      done === total ? tr("All set — ready to send", "Tout est prêt — vous pouvez envoyer") : done + tr(" of ", " sur ") + total + tr(" completed", " complétés");

    form.classList.toggle("is-complete", done === total);

    const bar = el.progressFill.parentElement;
    if (bar) {
      bar.setAttribute("aria-valuenow", String(percent));
    }
  }

  /* ---------------------------------------------------------
     INPUT BEHAVIOUR
  --------------------------------------------------------- */

  function autosize() {
    el.message.style.height = "auto";
    el.message.style.height = Math.min(Math.max(el.message.scrollHeight + 2, 150), 380) + "px";
  }

  function updateCounter() {
    const length = el.message.value.trim().length;
    const ok = length >= MESSAGE_MIN;
    el.counter.classList.toggle("is-ok", ok);
    el.counter.textContent = ok
      ? length + tr(" characters", " caractères")
      : length + " / " + MESSAGE_MIN + " minimum";
  }

  function formatPhone() {
    const input = fieldOf("phoneNumber");
    const raw = input.value.trim();

    if (!raw || raw.startsWith("+") && !raw.startsWith("+1")) return;

    let digits = raw.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length !== 10) return;

    input.value = "(" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6);
  }

  $$(".nc-input", form).forEach((control) => {
    const name = control.name;

    syncFilled(control);

    control.addEventListener("input", () => {
      syncFilled(control);

      if (name === "operationalSummary") {
        autosize();
        updateCounter();
      }

      /* Once a field was visited, correct it live */
      if (touched.has(name)) {
        validateField(name);
      } else if (RULES[name]) {
        setFieldState(name, RULES[name](control.value), { silent: true });
      }

      updateProgress();
    });

    control.addEventListener("change", () => {
      syncFilled(control);

      if (name === "visitsPerMonth") toggleDays();

      touched.add(name);
      validateField(name);
      updateProgress();
    });

    control.addEventListener("blur", () => {
      if (name === "phoneNumber") formatPhone();

      if (control.value.trim() !== "" || touched.has(name)) {
        touched.add(name);
        validateField(name);
      }

      updateProgress();
    });
  });

  $$('input[name="recurringVisits[]"]', form).forEach((box) => {
    box.addEventListener("change", () => {
      validateDays();
      updateProgress();
    });
  });

  /* ---------------------------------------------------------
     POINTER SPOTLIGHT (desktop only)
  --------------------------------------------------------- */

  if (
    el.card &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    let frame = 0;

    el.card.addEventListener("pointermove", (event) => {
      if (frame) return;

      frame = requestAnimationFrame(() => {
        const box = el.card.getBoundingClientRect();
        el.card.style.setProperty("--mx", event.clientX - box.left + "px");
        el.card.style.setProperty("--my", event.clientY - box.top + "px");
        frame = 0;
      });
    });
  }

  /* ---------------------------------------------------------
     GOOGLE ADDRESS SUGGESTIONS
     Works on both the classic and the new Maps loader.
     If anything is missing the field stays a normal input.
  --------------------------------------------------------- */

  function clearPlaceParts() {
    el.city.value = "";
    el.province.value = "";
    el.postalCode.value = "";
  }

  function readPlace(place) {
    const parts = (place && place.address_components) || [];
    const pick = (type, key) => {
      const match = parts.find((part) => part.types.indexOf(type) !== -1);
      return match ? match[key] : "";
    };

    el.city.value =
      pick("locality", "long_name") ||
      pick("postal_town", "long_name") ||
      pick("sublocality", "long_name");
    el.province.value = pick("administrative_area_level_1", "short_name");
    el.postalCode.value = pick("postal_code", "long_name");

    if (place && place.formatted_address) {
      el.address.value = place.formatted_address.replace(/, Canada$/, "");
    }

    syncFilled(el.address);
    touched.add("serviceAddress");
    validateField("serviceAddress");
    updateProgress();
  }

  async function initPlaces() {
    const maps = window.google && window.google.maps;
    if (!maps) return false;

    try {
      const lib = typeof maps.importLibrary === "function"
        ? await maps.importLibrary("places")
        : maps.places;

      const Autocomplete = (lib && lib.Autocomplete) || (maps.places && maps.places.Autocomplete);
      if (!Autocomplete) return true;

      const autocomplete = new Autocomplete(el.address, {
        types: ["address"],
        componentRestrictions: { country: "ca" },
        fields: ["address_components", "formatted_address"]
      });

      autocomplete.addListener("place_changed", () => readPlace(autocomplete.getPlace()));

      /* Typing after a pick means the saved city/postal may be stale */
      el.address.addEventListener("input", clearPlaceParts);

      /* Enter picks a suggestion, it must not send the form */
      el.address.addEventListener("keydown", (event) => {
        const list = document.querySelector(".pac-container");
        if (event.key === "Enter" && list && list.offsetParent !== null) {
          event.preventDefault();
        }
      });
    } catch (error) {
      /* Plain input keeps working */
    }

    return true;
  }

  /* If the key is rejected, Google decorates the input; undo that */
  window.gm_authFailure = () => {
    el.address.classList.remove("gm-err-autocomplete");
    el.address.removeAttribute("style");
    el.address.setAttribute("placeholder", " ");
  };

  (function waitForMaps(attempt) {
    initPlaces().then((ready) => {
      if (!ready && attempt < 30) {
        setTimeout(() => waitForMaps(attempt + 1), 400);
      }
    });
  })(0);

  /* ---------------------------------------------------------
     TURNSTILE
  --------------------------------------------------------- */

  window.ncTurnstileDone = (token) => {
    turnstileToken = token || "";
    el.turnstileError.classList.remove("is-visible");
    el.turnstileError.textContent = "";
  };

  window.ncTurnstileExpired = () => {
    turnstileToken = "";
  };

  function currentToken() {
    if (turnstileToken) return turnstileToken;
    const hidden = form.querySelector('[name="cf-turnstile-response"]');
    return hidden ? hidden.value : "";
  }

  function resetTurnstile() {
    turnstileToken = "";
    try {
      if (window.turnstile) window.turnstile.reset();
    } catch (error) { /* nothing to reset yet */ }
  }

  /* ---------------------------------------------------------
     STATUS + BUTTON
  --------------------------------------------------------- */

  function showStatus(message, type) {
    el.status.className = "nc-status";
    el.status.innerHTML = "";

    if (!message) return;

    el.status.classList.add(type === "info" ? "is-info" : "is-error");
    el.status.textContent = message;
  }

  function showCallMessage(prefix) {
    el.status.className = "nc-status is-error";
    el.status.innerHTML = "";
    el.status.append(prefix + tr(" Please try again, or call us at ", " Veuillez réessayer ou nous appeler au "));

    const link = document.createElement("a");
    link.href = "tel:" + SMS_NUMBER;
    link.textContent = PHONE_DISPLAY;
    el.status.append(link, ".");
  }

  function setLoading(loading) {
    isSubmitting = loading;
    el.submit.disabled = loading;
    el.submit.classList.toggle("is-loading", loading);
    el.submit.setAttribute("aria-busy", loading ? "true" : "false");
    el.submitLabel.textContent = loading ? tr("Sending...", "Envoi en cours…") : SUBMIT_TEXT;
  }

  /* ---------------------------------------------------------
     SUBMIT
  --------------------------------------------------------- */

  function shake(wrapper) {
    wrapper.classList.remove("is-shake");
    void wrapper.offsetWidth;
    wrapper.classList.add("is-shake");
    setTimeout(() => wrapper.classList.remove("is-shake"), 500);
  }

  function runFullValidation() {
    const problems = [];

    Object.keys(RULES).forEach((name) => {
      touched.add(name);
      const message = validateField(name);
      if (message) problems.push(name);
    });

    const daysMessage = validateDays();
    if (daysMessage) problems.push("__days");

    return problems;
  }

  function focusFirstProblem(problems) {
    const order = Array.from(form.elements).map((control) => control.name);
    const first = problems
      .slice()
      .sort((a, b) => {
        const ai = a === "__days" ? order.indexOf("recurringVisits[]") : order.indexOf(a);
        const bi = b === "__days" ? order.indexOf("recurringVisits[]") : order.indexOf(b);
        return ai - bi;
      })[0];

    if (first === "__days") {
      const box = $('input[name="recurringVisits[]"]', form);
      el.daysBox.scrollIntoView({ behavior: "smooth", block: "center" });
      shake(el.daysBox);
      if (box) box.focus({ preventScroll: true });
      return;
    }

    const control = fieldOf(first);
    if (!control) return;

    control.scrollIntoView({ behavior: "smooth", block: "center" });
    control.focus({ preventScroll: true });

    const wrapper = wrapperOf(control);
    if (wrapper) shake(wrapper);
  }

  function buildPayload() {
    const frequency = el.frequency.value;

    return {
      clientName: valueOf("clientName").trim(),
      emailAddress: valueOf("emailAddress").trim(),
      phoneNumber: valueOf("phoneNumber").trim(),
      serviceAddress: valueOf("serviceAddress").trim(),
      city: el.city.value,
      province: el.province.value,
      postalCode: el.postalCode.value,
      serviceType: valueOf("serviceType"),
      visitsPerMonth: frequency,
      frequencyLabel: FREQUENCY_LABELS[frequency] || frequency,
      recurringVisits: selectedDays().join(", "),
      timeSlot: valueOf("timeSlot"),
      squareFootage: valueOf("squareFootage"),
      operationalSummary: valueOf("operationalSummary").trim(),
      pageUrl: window.location.href,
      "cf-turnstile-response": currentToken(),
      website: el.honeypot ? el.honeypot.value : ""
    };
  }

  function buildSmsLink(payload) {
    const lines = [tr("Hi, my name is ", "Bonjour, je m’appelle ") + payload.clientName + "."];
    const frequencyText = FR
      ? FREQUENCY_LABELS_FR[payload.visitsPerMonth] || payload.frequencyLabel
      : payload.frequencyLabel;

    if (payload.serviceType) {
      lines.push(tr("I just submitted a request for ", "Je viens d’envoyer une demande pour : ") + payload.serviceType + ".");
    }
    if (frequencyText) {
      lines.push(tr("Preferred frequency: ", "Fréquence souhaitée : ") + frequencyText + ".");
    }
    if (payload.recurringVisits) {
      lines.push(tr("Preferred days: ", "Jours souhaités : ") + payload.recurringVisits + ".");
    }
    if (payload.timeSlot) {
      lines.push(tr("Preferred time: ", "Moment souhaité : ") + payload.timeSlot + ".");
    }
    if (payload.serviceAddress) {
      lines.push(tr("Address: ", "Adresse : ") + payload.serviceAddress + ".");
    }
    if (payload.operationalSummary) {
      const details = payload.operationalSummary.slice(0, 300);
      lines.push(tr("Project details: ", "Détails du projet : ") + details + (payload.operationalSummary.length > 300 ? "..." : ""));
    }

    lines.push("");
    lines.push(tr(
      "Next, I'll send photos and/or a short video of the space so you can review it and prepare my quote.",
      "Je vais maintenant envoyer des photos ou une courte vidéo de l’espace pour que vous puissiez préparer ma soumission."
    ));

    return "sms:" + SMS_NUMBER + "?&body=" + encodeURIComponent(lines.join("\n"));
  }

  function resetForm() {
    form.reset();
    touched.clear();

    $$(".nc-field", form).forEach((wrapper) => {
      wrapper.classList.remove("is-valid", "is-invalid", "is-filled");
    });
    $$(".nc-error", form).forEach((node) => { node.textContent = ""; });

    clearPlaceParts();
    toggleDays();
    autosize();
    updateCounter();
    updateProgress();
    resetTurnstile();
  }

  async function sendRequest(payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async function readError(response) {
    try {
      const data = await response.json();
      return data && data.error ? String(data.error) : "";
    } catch (error) {
      return "";
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) return;
    showStatus("");

    /* Bots fill the hidden field; pretend it worked and send nothing */
    if (el.honeypot && el.honeypot.value) {
      resetForm();
      return;
    }

    const problems = runFullValidation();

    if (problems.length) {
      showStatus(tr("Please check the highlighted fields.", "Veuillez vérifier les champs en surbrillance."), "error");
      focusFirstProblem(problems);
      return;
    }

    if ((Date.now() - formLoadedAt) / 1000 < MIN_FILL_SECONDS) {
      showStatus(tr("Please take a moment to review your details, then press the button again.", "Prenez un moment pour vérifier vos renseignements, puis appuyez de nouveau sur le bouton."), "info");
      return;
    }

    if (!currentToken()) {
      el.turnstileError.textContent = tr("Please complete the security check.", "Veuillez compléter la vérification de sécurité.");
      el.turnstileError.classList.add("is-visible");
      el.turnstileError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);

    const payload = buildPayload();

    try {
      const response = await sendRequest(payload);

      if (response.ok) {
        const smsHref = buildSmsLink(payload);

        if (typeof window.gtag === "function") {
          window.gtag("event", "generate_lead", {
            event_category: "contact_form",
            service_type: payload.serviceType
          });
        }

        resetForm();
        setLoading(false);
        el.submit.classList.add("is-done");
        el.submitLabel.textContent = tr("Request sent", "Demande envoyée");
        el.submit.disabled = true;

        openModal(smsHref);
        return;
      }

      const serverMessage = await readError(response);
      resetTurnstile();

      if (response.status === 403) {
        showStatus(tr("The security check could not be verified. Please complete it again and resend.", "La vérification de sécurité n’a pas pu être confirmée. Veuillez la refaire et envoyer de nouveau."), "error");
      } else if (response.status === 400 && serverMessage) {
        showStatus(serverMessage, "error");
      } else {
        showCallMessage(tr("We could not send your request.", "Nous n’avons pas pu envoyer votre demande."));
      }
    } catch (error) {
      resetTurnstile();
      showCallMessage(
        error && error.name === "AbortError"
          ? tr("The request took too long.", "La demande a pris trop de temps.")
          : tr("We could not send your request.", "Nous n’avons pas pu envoyer votre demande.")
      );
    }

    setLoading(false);
  });

  /* ---------------------------------------------------------
     SUCCESS MODAL (focus trap, Esc, backdrop click)
  --------------------------------------------------------- */

  function focusables() {
    return $$("a[href], button:not([disabled])", el.modal)
      .filter((node) => node.offsetParent !== null);
  }

  function openModal(smsHref) {
    lastFocused = document.activeElement;
    el.smsLink.href = smsHref;

    el.modal.removeAttribute("inert");
    el.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("nc-modal-open");

    requestAnimationFrame(() => {
      el.modal.classList.add("is-open");
      setTimeout(() => el.smsLink.focus({ preventScroll: true }), 120);
    });
  }

  function closeModal() {
    el.modal.classList.remove("is-open");
    el.modal.setAttribute("aria-hidden", "true");
    el.modal.setAttribute("inert", "");
    document.body.classList.remove("nc-modal-open");

    /* Ready for another request */
    el.submit.classList.remove("is-done");
    el.submit.disabled = false;
    el.submitLabel.textContent = SUBMIT_TEXT;

    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
  }

  el.modal.addEventListener("click", (event) => {
    if (event.target === el.modal || event.target.closest("[data-close-modal]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!el.modal.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key === "Tab") {
      const nodes = focusables();
      if (!nodes.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------------------------------------------------------
     INITIAL STATE
  --------------------------------------------------------- */

  toggleDays();
  autosize();
  updateCounter();
  updateProgress();
})();
