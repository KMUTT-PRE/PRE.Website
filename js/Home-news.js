const newsGrid = document.querySelector(".news-grid");
const newsItems = Array.from(document.querySelectorAll(".news-grid-item"));
const prevBtn = document.querySelector("#news-prev");
const nextBtn = document.querySelector("#news-next");
const statusEl = document.querySelector("#news-row-status");

if (newsGrid && prevBtn && nextBtn && statusEl && newsItems.length > 0) {
  let currentPage = 1;

  function pageSizeByViewport() {
    if (window.matchMedia("(max-width: 576px)").matches) {
      return 1;
    }
    if (window.matchMedia("(max-width: 992px)").matches) {
      return 2;
    }
    if (window.matchMedia("(max-width: 1200px)").matches) {
      return 3;
    }

    return 4;
  }

  function renderNewsPage() {
    const pageSize = pageSizeByViewport();
    const totalPages = Math.max(1, Math.ceil(newsItems.length / pageSize));

    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;

    newsItems.forEach((item, index) => {
      const isVisible = index >= start && index < end;
      item.classList.toggle("is-hidden", !isVisible);
    });

    statusEl.textContent = `${currentPage} / ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  prevBtn.addEventListener("click", () => {
    currentPage -= 1;
    renderNewsPage();
  });

  nextBtn.addEventListener("click", () => {
    currentPage += 1;
    renderNewsPage();
  });

  window.addEventListener("resize", renderNewsPage);

  renderNewsPage();
}
