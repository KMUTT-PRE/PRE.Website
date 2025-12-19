document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  let lastScroll = window.scrollY;
  let lockNavbar = false;

  /* =====================
     OFFCANVAS
  ===================== */
  document.addEventListener("shown.bs.offcanvas", () => {
    lockNavbar = true;
    navbar.style.top = "0";
  });

  document.addEventListener("hidden.bs.offcanvas", () => {
    lockNavbar = false;
  });

  /* =====================
     DROPDOWN (manual)
  ===================== */
  document
    .querySelectorAll(".offcanvas .nav-item.dropdown > .nav-link")
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();

        const menu = link.nextElementSibling;
        if (!menu) return;

        // ปิด dropdown อื่น
        document
          .querySelectorAll(".offcanvas .dropdown-menu.show")
          .forEach((d) => {
            if (d !== menu) d.classList.remove("show");
          });

        menu.classList.toggle("show");
        lockNavbar = true;
      });
    });

  /* =====================
     SCROLL ANIMATION
  ===================== */
  window.addEventListener("scroll", () => {
    if (lockNavbar) return;

    const currentScroll = window.scrollY;

    if (currentScroll > lastScroll && currentScroll > 80) {
      navbar.style.top = "-150px";
    } else {
      navbar.style.top = "0";
    }

    lastScroll = currentScroll;
  });
});
