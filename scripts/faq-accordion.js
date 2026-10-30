/* North Crescent — FAQ accordion (progressive enhancement).
   Turns every .faq-card inside .faq-grid[data-accordion] into a
   collapsible question. Everything after the question (paragraphs,
   buttons) is wrapped in one answer panel. Answers stay in the HTML
   for SEO and use hidden="until-found" so browser find-in-page still
   reaches them. */
(function () {
  document.querySelectorAll(".faq-grid[data-accordion]").forEach(function (grid, g) {
    grid.classList.add("is-accordion");
    grid.querySelectorAll(".faq-card").forEach(function (card, i) {
      var h = card.querySelector("h3");
      if (!h) return;
      var parts = [];
      var n = h.nextSibling;
      while (n) { parts.push(n); n = n.nextSibling; }
      if (!parts.some(function (x) { return x.nodeType === 1; })) return;

      var panel = document.createElement("div");
      panel.className = "faq-answer";
      parts.forEach(function (x) { panel.appendChild(x); });
      card.appendChild(panel);

      var id = "faq-" + g + "-" + i;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "faq-toggle";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", id);
      btn.innerHTML = h.innerHTML.trim();
      h.textContent = "";
      h.appendChild(btn);
      panel.id = id;
      panel.setAttribute("hidden", "until-found");

      function set(open) {
        btn.setAttribute("aria-expanded", String(open));
        card.classList.toggle("is-open", open);
        if (open) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "until-found");
      }
      btn.addEventListener("click", function () {
        set(btn.getAttribute("aria-expanded") !== "true");
      });
      panel.addEventListener("beforematch", function () { set(true); });
    });
  });
})();
