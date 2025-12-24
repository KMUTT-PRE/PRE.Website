const myCarouselElement = document.querySelector("#carouselExampleSlidesOnly");

const carousel = new bootstrap.Carousel(myCarouselElement, {
  interval: 5000,
  ride: "carousel",
  pause: false,
  touch: true,
});
