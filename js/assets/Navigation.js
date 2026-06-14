function smoothScrollTo(targetY, duration = 900) {
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  let startTime = null;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animation(currentTime) {
    if (!startTime) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * eased);

    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

function toggleNav() {
  const sidebar = document.querySelector(".nav-sidebar");
  sidebar.classList.toggle("active");

  const arrow = document.querySelector(".arrow-icon");
  if (sidebar.classList.contains("active")) {
    arrow.innerText = "❯";
  } else {
    arrow.innerText = "❮";
  }
}

document.querySelectorAll(".primary-navigation a").forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    const targetId = this.getAttribute("href");
    const targetEl = document.querySelector(targetId);
    if (!targetEl) return;

    const offsetVH = 12;
    const offsetPx = (window.innerHeight * offsetVH) / 100;

    const targetY =
      targetEl.getBoundingClientRect().top + window.pageYOffset - offsetPx;

    smoothScrollTo(targetY, 1000);
  });
});
