const modal = document.getElementById("imgModal");
const modalImg = document.getElementById("modalImg");
const captionText = document.getElementById("caption");
const closeBtn = document.querySelector(".close");

document.querySelectorAll(".reward-img").forEach((img) => {
  img.addEventListener("click", () => {
    modal.classList.add("show");
    modalImg.src = img.src;
    captionText.innerText = img.alt;
  });
});

closeBtn.onclick = () => {
  modal.classList.remove("show");
};

modal.onclick = (e) => {
  if (e.target === modal) {
    modal.classList.remove("show");
  }
};
