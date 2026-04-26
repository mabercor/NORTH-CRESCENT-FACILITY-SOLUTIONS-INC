document.addEventListener("DOMContentLoaded", () => {

  // HEADER
  fetch("/components/header.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("header-placeholder").innerHTML = data;
      initMenu(); // importante
    });

  // FOOTER
  fetch("/components/footer.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("footer-placeholder").innerHTML = data;
    });

  // MENU FUNCTION
  function initMenu() {
    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("nav-menu");
    const overlay = document.querySelector(".menu-overlay");

    if (!toggle || !nav || !overlay) return;

    toggle.addEventListener("click", () => {
      toggle.classList.toggle("active");
      nav.classList.toggle("active");
      overlay.classList.toggle("active");
      document.body.classList.toggle("menu-open");
    });

    overlay.addEventListener("click", closeMenu);

    function closeMenu() {
      toggle.classList.remove("active");
      nav.classList.remove("active");
      overlay.classList.remove("active");
      document.body.classList.remove("menu-open");
    }
  }

});
