/* North Crescent — FAQ accordion (progressive enhancement).
   Turns every .faq-card inside .faq-grid[data-accordion] into a
   collapsible question. Answers stay in the HTML for SEO and use
   hidden="until-found" so browser find-in-page still reaches them. */
(function () {
  document.querySelectorAll(".faq-grid[data-accordion]").forEach(function (grid, g) {
    grid.classList.add("is-accordion");
    grid.querySelectorAll(".faq-card").forEach(function (card, i) {
      var h = card.querySelector("h3");
      var answer = card.querySelector("p");
      if (!h || !answer) return;
      var id = "faq-" + g + "-" + i;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "faq-toggle";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", id);
      btn.innerHTML = h.innerHTML.trim();
      h.textContent = "";
      h.appendChild(btn);
      answer.id = id;
      answer.setAttribute("hidden", "until-found");

      function set(open) {
        btn.setAttribute("aria-expanded", String(open));
        card.classList.toggle("is-open", open);
        if (open) answer.removeAttribute("hidden");
        else answer.setAttribute("hidden", "until-found");
      }
      btn.addEventListener("click", function () {
        set(btn.getAttribute("aria-expanded") !== "true");
      });
      answer.addEventListener("beforematch", function () { set(true); });
    });
  });
})();
