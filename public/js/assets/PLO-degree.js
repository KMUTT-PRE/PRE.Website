document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".container.swiper").forEach((el) => {
    new Swiper(el, {
      loop: false,
      spaceBetween: 16,
      slidesPerView: 3,
      centeredSlides: false,
      breakpoints: {
        0: { slidesPerView: 1 },
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  });
});
