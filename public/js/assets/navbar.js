const navbar = document.getElementById("navbar");
let lastScroll = window.scrollY;
let isDropdownOpen = false;

document.addEventListener("shown.bs.dropdown", () => {
  isDropdownOpen = true;
});
document.addEventListener("hidden.bs.dropdown", () => {
  isDropdownOpen = false;
});

window.addEventListener("scroll", () => {
  if (isDropdownOpen) return;

  const currentScroll = window.scrollY;

  if (currentScroll > lastScroll && currentScroll > 80) {
    navbar.style.transform = "translateY(-100%)";
  } else {
    navbar.style.transform = "translateY(0)";
  }

  lastScroll = currentScroll;
});
//     isTicking = flase;
//   });
//   var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
//   if (scrollTop > lastScrollTop) {
//     navbar.style.top = "-20vh";
//   } else {
//     navbar.style.top = "0";
//   }
//   lastScrollTop = scrollTop;
// });
