/* =========================================================
   NORTH CRESCENT FACILITY SOLUTIONS
   BOOKING ENGINE — SINGLE-SCREEN VERSION
   File: /booking/booking.js

   Everything (service, date, time, details) lives on one
   screen. Progress is derived from what the visitor has
   completed, in any order. "Review & Confirm" opens the
   summary view; "Back to details" returns to the screen.
   ========================================================= */

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", initializeBooking);

  function initializeBooking() {
    const form = document.getElementById("booking-form");

    if (!form) {
      console.warn("[North Crescent Booking] Form not found.");
      return;
    }

    const $ = id => document.getElementById(id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const state = {
      currentMonth: today.getMonth(),
      currentYear: today.getFullYear(),
      selectedDate: "",
      selectedTime: "",
      selectedTimeLabel: "",
      emailAddress: "",
      view: "select",
      isSubmitting: false
    };

    const el = {
      form,

      emailCard: $("booking-email-card"),
      emailInput: $("booking-start-email"),
      emailButton: $("booking-start-button"),
      emailFeedback: $("booking-email-feedback"),

      stage: $("booking-stage"),
      progress: $("booking-progress"),
      selectView: $("booking-select-view"),

      serviceSection: $("booking-services"),
      scheduleSection: $("booking-schedule"),
      timeSection: $("booking-time-card"),
      customerSection: $("booking-customer"),
      reviewSection: $("booking-review"),

      previousMonth: $("booking-prev-month"),
      nextMonth: $("booking-next-month"),
      calendarMonth: $("booking-calendar-month"),
      calendarDays: $("booking-calendar-days"),
      calendarNote: $("booking-calendar-note"),

      selectedDateInput: $("booking-selected-date"),
      selectedTimeInput: $("booking-selected-time"),

      timeDate: $("booking-time-description"),
      timeDateText: $("booking-time-date-text"),
      timeEmpty: $("booking-time-empty"),
      cleaningSlots: $("booking-cleaning-slots"),
      snowSlots: $("booking-snow-slots"),
      timeFeedback: $("booking-time-feedback"),

      summary: $("booking-summary"),

      nameInput: $("booking-name"),
      phoneInput: $("booking-phone"),
      addressInput: $("booking-address"),
      notesInput: $("booking-notes"),
      detailsFeedback: $("booking-details-feedback"),

      reviewButton: $("booking-review-button"),
      reviewBackButton: $("booking-review-back"),
      submitButton: $("booking-submit-button")
    };

    const requiredElements = [
      el.serviceSection,
      el.scheduleSection,
      el.timeSection,
      el.customerSection,
      el.reviewSection,
      el.calendarDays,
      el.calendarMonth
    ];

    if (requiredElements.some(element => !element)) {
      console.error("[North Crescent Booking] Required HTML elements are missing.");
      return;
    }

    const prefersReducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isStacked = () => window.matchMedia("(max-width: 768px)").matches;

    function scrollToElement(target) {
      if (!target) return;

      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });
    }

    /* On phones the columns are stacked, so guide the visitor
       to the next block after each choice. */
    function nudgeTo(target) {
      if (isStacked()) {
        scrollToElement(target);
      }
    }

    /* ---------------------------------------------------------
       HELPERS
    --------------------------------------------------------- */

    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function getSelectedService() {
      return form.querySelector('input[name="serviceType"]:checked')?.value || "";
    }

    function isSnowRemoval() {
      return /snow removal/i.test(getSelectedService());
    }

    function parseDateValue(value) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    function formatLongDate(value) {
      if (!value) return "";

      return parseDateValue(value).toLocaleDateString("en-CA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }

    function formatTimeLabel() {
      return state.selectedTimeLabel || state.selectedTime;
    }

    function digitsIn(value) {
      return (value.match(/\d/g) || []).length;
    }

    function flash(element) {
      if (!element) return;

      element.classList.remove("is-attention");
      void element.offsetWidth;
      element.classList.add("is-attention");

      window.setTimeout(() => element.classList.remove("is-attention"), 1600);
    }

    /* ---------------------------------------------------------
       EMAIL
    --------------------------------------------------------- */

    function setEmailState(status, message) {
      if (!el.emailCard) return;

      el.emailCard.classList.toggle("is-valid", status === "valid");
      el.emailCard.classList.toggle("is-invalid", status === "invalid");

      if (el.emailFeedback) {
        el.emailFeedback.textContent = message || "";
      }
    }

    function validateEmail({ announce = true } = {}) {
      if (!el.emailInput) return false;

      const email = el.emailInput.value.trim();

      if (!EMAIL_PATTERN.test(email)) {
        state.emailAddress = "";

        if (announce) {
          setEmailState("invalid", "Please enter a valid email address.");
        }

        return false;
      }

      state.emailAddress = email;
      setEmailState("valid", "Thanks. We will send your confirmation here.");
      return true;
    }

    function startBooking() {
      if (!validateEmail()) {
        el.emailInput.focus();
        return;
      }

      nudgeTo(el.serviceSection);
    }

    if (el.emailInput) {
      el.emailInput.addEventListener("input", () => {
        const email = el.emailInput.value.trim();

        if (EMAIL_PATTERN.test(email)) {
          state.emailAddress = email;
          setEmailState("valid", "");
        } else {
          state.emailAddress = "";
          setEmailState(null, "");
        }

        syncProgress();
      });

      el.emailInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          startBooking();
        }
      });
    }

    if (el.emailButton) {
      el.emailButton.addEventListener("click", startBooking);
    }

    /* ---------------------------------------------------------
       CALENDAR
    --------------------------------------------------------- */

    function renderCalendar() {
      const year = state.currentYear;
      const month = state.currentMonth;

      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const daysInPreviousMonth = new Date(year, month, 0).getDate();

      el.calendarMonth.textContent = new Date(year, month, 1)
        .toLocaleDateString("en-CA", { month: "long", year: "numeric" });

      el.calendarDays.replaceChildren();

      const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      if (el.previousMonth) {
        el.previousMonth.disabled =
          new Date(year, month, 1).getTime() <= firstOfCurrentMonth.getTime();
      }

      /* Always render 6 weeks so the card never changes height */

      for (let cell = 0; cell < 42; cell++) {
        const dayNumber = cell - firstWeekday + 1;

        if (dayNumber < 1 || dayNumber > daysInMonth) {
          const outside = document.createElement("span");

          outside.className = "booking-calendar-outside";
          outside.setAttribute("aria-hidden", "true");
          outside.textContent = String(
            dayNumber < 1 ? daysInPreviousMonth + dayNumber : dayNumber - daysInMonth
          );

          el.calendarDays.appendChild(outside);
          continue;
        }

        const date = new Date(year, month, dayNumber);
        date.setHours(0, 0, 0, 0);

        const dateValue = [
          year,
          String(month + 1).padStart(2, "0"),
          String(dayNumber).padStart(2, "0")
        ].join("-");

        const button = document.createElement("button");

        button.type = "button";
        button.className = "booking-calendar-day";
        button.textContent = String(dayNumber);
        button.dataset.date = dateValue;
        button.setAttribute("aria-label", formatLongDate(dateValue));

        if (date < today) {
          button.disabled = true;
        }

        if (date.getTime() === today.getTime()) {
          button.classList.add("is-today");
        }

        const isSelected = state.selectedDate === dateValue;

        button.classList.toggle("is-selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));

        button.addEventListener("click", () => selectDate(dateValue));

        el.calendarDays.appendChild(button);
      }
    }

    function selectDate(dateValue) {
      state.selectedDate = dateValue;

      if (el.selectedDateInput) {
        el.selectedDateInput.value = dateValue;
      }

      renderCalendar();

      el.calendarDays
        .querySelector(`[data-date="${dateValue}"]`)
        ?.focus({ preventScroll: true });

      if (el.calendarNote) {
        el.calendarNote.textContent = `${formatLongDate(dateValue)} selected.`;
      }

      refreshSelection();
      nudgeTo(el.timeSection);
    }

    function changeMonth(direction) {
      const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const target = new Date(state.currentYear, state.currentMonth + direction, 1);

      if (target < firstOfCurrentMonth) return;

      state.currentMonth = target.getMonth();
      state.currentYear = target.getFullYear();

      renderCalendar();
    }

    if (el.previousMonth) {
      el.previousMonth.addEventListener("click", () => changeMonth(-1));
    }

    if (el.nextMonth) {
      el.nextMonth.addEventListener("click", () => changeMonth(1));
    }

    /* ---------------------------------------------------------
       SERVICE
    --------------------------------------------------------- */

    form.querySelectorAll('input[name="serviceType"]').forEach(input => {
      input.addEventListener("change", () => {
        /* Time windows depend on the service, so start fresh */
        clearSelectedTime();
        refreshSelection();
        nudgeTo(el.scheduleSection);
      });
    });

    /* ---------------------------------------------------------
       TIME
    --------------------------------------------------------- */

    function clearSelectedTime() {
      state.selectedTime = "";
      state.selectedTimeLabel = "";

      if (el.selectedTimeInput) {
        el.selectedTimeInput.value = "";
      }

      form.querySelectorAll('input[name="timeSlotOption"]').forEach(input => {
        input.checked = false;
      });
    }

    form.querySelectorAll('input[name="timeSlotOption"]').forEach(input => {
      input.addEventListener("change", () => {
        if (!input.checked) return;

        state.selectedTime = input.value;

        state.selectedTimeLabel = input
          .closest(".booking-time-option")
          .querySelector(".booking-time-option-label")
          .textContent
          .replace(/\s+/g, " ")
          .trim();

        if (el.selectedTimeInput) {
          el.selectedTimeInput.value = input.value;
        }

        if (el.timeFeedback) {
          el.timeFeedback.textContent = `${state.selectedTimeLabel} selected.`;
        }

        refreshSelection();
        nudgeTo(el.customerSection);
      });
    });

    function updateTimePanel() {
      const service = getSelectedService();
      const snow = isSnowRemoval();
      const hasDate = Boolean(state.selectedDate);

      if (el.timeDateText) {
        el.timeDateText.textContent = hasDate
          ? formatLongDate(state.selectedDate)
          : "Pick a date to continue";
      }

      if (el.timeDate) {
        el.timeDate.classList.toggle("is-empty", !hasDate);
      }

      const ready = Boolean(service) && hasDate;

      if (el.timeEmpty) {
        el.timeEmpty.hidden = ready;

        if (!service && !hasDate) {
          el.timeEmpty.textContent =
            "Choose a service and a date to see the available time windows.";
        } else if (!service) {
          el.timeEmpty.textContent =
            "Choose a service to see its available time windows.";
        } else {
          el.timeEmpty.textContent =
            "Choose a date to see the available time windows.";
        }
      }

      if (el.cleaningSlots) el.cleaningSlots.hidden = !ready || snow;
      if (el.snowSlots) el.snowSlots.hidden = !ready || !snow;
    }

    /* ---------------------------------------------------------
       LIVE SELECTION SUMMARY
    --------------------------------------------------------- */

    function updateSummary() {
      if (!el.summary) return;

      const rows = {
        service: getSelectedService(),
        date: state.selectedDate ? formatLongDate(state.selectedDate) : "",
        time: state.selectedTime ? formatTimeLabel() : ""
      };

      let anyVisible = false;

      Object.entries(rows).forEach(([key, value]) => {
        const row = el.summary.querySelector(`[data-summary="${key}"]`);
        const text = $(`booking-summary-${key}`);

        if (!row || !text) return;

        row.hidden = !value;
        text.textContent = value;

        if (value) anyVisible = true;
      });

      el.summary.hidden = !anyVisible;
    }

    /* ---------------------------------------------------------
       PROGRESS
    --------------------------------------------------------- */

    function detailsAreComplete() {
      return Boolean(
        state.emailAddress &&
        el.nameInput.value.trim() &&
        digitsIn(el.phoneInput.value) >= 10 &&
        el.addressInput.value.trim()
      );
    }

    function syncProgress() {
      const done = {
        1: Boolean(getSelectedService()),
        2: Boolean(state.selectedDate),
        3: Boolean(state.selectedTime),
        4: detailsAreComplete(),
        5: false
      };

      const firstOpen = [1, 2, 3, 4, 5].find(step => !done[step]);
      const activeStep = state.view === "review" ? 5 : firstOpen;

      el.progress?.querySelectorAll("[data-booking-step]").forEach(item => {
        const step = Number(item.dataset.bookingStep);

        item.classList.toggle("is-complete", done[step]);
        item.classList.toggle("is-active", step === activeStep);

        if (step === activeStep) {
          item.setAttribute("aria-current", "step");
        } else {
          item.removeAttribute("aria-current");
        }
      });

      if (el.reviewButton) {
        const ready = done[1] && done[2] && done[3] && done[4];
        const wasReady = el.reviewButton.classList.contains("is-ready");

        el.reviewButton.classList.toggle("is-ready", ready);

        /* restart the one-time glow if it became ready again */
        if (ready && !wasReady && !prefersReducedMotion) {
          el.reviewButton.style.animation = "none";
          void el.reviewButton.offsetWidth;
          el.reviewButton.style.animation = "";
        }
      }
    }

    function refreshSelection() {
      updateTimePanel();
      updateSummary();
      syncProgress();
    }

    /* ---------------------------------------------------------
       DETAILS — VALIDATION
    --------------------------------------------------------- */

    function setFieldInvalid(input, invalid) {
      input.closest(".booking-field")?.classList.toggle("is-invalid", invalid);
      input.setAttribute("aria-invalid", String(invalid));
    }

    [el.nameInput, el.phoneInput, el.addressInput].forEach(input => {
      input.addEventListener("input", () => {
        if (input.value.trim()) {
          setFieldInvalid(input, false);
        }

        if (el.detailsFeedback) {
          el.detailsFeedback.textContent = "";
        }

        syncProgress();
      });
    });

    /* Notes grow with their content (up to the CSS max-height) */
    if (el.notesInput) {
      el.notesInput.addEventListener("input", () => {
        el.notesInput.style.height = "auto";
        el.notesInput.style.height = `${el.notesInput.scrollHeight}px`;
      });
    }

    function findProblems() {
      const problems = [];

      if (!getSelectedService()) {
        problems.push({
          label: "a service",
          target: el.serviceSection,
          focus: form.querySelector('input[name="serviceType"]')
        });
      }

      if (!state.selectedDate) {
        problems.push({
          label: "a date",
          target: el.scheduleSection,
          focus: el.calendarDays.querySelector(".booking-calendar-day:not(:disabled)")
        });
      }

      if (!state.selectedTime) {
        problems.push({
          label: "a time",
          target: el.timeSection,
          focus: null
        });
      }

      if (!state.emailAddress) {
        problems.push({
          label: "a valid email",
          target: el.emailCard,
          focus: el.emailInput,
          isEmail: true
        });
      }

      if (!el.nameInput.value.trim()) {
        problems.push({
          label: "your full name",
          target: el.customerSection,
          focus: el.nameInput,
          field: el.nameInput
        });
      }

      if (digitsIn(el.phoneInput.value) < 10) {
        problems.push({
          label: "a phone number with area code",
          target: el.customerSection,
          focus: el.phoneInput,
          field: el.phoneInput
        });
      }

      if (!el.addressInput.value.trim()) {
        problems.push({
          label: "the service address",
          target: el.customerSection,
          focus: el.addressInput,
          field: el.addressInput
        });
      }

      return problems;
    }

    function joinList(items) {
      if (items.length <= 1) return items.join("");
      return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
    }

    function reportProblems(problems) {
      const panels = new Set();

      [el.nameInput, el.phoneInput, el.addressInput].forEach(input => {
        setFieldInvalid(input, false);
      });

      problems.forEach(problem => {
        if (problem.field) setFieldInvalid(problem.field, true);

        if (problem.isEmail) {
          setEmailState("invalid", "Please enter a valid email address.");
        }

        panels.add(problem.target);
      });

      panels.forEach(panel => {
        if (panel !== el.emailCard) flash(panel);
      });

      if (el.detailsFeedback) {
        el.detailsFeedback.textContent =
          `Please add ${joinList(problems.map(problem => problem.label))} to continue.`;
      }

      const first = problems[0];

      scrollToElement(first.target);

      if (first.focus) {
        window.setTimeout(() => first.focus.focus({ preventScroll: true }), 350);
      }
    }

    /* ---------------------------------------------------------
       VIEWS — SELECT ↔ REVIEW
    --------------------------------------------------------- */

    function showView(view) {
      state.view = view;

      el.selectView.hidden = view !== "select";
      el.reviewSection.hidden = view !== "review";

      syncProgress();
      scrollToElement(el.stage);
    }

    function populateBookingReview() {
      const notes = el.notesInput ? el.notesInput.value.trim() : "";

      const fields = {
        "booking-review-service": getSelectedService(),
        "booking-review-date": formatLongDate(state.selectedDate),
        "booking-review-time": formatTimeLabel(),
        "booking-review-name": el.nameInput.value.trim(),
        "booking-review-email": state.emailAddress,
        "booking-review-phone": el.phoneInput.value.trim(),
        "booking-review-address": el.addressInput.value.trim()
      };

      Object.entries(fields).forEach(([id, value]) => {
        const target = $(id);

        if (target) target.textContent = value || "Not provided";
      });

      const notesGroup = $("booking-review-notes-group");
      const notesReview = $("booking-review-notes");

      if (notesGroup && notesReview) {
        notesGroup.hidden = !notes;
        notesReview.textContent = notes;
      }

      const feedback = $("booking-review-feedback");

      if (feedback) feedback.textContent = "";
    }

    if (el.reviewButton) {
      el.reviewButton.addEventListener("click", () => {
        const problems = findProblems();

        if (problems.length > 0) {
          reportProblems(problems);
          return;
        }

        if (el.detailsFeedback) el.detailsFeedback.textContent = "";

        populateBookingReview();
        showView("review");
      });
    }

    if (el.reviewBackButton) {
      el.reviewBackButton.addEventListener("click", () => showView("select"));
    }

    /* ---------------------------------------------------------
       SUBMISSION — TEMPORARY PROTECTION
       Prevents accidental submissions until the backend
       integration with Make is configured.
    --------------------------------------------------------- */

    form.addEventListener("submit", event => {
      event.preventDefault();

      if (state.isSubmitting) return;

      const feedback = $("booking-review-feedback");

      if (feedback) {
        feedback.textContent =
          "Your booking form is being prepared. Please contact our team to complete your request.";
      }

      console.info(
        "[North Crescent Booking] Submission blocked: backend integration pending."
      );
    });

    /* ---------------------------------------------------------
       INITIALIZE
    --------------------------------------------------------- */

    renderCalendar();
    refreshSelection();

    console.info("[North Crescent Booking] Initialization complete.");
  }
})();
