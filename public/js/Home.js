const myCarouselElement = document.querySelector("#carouselExampleSlidesOnly");

const carousel = new bootstrap.Carousel(myCarouselElement, {
  interval: 5000,
  ride: "carousel",
  touch: true,
});

function myFunction() {
  var x = document.getElementById("myTopnav");
  if (x.className === "topnav") {
    x.className += "responsive";
  } else {
    x.className = "topnav";
  }
}
