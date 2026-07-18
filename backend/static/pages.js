(() => {
  "use strict";

  const FAVORITES_KEY = "gk.favorites";
  const COMPARE_KEY = "gk.compare";

  function readIds(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
    } catch {
      return [];
    }
  }

  function writeIds(key, ids) {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // Persistence is an enhancement; buttons still report the current state.
    }
  }

  const actionStatus = document.querySelector("[data-page-action-status]");
  const favoriteButtons = [...document.querySelectorAll("[data-page-favorite]")];
  const compareButtons = [...document.querySelectorAll("[data-page-compare]")];

  function refreshActions() {
    const favorites = readIds(FAVORITES_KEY);
    const compared = readIds(COMPARE_KEY);
    favoriteButtons.forEach((button) => {
      const selected = favorites.includes(Number(button.dataset.pageFavorite));
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = selected ? "Saved" : "Save property";
    });
    compareButtons.forEach((button) => {
      const selected = compared.includes(Number(button.dataset.pageCompare));
      button.setAttribute("aria-pressed", String(selected));
      button.textContent = selected ? "Remove from compare" : "Add to compare";
    });
  }

  favoriteButtons.forEach((button) => button.addEventListener("click", () => {
    const id = Number(button.dataset.pageFavorite);
    const ids = readIds(FAVORITES_KEY);
    const next = ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
    writeIds(FAVORITES_KEY, next);
    if (actionStatus) actionStatus.textContent = next.includes(id) ? "Property saved on this device." : "Property removed from saved items.";
    refreshActions();
  }));

  compareButtons.forEach((button) => button.addEventListener("click", () => {
    const id = Number(button.dataset.pageCompare);
    const ids = readIds(COMPARE_KEY);
    if (!ids.includes(id) && ids.length >= 3) {
      if (actionStatus) actionStatus.textContent = "Comparison is limited to three properties.";
      return;
    }
    const next = ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
    writeIds(COMPARE_KEY, next);
    if (actionStatus) actionStatus.textContent = next.includes(id) ? "Property added to compare." : "Property removed from compare.";
    refreshActions();
  }));
  refreshActions();

  const galleryItems = [...document.querySelectorAll("[data-gallery-item]")];
  const lightbox = document.querySelector("[data-page-lightbox]");
  const lightboxImage = lightbox?.querySelector("[data-lightbox-image]");
  const lightboxCaption = lightbox?.querySelector("[data-lightbox-caption]");
  const lightboxPosition = lightbox?.querySelector("[data-lightbox-position]");
  let currentIndex = 0;
  let galleryTrigger = null;

  function showImage(index) {
    if (!galleryItems.length || !(lightboxImage instanceof HTMLImageElement)) return;
    currentIndex = (index + galleryItems.length) % galleryItems.length;
    const image = galleryItems[currentIndex].querySelector("img");
    if (!(image instanceof HTMLImageElement)) return;
    lightboxImage.src = galleryItems[currentIndex].href;
    lightboxImage.alt = image.alt;
    if (lightboxCaption) lightboxCaption.textContent = image.alt;
    if (lightboxPosition) lightboxPosition.textContent = `${currentIndex + 1} of ${galleryItems.length}`;
  }

  galleryItems.forEach((item, index) => item.addEventListener("click", (event) => {
    if (!(lightbox instanceof HTMLDialogElement)) return;
    event.preventDefault();
    galleryTrigger = item;
    showImage(index);
    lightbox.showModal();
  }));
  lightbox?.querySelector("[data-lightbox-close]")?.addEventListener("click", () => lightbox.close());
  lightbox?.querySelector("[data-lightbox-previous]")?.addEventListener("click", () => showImage(currentIndex - 1));
  lightbox?.querySelector("[data-lightbox-next]")?.addEventListener("click", () => showImage(currentIndex + 1));
  lightbox?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showImage(currentIndex - 1);
    if (event.key === "ArrowRight") showImage(currentIndex + 1);
  });
  lightbox?.addEventListener("close", () => galleryTrigger?.focus());
})();
