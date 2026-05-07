const buttons = document.querySelectorAll(".ncs-store-button");

const selectedPlan =
document.getElementById("selectedPlan");

const selectedFrequency =
document.getElementById("selectedFrequency");

const selectedPrice =
document.getElementById("selectedPrice");

const selectedFeatures =
document.getElementById("selectedFeatures");

const stepSelect =
document.getElementById("stepSelect");

const stepAdvisor =
document.getElementById("stepAdvisor");

const advisorButton =
document.getElementById("advisorButton");

const params =
new URLSearchParams(window.location.search);

const client =
params.get("client");

const welcome =
document.getElementById("clientWelcome");

if (client && welcome) {

  welcome.innerText =
  `Welcome ${client}`;

}

/* =========================================
   PLAN FEATURES
========================================= */

const features = {

  "Basic Plan": [
    "Initial environment stabilization",
    "Essential recurring maintenance",
    "Basic operational consistency",
    "Structured cleaning visits"
  ],

  "Standard Plan": [
    "Operational consistency",
    "Priority scheduling",
    "High traffic maintenance",
    "Structured supervision",
    "Recurring quality control"
  ],

  "Intensive Plan": [
    "Full operational support",
    "Advanced environment control",
    "High frequency maintenance",
    "Priority response system",
    "Detailed supervision structure"
  ]

};

/* =========================================
   CURRENT SELECTION
========================================= */

let currentPlan = "";
let currentPrice = "";
let currentFrequency = "";

/* =========================================
   AUTO SELECT PLAN
========================================= */

function selectPlan(button) {

  const card =
  button.closest(".ncs-store-card");

  // REMOVE ACTIVE
  document
    .querySelectorAll(".ncs-store-card")
    .forEach(item => {

      item.classList.remove(
        "ncs-store-card-active"
      );

    });

  // ADD ACTIVE
  card.classList.add(
    "ncs-store-card-active"
  );

  // STEP ACTIVE
  stepSelect.classList.add(
    "ncs-store-step-active"
  );

  // DATA
  const plan =
  button.dataset.plan;

  const price =
  button.dataset.price;

  const frequency =
  button.dataset.frequency;

  // SAVE CURRENT
  currentPlan = plan;
  currentPrice = price;
  currentFrequency = frequency;

  // UPDATE SUMMARY
  selectedPlan.innerText = plan;

  selectedFrequency.innerText =
  frequency;

  selectedPrice.innerText = price;

  // FEATURES
  selectedFeatures.innerHTML = "";

  features[plan].forEach(feature => {

    const li =
    document.createElement("li");

    li.innerText = feature;

    selectedFeatures.appendChild(li);

  });

}
/* =========================================
   PLAN SELECTION
========================================= */

buttons.forEach(button => {

  button.addEventListener("click", () => {

    const card =
    button.closest(".ncs-store-card");

    // REMOVE ACTIVE
    document
      .querySelectorAll(".ncs-store-card")
      .forEach(item => {

        item.classList.remove(
          "ncs-store-card-active"
        );

      });

    // ADD ACTIVE
    card.classList.add(
      "ncs-store-card-active"
    );

    // STEP ACTIVE
    stepSelect.classList.add(
      "ncs-store-step-active"
    );

    // DATA
    const plan =
    button.dataset.plan;

    const price =
    button.dataset.price;

    const frequency =
    button.dataset.frequency;

    // SAVE CURRENT
    currentPlan = plan;
    currentPrice = price;
    currentFrequency = frequency;

    // UPDATE SUMMARY
    selectedPlan.innerText = plan;

    selectedFrequency.innerText =
    frequency;

    selectedPrice.innerText = price;

    // FEATURES
    selectedFeatures.innerHTML = "";

    features[plan].forEach(feature => {

      const li =
      document.createElement("li");

      li.innerText = feature;

      selectedFeatures.appendChild(li);

    });

  });

});

/* =========================================
   ADVISOR BUTTON
========================================= */

advisorButton.addEventListener(
"click",
(e) => {

  e.preventDefault();

  // STEP 3 ACTIVE
  stepAdvisor.classList.add(
    "ncs-store-step-active"
  );

  const clientName =
  client || "Client";

  const method =
  document.querySelector(
    'input[name="contactMethod"]:checked'
  ).value;

  const callback =
  document.getElementById(
    "callbackTime"
  ).value;

  const message =
`Hello, my name is ${clientName}.

I reviewed the service portal and I am interested in the following recommendation:

Plan: ${currentPlan}
Frequency: ${currentFrequency}
Price: ${currentPrice}

Preferred callback window:
${callback}

I would like to speak with an advisor for additional guidance.`;

  // SMS
  if (method === "sms") {

    window.location.href =
`sms:+14288880542?body=${encodeURIComponent(message)}`;

  }

  // WHATSAPP
  if (method === "whatsapp") {

    const url =
`https://wa.me/14288880542?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");

  }

});
