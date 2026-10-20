/* =========================================================
   NORTH CRESCENT FACILITY SOLUTIONS
   BOOKING ENGINE
   File: /booking.js
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

    const state = {
      currentStep: 1,
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear(),
      selectedDate: "",
      selectedTime: "",
      emailAddress: "",
      isSubmitting: false
    };

    const elements = {
      form,
      emailInput: document.getElementById("booking-start-email"),
      emailButton: document.getElementById("booking-start-button"),
      emailFeedback: document.getElementById("booking-email-feedback"),

      progress: document.getElementById("booking-progress"),

      serviceSection: document.getElementById("booking-services"),
      scheduleSection: document.getElementById("booking-schedule"),
      customerSection: document.getElementById("booking-customer"),
      reviewSection: document.getElementById("booking-review"),

      previousMonth: document.getElementById("booking-prev-month"),
      nextMonth: document.getElementById("booking-next-month"),
      calendarMonth: document.getElementById("booking-calendar-month"),
      calendarDays: document.getElementById("booking-calendar-days"),

      selectedDateInput: document.getElementById("booking-selected-date"),
      selectedTimeInput: document.getElementById("booking-selected-time"),

      timeSlots: document.getElementById("booking-time-slots"),
      timeFeedback: document.getElementById("booking-time-feedback"),

      reviewButton: document.getElementById("booking-review-button"),
      reviewBackButton: document.getElementById("booking-review-back"),
      submitButton: document.getElementById("booking-submit-button")
    };

    /*
     * STEP 1 — INITIAL VALIDATION
     */

    const requiredElements = [
      elements.serviceSection,
      elements.scheduleSection,
      elements.customerSection,
      elements.reviewSection,
      elements.calendarDays,
      elements.calendarMonth
    ];

    if (requiredElements.some(element => !element)) {
      console.error(
        "[North Crescent Booking] Required HTML elements are missing."
      );
      return;
    }

/*
 * STEP 2 — BOOKING NAVIGATION
 */

function showStep(step) {
  if (![1, 2, 3, 4, 5].includes(step)) {
    return;
  }
// STEP VISIBILITY — SERVICES AND CALENDAR

elements.serviceSection.hidden = step !== 1;

// Keep the schedule section available during service selection.
// The calendar itself is controlled separately below.
elements.scheduleSection.hidden = step !== 1 && step !== 2 && step !== 3;

elements.customerSection.hidden = step !== 4;
elements.reviewSection.hidden = step !== 5;

  const calendarCard = elements.scheduleSection.querySelector(
    ".booking-calendar-card"
  );

  const timeContainer = document.getElementById(
    "booking-time-slots"
  );

if (calendarCard) {
    calendarCard.hidden = step !== 1 && step !== 2;
}

if (timeContainer) {
  timeContainer.hidden = step !== 3;
}

/* Control de visibilidad de los botones */

const dateNextButton = document.getElementById(
  "booking-date-next"
);

const timeNextButton = document.getElementById(
  "booking-time-next"
);

if (dateNextButton) {
  dateNextButton.hidden = step !== 2;
}

if (timeNextButton) {
  timeNextButton.hidden = step !== 3;
}

  if (elements.progress) {
    elements.progress
      .querySelectorAll("[data-booking-step]")
      .forEach(item => {
        const itemStep = Number(item.dataset.bookingStep);

        item.classList.toggle("is-active", itemStep === step);
        item.classList.toggle("is-complete", itemStep < step);

        if (itemStep === step) {
          item.setAttribute("aria-current", "step");
        } else {
          item.removeAttribute("aria-current");
        }
      });
  }

  const activeSection = {
    1: elements.serviceSection,
    2: elements.scheduleSection,
    3: elements.scheduleSection,
    4: elements.customerSection,
    5: elements.reviewSection
  }[step];

  activeSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/*
 * STEP 2A — SERVICE SELECTION
 */

function getSelectedService() {
  return elements.form.querySelector(
    'input[name="serviceType"]:checked'
  )?.value || "";
}

function validateSelectedService() {
  const selectedService = getSelectedService();

  if (!selectedService) {
    alert("Please select a service before continuing.");
    return false;
  }

  return true;
}

/*
 * STEP 2B — SERVICE NAVIGATION BUTTONS
 */

function createNavigationButton(text, id, className) {
  let button = document.getElementById(id);

  if (button) {
    return button;
  }

  button = document.createElement("button");
  button.type = "button";
  button.id = id;
  button.className = className;
  button.textContent = text;

  return button;
}

const serviceNextButton = createNavigationButton(
  "Continue to Date",
  "booking-service-next",
  "booking-navigation-button"
);

elements.serviceSection.appendChild(serviceNextButton);

serviceNextButton.addEventListener("click", () => {
  if (!validateSelectedService()) {
    return;
  }

  showStep(2);
});

const dateNextButton = createNavigationButton(
  "Continue to Time",
  "booking-date-next",
  "booking-navigation-button"
);

elements.scheduleSection.appendChild(dateNextButton);

dateNextButton.addEventListener("click", () => {
  if (!state.selectedDate) {
    alert("Please select your preferred date.");
    return;
  }

  updateTimeOptions();
  showStep(3);
});

const timeNextButton = createNavigationButton(
  "Continue to Your Details",
  "booking-time-next",
  "booking-navigation-button"
);

elements.scheduleSection.appendChild(timeNextButton);

timeNextButton.addEventListener("click", () => {
  if (!state.selectedTime) {
    alert("Please select your preferred time.");
    return;
  }

  showStep(4);
});

const customerBackButton = createNavigationButton(
  "Back to Time",
  "booking-customer-back",
  "booking-navigation-button"
);

elements.customerSection.appendChild(customerBackButton);

customerBackButton.addEventListener("click", () => {
  showStep(3);
});

const reviewBackButton = elements.reviewBackButton;

if (reviewBackButton) {
  reviewBackButton.addEventListener("click", () => {
    showStep(4);
  });
}
    /*
     * STEP 3 — EMAIL GATE
     */

    function validateEmail() {
      if (!elements.emailInput) {
        return false;
      }

      const email = elements.emailInput.value.trim();

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {
        if (elements.emailFeedback) {
          elements.emailFeedback.textContent =
            "Please enter a valid email address.";
        }

        elements.emailInput.focus();
        return false;
      }

      state.emailAddress = email;

      if (elements.emailFeedback) {
        elements.emailFeedback.textContent = "";
      }

      return true;
    }

    function startBooking() {
      if (!validateEmail()) {
        return;
      }

      showStep(1);

      elements.serviceSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    /*
     * STEP 4 — CALENDAR
     */

    function renderCalendar() {
      const year = state.currentYear;
      const month = state.currentMonth;

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      elements.calendarMonth.textContent =
        new Date(year, month, 1).toLocaleDateString("en-CA", {
          month: "long",
          year: "numeric"
        });

      elements.calendarDays.replaceChildren();
      /*
 * Update calendar navigation controls.
 */

if (elements.previousMonth) {
  const today = new Date();

  today.setDate(1);
  today.setHours(0, 0, 0, 0);

  const displayedMonth = new Date(
    state.currentYear,
    state.currentMonth,
    1
  );

  elements.previousMonth.disabled =
    displayedMonth.getTime() <= today.getTime();
}

      /*
       * Empty cells before the first day of the month.
       * This keeps the calendar aligned with weekdays.
       */

      for (let index = 0; index < firstDay; index++) {
        const emptyCell = document.createElement("span");

        emptyCell.className = "booking-calendar-empty";
        emptyCell.setAttribute("aria-hidden", "true");

        elements.calendarDays.appendChild(emptyCell);
      }

      /*
       * Render every day in the selected month.
       */

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);

        const button = document.createElement("button");

        button.type = "button";
        button.className = "booking-calendar-day";
        button.textContent = String(day);

        const dateValue = [
          year,
          String(month + 1).padStart(2, "0"),
          String(day).padStart(2, "0")
        ].join("-");

        button.dataset.date = dateValue;

        const isPastDate = date < today;

        button.disabled = isPastDate;

        if (isPastDate) {
          button.classList.add("is-disabled");
        }

        if (date.getTime() === today.getTime()) {
          button.classList.add("is-today");
        }

        if (state.selectedDate === dateValue) {
          button.classList.add("is-selected");
          button.setAttribute("aria-pressed", "true");
        } else {
          button.setAttribute("aria-pressed", "false");
        }

        button.addEventListener("click", () => {
          selectDate(dateValue);
        });

        elements.calendarDays.appendChild(button);
      }
    }

    function selectDate(dateValue) {
      state.selectedDate = dateValue;

      if (elements.selectedDateInput) {
        elements.selectedDateInput.value = dateValue;
      }

      renderCalendar();

      if (elements.timeFeedback) {
        elements.timeFeedback.textContent =
          "Date selected. Please choose your preferred time.";
      }
    }

    /*
 * STEP 6 — CONTROLLED CALENDAR NAVIGATION
 */

function changeMonth(direction) {
  const today = new Date();

  today.setDate(1);
  today.setHours(0, 0, 0, 0);

  const targetMonth = new Date(
    state.currentYear,
    state.currentMonth + direction,
    1
  );

  if (targetMonth < today) {
    return;
  }

  state.currentMonth = targetMonth.getMonth();
  state.currentYear = targetMonth.getFullYear();

  renderCalendar();

  if (elements.previousMonth) {
    elements.previousMonth.disabled =
      targetMonth.getTime() <= today.getTime();
  }
}

    /*
 * STEP 4B — CUSTOMER VALIDATION
 */

function validateCustomerDetails() {
  const nameInput = document.getElementById("booking-name");
  const phoneInput = document.getElementById("booking-phone");
  const addressInput = document.getElementById("booking-address");

  const requiredFields = [
    {
      element: nameInput,
      message: "Please enter your full name."
    },
    {
      element: phoneInput,
      message: "Please enter your phone number."
    },
    {
      element: addressInput,
      message: "Please enter the service address."
    }
  ];

  for (const field of requiredFields) {
    if (!field.element || !field.element.value.trim()) {
      alert(field.message);

      if (field.element) {
        field.element.focus();
      }

      return false;
    }
  }

  if (!state.emailAddress) {
    alert("Please enter your email address before continuing.");
    return false;
  }

  return true;
}

    /*
 * STEP 8 — COMPLETE BOOKING VALIDATION
 */

function validateBookingSelection() {
  if (!getSelectedService()) {
    alert("Please select a service.");
    showStep(1);
    return false;
  }

  if (!state.selectedDate) {
    alert("Please select your preferred date.");
    showStep(2);
    return false;
  }

  if (!state.selectedTime) {
    alert("Please select your preferred time.");
    showStep(3);
    return false;
  }

  return true;
}
/*
 * STEP 4C — POPULATE BOOKING REVIEW
 */

function populateBookingReview() {
  const name = document.getElementById("booking-name").value.trim();
  const phone = document.getElementById("booking-phone").value.trim();
  const address = document.getElementById("booking-address").value.trim();

  const notesInput = document.getElementById("booking-notes");
  const notes = notesInput ? notesInput.value.trim() : "";

  const selectedService = getSelectedService();

  const reviewFields = {
    "booking-review-service": selectedService,
    "booking-review-date": state.selectedDate,
    "booking-review-time": state.selectedTime,
    "booking-review-name": name,
    "booking-review-email": state.emailAddress,
    "booking-review-phone": phone,
    "booking-review-address": address
  };

  Object.entries(reviewFields).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value || "Not provided";
    }
  });

  const notesGroup = document.getElementById(
    "booking-review-notes-group"
  );

  const notesReview = document.getElementById(
    "booking-review-notes"
  );

  if (notesGroup && notesReview) {
    notesGroup.hidden = !notes;
    notesReview.textContent = notes;
  }
}

/*
 * STEP 4D — REVIEW BUTTON
 */

if (elements.reviewButton) {
  elements.reviewButton.addEventListener("click", () => {
    if (!validateBookingSelection()) {
      return;
    }

    if (!validateCustomerDetails()) {
      return;
    }

    populateBookingReview();
    showStep(5);
  });
}

    /*
     * STEP 5 — TIME SELECTION
     */

    function initializeTimeSelection() {
      const timeInputs = elements.form.querySelectorAll(
        'input[name="timeSlotOption"]'
      );

      timeInputs.forEach(input => {
        input.addEventListener("change", () => {
          if (!input.checked) {
            return;
          }

          state.selectedTime = input.value;

          if (elements.selectedTimeInput) {
            elements.selectedTimeInput.value = input.value;
          }

          if (elements.timeFeedback) {
            elements.timeFeedback.textContent =
              "Time selected successfully.";
          }
        });
      });
    }
    /*
/*
 * STEP 5A — SERVICE CHANGE LISTENER
 */

const serviceInputs = elements.form.querySelectorAll(
  'input[name="serviceType"]'
);

const cleaningSlots = document.getElementById(
  "booking-cleaning-slots"
);

const snowSlots = document.getElementById(
  "booking-snow-slots"
);

function updateServiceTimeVisibility() {
  const selectedService = getSelectedService();
  const isSnowRemoval = /snow removal/i.test(selectedService);

  if (cleaningSlots) {
    cleaningSlots.hidden = !selectedService || isSnowRemoval;
  }

  if (snowSlots) {
    snowSlots.hidden = !isSnowRemoval;
  }

  if (!selectedService || isSnowRemoval) {
    if (cleaningSlots) {
      cleaningSlots.querySelectorAll('input[type="radio"]')
        .forEach(input => input.checked = false);
    }
  }

  if (!isSnowRemoval && snowSlots) {
    snowSlots.querySelectorAll('input[type="radio"]')
      .forEach(input => input.checked = false);
  }
}

serviceInputs.forEach(input => {
  input.addEventListener("change", () => {
    state.selectedTime = "";

    if (elements.selectedTimeInput) {
      elements.selectedTimeInput.value = "";
    }

    elements.form
      .querySelectorAll('input[name="timeSlotOption"]')
      .forEach(timeInput => {
        timeInput.checked = false;
      });

    updateServiceTimeVisibility();

    if (elements.timeFeedback) {
      elements.timeFeedback.textContent = "";
    }
  });
});

updateServiceTimeVisibility();
    /*
     * STEP 6 — EVENT LISTENERS
     */

    if (elements.emailButton) {
      elements.emailButton.addEventListener("click", startBooking);
    }

    if (elements.emailInput) {
      elements.emailInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          startBooking();
        }
      });
    }

    if (elements.previousMonth) {
      elements.previousMonth.addEventListener("click", () => {
        changeMonth(-1);
      });
    }

    if (elements.nextMonth) {
      elements.nextMonth.addEventListener("click", () => {
        changeMonth(1);
      });
    }

    initializeTimeSelection();
    /*
 * STEP 9 — TEMPORARY FORM SUBMISSION PROTECTION
 *
 * Prevent accidental submissions until the backend
 * integration with Make is configured.
 */

elements.form.addEventListener("submit", event => {
  event.preventDefault();

  if (state.isSubmitting) {
    return;
  }

  const feedback = document.getElementById(
    "booking-review-feedback"
  );

  if (feedback) {
    feedback.textContent =
      "Your booking form is being prepared. Please contact our team to complete your request.";
  }

  console.info(
    "[North Crescent Booking] Submission blocked: backend integration pending."
  );
});

    /*
     * STEP 7 — INITIALIZE
     */

    renderCalendar();
    showStep(1);

    console.info(
      "[North Crescent Booking] Initialization complete."
    );
  }
})();
