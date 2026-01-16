document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;

  document.querySelectorAll("[data-path]").forEach((link) => {
    const path = link.dataset.path;
    if (!path) return;

    if (currentPath === path || currentPath.startsWith(path + "/")) {
      link.classList.add("active");

      const dropdown = link.closest(".nav-item.dropdown");
      if (dropdown) {
        dropdown.querySelector(".nav-link")?.classList.add("active");
      }
    }
  });
});
