filterSelection("all");

function filterSelection(category) {
  let cards = document.getElementsByClassName("card");

  for (let i = 0; i < cards.length; i++) {
    cards[i].classList.remove("show");

    if (category === "all" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "reward" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "scholarships" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "hiring" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "club" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "pre" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "mce" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "isee" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "m-eng" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }

    if (category === "ph-d" || cards[i].classList.contains(category)) {
      cards[i].classList.add("show");
    }
  }
}
