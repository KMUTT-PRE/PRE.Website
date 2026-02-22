const swiperEl = document.querySelector(".swiper");
if (swiperEl) {
  new Swiper(swiperEl, {
    loop: true,
    spaceBetween: 25,
    grabCursor: true,
    autoHeight: false,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
      dynamicBullet: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    breakpoints: {
      0: { slidesPerView: 1 },
      768: { slidesPerView: 2 },
      1200: { slidesPerView: 3 },
    },
  });
}
