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

const advisor =
params.get("advisor");

const welcome =
document.getElementById("clientWelcome");

const advisorAssigned =
document.getElementById("advisorAssigned");

/* =========================================
   CLIENT INFO
========================================= */

if (client && welcome) {

  welcome.innerText =
  `Welcome ${client}`;

}

if (advisor && advisorAssigned) {

  advisorAssigned.innerText =
  `Your advisor: ${advisor}`;

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
   SELECT PLAN
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

  // SAVE
  currentPlan = plan;
  currentPrice = price;
  currentFrequency = frequency;

  // SUMMARY
  selectedPlan.innerText = plan;

  selectedFrequency.innerText =
  frequency;

  selectedPrice.innerText =
  price;

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
   BUTTON EVENTS
========================================= */

buttons.forEach(button => {

  button.addEventListener("click", () => {

    selectPlan(button);

  });

});

/* =========================================
   URL AUTO SELECT
========================================= */

const urlPlan =
params.get("plan");

if (urlPlan) {

  buttons.forEach(button => {

    const buttonPlan =
    button.dataset.plan.toLowerCase();

    if (
      buttonPlan.includes(
        urlPlan.toLowerCase()
      )
    ) {

      selectPlan(button);

    }

  });

}

/* =========================================
   ADVISOR BUTTON
========================================= */

advisorButton.addEventListener(
"click",
(e) => {

  e.preventDefault();

  // STEP 3
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
`North Crescent Facility Solutions

Your structured recommendation has been prepared.

Client:
${clientName}

Selected Plan:
${currentPlan}

Service Frequency:
${currentFrequency}

Estimated Investment:
${currentPrice}

Preferred Callback Window:
${callback}

Assigned Advisor:
${advisor || "North Crescent Team"}

I would like to continue with the recommendation review process.`;

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
