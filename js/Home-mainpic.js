const myCarouselElement = document.querySelector("#carouselExampleSlidesOnly");

const carousel = new bootstrap.Carousel(myCarouselElement, {
  interval: 3000,
  ride: "carousel",
  touch: true,
});
