// document.addEventListener("DOMContentLoaded", function () {
//   const filterButtons = document.querySelectorAll(".btn");
//   const cards = document.querySelectorAll(".card");

//   filterButtons.forEach((button) => {
//     button.addEventListener("click", () => {
//       // ลบ active
//       filterButtons.forEach((btn) => btn.classList.remove("active"));
//       button.classList.add("active");

//       const filterValue = button.dataset.filter.toLowerCase();

//       cards.forEach((card) => {
//         const cardTags = card.dataset.tag.toLowerCase().split(" ");

//         if (filterValue === "all") {
//           card.style.display = "block";
//         } else {
//           card.style.display = cardTags.includes(filterValue)
//             ? "block"
//             : "none";
//         }
//       });
//     });
//   });
// });

document.addEventListener("DOMContentLoaded", function () {
  const filterButtons = document.querySelectorAll(".btn");

  filterButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // reset active
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      const filterValue = this.dataset.filter.toLowerCase();

      // ดึง card ใหม่ทุกครั้ง (กันกรณี DOM update)
      const cards = document.querySelectorAll(".card");

      cards.forEach((card) => {
        const tags = card.dataset.tag.toLowerCase().split(" ");

        if (filterValue === "all") {
          card.classList.remove("hide-card");
        } else if (tags.includes(filterValue)) {
          card.classList.remove("hide-card");
        } else {
          card.classList.add("hide-card");
        }
      });
    });
  });
});
