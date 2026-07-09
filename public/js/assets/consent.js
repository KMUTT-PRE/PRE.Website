(function () {
  const popup = document.getElementById("consentPopup");
  const openButton = document.getElementById("consentOpenButton");
  const acceptButton = document.getElementById("consentAccept");
  const rejectButton = document.getElementById("consentReject");
  const languageButtons = document.querySelectorAll("[data-consent-lang]");

  if (!popup || !openButton || !acceptButton || !rejectButton) {
    return;
  }

  const storageKey = "pemceCookieConsent";
  const languageKey = "pemceCookieConsentLanguage";

  function setOpen(isOpen) {
    popup.classList.toggle("is-open", isOpen);
    popup.setAttribute("aria-hidden", isOpen ? "false" : "true");
    openButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) {
      setButtonVisible(false);
    }
  }

  function setButtonVisible(isVisible) {
    openButton.classList.toggle("is-hidden", !isVisible);
  }

  function setLanguage(language) {
    popup.dataset.lang = language;
    localStorage.setItem(languageKey, language);
  }

  const savedLanguage = localStorage.getItem(languageKey) || "th";
  setLanguage(savedLanguage);
  setButtonVisible(!localStorage.getItem(storageKey));

  openButton.addEventListener("click", function () {
    setOpen(true);
  });

  languageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setLanguage(button.dataset.consentLang);
    });
  });

  acceptButton.addEventListener("click", function () {
    localStorage.setItem(storageKey, "accepted");
    setOpen(false);
    setButtonVisible(false);
  });

  rejectButton.addEventListener("click", function () {
    localStorage.setItem(storageKey, "rejected");
    setOpen(false);
    setButtonVisible(false);
  });
})();
