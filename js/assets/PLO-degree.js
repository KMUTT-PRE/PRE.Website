const ploSwipers = [];

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("plo-modal");
  const modalBody = document.getElementById("plo-modal-body");
  const modalOverlay = document.querySelector(".plo-modal-overlay");
  const modalClose = document.querySelector(".plo-modal-close");
  document.querySelectorAll(".container.swiper").forEach((el) => {
    const swiper = new Swiper(el, {
      loop: false,
      spaceBetween: 16,
      slidesPerView: 3,
      navigation: {
        nextEl: el.querySelector(".swiper-button-next"),
        prevEl: el.querySelector(".swiper-button-prev"),
      },
      breakpoints: {
        0: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });

    ploSwipers.push(swiper);
  });
  // เปิด modal
  document.querySelectorAll(".plo-open").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".card-plo");
      const subplo = card.querySelector(".subplo-hidden");

      modalBody.innerHTML = subplo.innerHTML;
      modal.classList.add("active");
    });
  });
  // ปิด modal
  [modalOverlay, modalClose].forEach((el) => {
    el.addEventListener("click", () => {
      modal.classList.remove("active");
      modalBody.innerHTML = "";
    });
  });
});
