document.addEventListener("DOMContentLoaded", function () {
  const filterButtons = document.querySelectorAll(".btn");
  const cards = document.querySelectorAll(".card");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const filterValue = button.dataset.filter.toLowerCase();

      cards.forEach((card) => {
        const cardTags = card.dataset.tag.toLowerCase().split(" ");

        if (filterValue === "all" || cardTags.includes(filterValue)) {
          card.classList.remove("hide");
        } else {
          card.classList.add("hide");
        }
      });
    });
  });
});
