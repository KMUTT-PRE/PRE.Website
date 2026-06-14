document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("plo-modal");
  document.body.appendChild(modal);
  const modalBody = document.getElementById("plo-modal-body");

  document.querySelectorAll(".plo-open").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const card = btn.closest(".card-plo");
      if (!card) return;

      const subplo = card.querySelector(".subplo-hidden");
      if (!subplo) return;

      modalBody.innerHTML = subplo.innerHTML;
      modal.classList.add("active");
    });
  });

  modal.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("plo-modal-overlay") ||
      e.target.classList.contains("plo-modal-close")
    ) {
      modal.classList.remove("active");
    }
  });

  const swiperEl = document.querySelector(".card-wrapper");
  if (swiperEl) {
    new Swiper(swiperEl, {
      loop: true,
      spaceBetween: 30,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
        dynamicBullets: true,
      },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      breakpoints: {
        0: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }
});
