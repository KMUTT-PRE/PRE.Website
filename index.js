const myCarouselElement = document.querySelector("#myCarousel");

const carousel = new bootstrap.Carousel(myCarouselElement, {
  interval: 5000,
  touch: false,
});

function myFunction() {
  var x = document.getElementById("myTopnav");
  if (x.className === "topnav") {
    x.className += "responsive";
  } else {
    x.className = "topnav";
  }
}
