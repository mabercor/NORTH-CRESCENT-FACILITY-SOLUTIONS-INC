const buttons = document.querySelectorAll(".ncs-store-button");

const selectedPlan = document.getElementById("selectedPlan");
const selectedFrequency = document.getElementById("selectedFrequency");
const selectedPrice = document.getElementById("selectedPrice");

buttons.forEach(button => {

  button.addEventListener("click", () => {

    const card = button.closest(".ncs-store-card");

    // REMOVE ACTIVE
    document.querySelectorAll(".ncs-store-card")
      .forEach(item => {
        item.classList.remove("ncs-store-card-active");
      });

    // ADD ACTIVE
    card.classList.add("ncs-store-card-active");

    // DATA
    const plan = button.dataset.plan;
    const price = button.dataset.price;
    const frequency = button.dataset.frequency;

    selectedPlan.innerText = plan;
    selectedFrequency.innerText = frequency;
    selectedPrice.innerText = price;

  });

});

    const plan = button.dataset.plan;
    const price = button.dataset.price;
    const frequency = button.dataset.frequency;

    selectedPlan.innerText = plan;
    selectedFrequency.innerText = frequency;
    selectedPrice.innerText = price;

  });

});


const params = new URLSearchParams(window.location.search);

const client = params.get("client");

const welcome = document.getElementById("clientWelcome");

if (client && welcome) {

  welcome.innerText = `Welcome ${client}`;

}
