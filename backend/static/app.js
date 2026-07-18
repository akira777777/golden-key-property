const catalog = document.querySelector("[data-catalog]");
const listingCount = document.querySelector("[data-listing-count]");
const inquiryDialog = document.querySelector("[data-inquiry-dialog]");
const inquiryForm = document.querySelector("#inquiry-form");
const propertySelect = document.querySelector("[data-property-select]");
const formStatus = document.querySelector("[data-form-status]");
const closeInquiryButton = document.querySelector("[data-close-inquiry]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const siteNavigation = document.querySelector("[data-site-nav]");
const catalogFilters = document.querySelector("[data-catalog-filters]");
const filterLocation = document.querySelector("[data-filter-location]");
const filterMinPrice = document.querySelector("[data-filter-min-price]");
const filterMaxPrice = document.querySelector("[data-filter-max-price]");
const filterStatus = document.querySelector("[data-filter-status]");
const resetFiltersButton = document.querySelector("[data-reset-filters]");
const tourDialog = document.querySelector("[data-tour-dialog]");
const tourTitle = document.querySelector("[data-tour-title]");
const tourViewport = document.querySelector("[data-tour-viewport]");
const tourFrame = document.querySelector("[data-tour-frame]");
const tourModel = document.querySelector("[data-tour-model]");
const tourPlaceholder = document.querySelector("[data-tour-placeholder]");
const tourNotice = document.querySelector("[data-tour-notice]");
const closeTourButton = document.querySelector("[data-close-tour]");

const statusLabels = {
  ACTIVE: "Доступен",
  PENDING: "На согласовании",
  SOLD: "Продан",
};

const tourTypeLabels = {
  PHOTO_360: "Панорамный тур 360°",
  MODEL_3D: "3D-модель объекта",
  VIDEO_3D: "3D-видео прогулка",
};

let availableProperties = [];
let lastDialogTrigger = null;
let catalogRequestController = null;

async function loadSimilarProperties(propertyId) {
  if (!catalog) return;
  showCatalogLoading();
  try {
    const response = await fetch(`/api/properties/${propertyId}/similar`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Не удалось найти похожие объекты.");
    const payload = await response.json();
    const properties = Array.isArray(payload.data) ? payload.data : [];
    availableProperties = properties;
    populatePropertySelect(properties);

    catalog.setAttribute("aria-busy", "false");
    if (properties.length) {
      catalog.replaceChildren(...properties.map(createPropertyCard));
      if (listingCount) {
        const word = pluralizeRu(properties.length, ["похожий объект", "похожих объекта", "похожих объектов"]);
        listingCount.textContent = `${properties.length} ${word}.`;
      }
    } else {
      showCatalogMessage("Похожих объектов пока нет. Попробуйте оставить персональный запрос.");
      if (listingCount) listingCount.textContent = "Похожих объектов не найдено.";
    }
    catalog.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    showCatalogMessage("Не удалось загрузить похожие объекты. Попробуйте позже.");
    if (listingCount) listingCount.textContent = "Похожие объекты временно недоступны.";
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function pluralizeRu(count, forms) {
  const absolute = Math.abs(count) % 100;
  const lastDigit = absolute % 10;
  if (absolute > 10 && absolute < 20) return forms[2];
  if (lastDigit > 1 && lastDigit < 5) return forms[1];
  if (lastDigit === 1) return forms[0];
  return forms[2];
}

function formatListingSummary(shown, total) {
  if (total === 0) return "По выбранным фильтрам нет объектов.";
  const listingWord = pluralizeRu(total, ["объект", "объекта", "объектов"]);
  const availability = total === 1 ? "доступен" : "доступны";
  if (shown < total) return `Показано: ${shown} из ${total}.`;
  return `${total} ${listingWord} ${availability} для персонального подбора.`;
}

function formatPropertyDetails(property) {
  return [
    `Спальни: ${property.bedrooms}`,
    `Санузлы: ${property.bathrooms}`,
    `${property.areaSqM} м²`,
  ].join(" · ");
}

function createLoadingCard() {
  const card = document.createElement("article");
  card.className = "property-card property-card--loading";
  card.setAttribute("aria-hidden", "true");

  const visual = document.createElement("div");
  visual.className = "property-card__visual";

  const content = document.createElement("div");
  content.className = "property-card__content";
  content.append(
    createTextElement("span", "skeleton-line skeleton-line--short", ""),
    createTextElement("span", "skeleton-line skeleton-line--title", ""),
    createTextElement("span", "skeleton-line", ""),
    createTextElement("span", "skeleton-line skeleton-line--medium", ""),
  );

  card.append(visual, content);
  return card;
}

function createPropertyCard(property) {
  const card = document.createElement("article");
  card.className = "property-card";

  const visual = document.createElement("div");
  visual.className = "property-card__visual";
  visual.setAttribute("aria-hidden", "true");
  visual.dataset.propertyId = String(property.id);
  if (property.imageUrl) {
    const image = document.createElement("img");
    image.src = property.imageUrl;
    image.alt = "";
    visual.classList.add("property-card__visual--image");
    visual.append(image);
  }
  visual.append(createTextElement("p", "property-card__status", statusLabels[property.listingStatus] || "По запросу"));

  const content = document.createElement("div");
  content.className = "property-card__content";
  content.append(
    createTextElement("p", "property-card__location", property.location),
    createTextElement("h3", "", property.title),
    createTextElement("p", "property-card__price", formatPrice(property.askingPriceUsd)),
    createTextElement("p", "property-card__details", formatPropertyDetails(property)),
    createTextElement("p", "property-card__description", property.description),
  );

  const action = document.createElement("button");
  action.className = "property-card__action";
  action.type = "button";
  if (property.listingStatus === "SOLD") {
    action.dataset.findSimilar = "";
    action.dataset.propertyId = String(property.id);
    action.setAttribute("aria-label", `Найти похожие объекты к «${property.title}»`);
    action.textContent = "Найти похожее";
  } else {
    action.dataset.openInquiry = "";
    action.dataset.propertyId = String(property.id);
    action.setAttribute("aria-label", `Запросить информацию об объекте «${property.title}»`);
    action.textContent = "Узнать больше";
  }
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  action.append(arrow);
  content.append(action);

  if (property.tourType && property.tourType !== "NONE" && property.tourUrl) {
    const tourAction = document.createElement("button");
    tourAction.className = "property-card__action property-card__action--tour";
    tourAction.type = "button";
    tourAction.dataset.openTour = "";
    tourAction.dataset.propertyId = String(property.id);
    tourAction.setAttribute("aria-label", `${tourTypeLabels[property.tourType] || "3D-тур"} для «${property.title}»`);
    tourAction.textContent = tourTypeLabels[property.tourType] || "3D-тур";
    const tourArrow = document.createElement("span");
    tourArrow.setAttribute("aria-hidden", "true");
    tourArrow.textContent = "↗";
    tourAction.append(tourArrow);
    content.append(tourAction);
  }

  card.append(visual, content);
  return card;
}

function showCatalogMessage(message) {
  if (!catalog) return;
  const notice = createTextElement("p", "catalog-notice", message);
  catalog.setAttribute("aria-busy", "false");
  catalog.replaceChildren(notice);
}

function showCatalogLoading() {
  if (!catalog) return;
  catalog.setAttribute("aria-busy", "true");
  catalog.replaceChildren(createLoadingCard(), createLoadingCard(), createLoadingCard());
  if (listingCount) listingCount.textContent = "Загружаем предложения…";
}

function populatePropertySelect(properties) {
  if (!propertySelect) return;
  const currentValue = propertySelect.value;
  const placeholder = new Option("Выберите объект", "");
  placeholder.disabled = true;

  if (!properties.length) {
    propertySelect.replaceChildren(new Option("Нет объектов по выбранным фильтрам", ""));
    propertySelect.disabled = true;
    return;
  }

  const options = properties.map((property) =>
    new Option(`${property.title} — ${property.location}`, String(property.id)),
  );

  propertySelect.disabled = false;
  propertySelect.replaceChildren(placeholder, ...options);
  propertySelect.value = properties.some((property) => String(property.id) === currentValue)
    ? currentValue
    : "";
}

function readPriceFilter(input) {
  const value = input?.value.trim();
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function buildPropertyQuery() {
  const params = new URLSearchParams({ pageSize: "6" });
  const location = filterLocation?.value.trim();
  const minPrice = readPriceFilter(filterMinPrice);
  const maxPrice = readPriceFilter(filterMaxPrice);
  const listingStatus = filterStatus?.value || "ACTIVE";

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { error: "Минимальная цена не может быть выше максимальной." };
  }

  params.set("listingStatus", listingStatus);
  if (location) params.set("location", location);
  if (minPrice !== null) params.set("minPrice", String(minPrice));
  if (maxPrice !== null) params.set("maxPrice", String(maxPrice));
  return { params };
}

function openInquiry(trigger) {
  if (!inquiryDialog) return;
  lastDialogTrigger = trigger;

  const propertyId = trigger.dataset.propertyId;
  if (propertyId && propertySelect) propertySelect.value = propertyId;

  if (!inquiryDialog.open) inquiryDialog.showModal();
  closeInquiryButton?.focus();
}

function closeInquiry() {
  if (inquiryDialog?.open) inquiryDialog.close();
}

function setFormStatus(message, state = "") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.dataset.state = state;
}

async function loadProperties() {
  if (!catalog) return;

  const query = buildPropertyQuery();
  if (query.error) {
    availableProperties = [];
    showCatalogMessage(query.error);
    populatePropertySelect([]);
    if (listingCount) listingCount.textContent = "Проверьте диапазон цены.";
    return;
  }

  catalogRequestController?.abort();
  const requestController = new AbortController();
  catalogRequestController = requestController;
  showCatalogLoading();

  try {
    const response = await fetch(`/api/properties?${query.params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: requestController.signal,
    });
    if (!response.ok) throw new Error("Каталог временно недоступен.");

    const payload = await response.json();
    const properties = Array.isArray(payload.data) ? payload.data : [];
    availableProperties = properties;
    catalog.setAttribute("aria-busy", "false");
    if (properties.length) {
      catalog.replaceChildren(...properties.map(createPropertyCard));
    } else {
      showCatalogMessage("По выбранным фильтрам ничего не найдено. Измените параметры или оставьте персональный запрос.");
    }
    populatePropertySelect(properties);

    if (listingCount) {
      const totalItems = Number(payload.pagination?.totalItems) || properties.length;
      listingCount.textContent = formatListingSummary(properties.length, totalItems);
    }
  } catch (_error) {
    if (_error instanceof DOMException && _error.name === "AbortError") return;
    showCatalogMessage("Не удалось загрузить каталог. Обновите страницу или попробуйте позже.");
    if (listingCount) listingCount.textContent = "Каталог временно недоступен.";
    if (propertySelect) {
      propertySelect.replaceChildren(new Option("Каталог временно недоступен", ""));
      propertySelect.disabled = true;
    }
  } finally {
    if (catalogRequestController === requestController) catalogRequestController = null;
  }
}

async function submitInquiry(event) {
  event.preventDefault();
  if (!inquiryForm) return;

  if (!inquiryForm.checkValidity()) {
    inquiryForm.reportValidity();
    return;
  }

  const submitButton = inquiryForm.querySelector('button[type="submit"]');
  const formData = new FormData(inquiryForm);
  const body = {
    propertyId: Number(formData.get("propertyId")),
    fullName: String(formData.get("fullName") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim() || null,
    message: String(formData.get("message") || "").trim(),
    consentToContact: formData.get("consentToContact") === "on",
  };

  submitButton?.setAttribute("disabled", "");
  setFormStatus("Отправляем запрос…", "pending");

  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || "Не удалось отправить запрос.");

    setFormStatus(payload.message || "Запрос отправлен.", "success");
    inquiryForm.reset();
    populatePropertySelect(availableProperties);
  } catch (error) {
    setFormStatus(
      error instanceof Error ? error.message : "Не удалось отправить запрос. Попробуйте ещё раз.",
      "error",
    );
  } finally {
    submitButton?.removeAttribute("disabled");
  }
}

function configureNavigation() {
  if (!menuToggle || !siteNavigation) return;

  const setOpen = (isOpen) => {
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    siteNavigation.classList.toggle("is-open", isOpen);
    const hiddenLabel = menuToggle.querySelector(".sr-only");
    if (hiddenLabel) hiddenLabel.textContent = isOpen ? "Закрыть навигацию" : "Открыть навигацию";
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  siteNavigation.addEventListener("click", () => {
    setOpen(false);
  });
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-open-inquiry]") : null;
  if (target) openInquiry(target);

  const similar = event.target instanceof Element ? event.target.closest("[data-find-similar]") : null;
  if (similar && similar.dataset.propertyId) loadSimilarProperties(similar.dataset.propertyId);

  const tourTrigger = event.target instanceof Element ? event.target.closest("[data-open-tour]") : null;
  if (tourTrigger && tourTrigger.dataset.propertyId) openTour(tourTrigger.dataset.propertyId);
});

closeTourButton?.addEventListener("click", closeTour);
tourDialog?.addEventListener("close", () => {
  tourFrame.src = "";
  tourFrame.hidden = true;
  if (tourModel) {
    tourModel.src = "";
    tourModel.hidden = true;
  }
  tourPlaceholder.hidden = false;
});

async function openTour(propertyId) {
  if (!tourDialog) return;
  tourTitle.textContent = "3D-прогулка";
  tourNotice.textContent = "";
  tourPlaceholder.hidden = false;
  tourFrame.hidden = true;
  if (tourModel) tourModel.hidden = true;
  tourDialog.showModal();

  try {
    const response = await fetch(`/api/properties/${propertyId}/tour`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Не удалось загрузить тур.");
    const payload = await response.json();
    const tour = payload.data;
    tourTitle.textContent = tour.title || "3D-прогулка";
    if (!tour.tourUrl || tour.tourType === "NONE") {
      tourNotice.textContent = "Для этого объекта пока нет виртуальной прогулки.";
      return;
    }
    tourPlaceholder.hidden = true;
    if (tour.isLocalModel && tourModel) {
      tourModel.src = tour.tourUrl;
      tourModel.hidden = false;
      tourNotice.textContent = "Перетаскивайте мышью, чтобы осмотреться. Используйте колёсико для приближения.";
    } else {
      tourFrame.hidden = false;
      tourFrame.src = tour.tourUrl;
      tourNotice.textContent = tourTypeLabels[tour.tourType] || "";
    }
  } catch {
    tourNotice.textContent = "Не удалось загрузить тур. Попробуйте позже.";
  }
}

function closeTour() {
  if (tourDialog?.open) tourDialog.close();
}

function observeMotionElements() {
  if (!window.IntersectionObserver) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );
  document.querySelectorAll(".property-card, .section-label, .approach__steps li, .partners__grid").forEach((el) => {
    el.classList.add("motion-reveal");
    observer.observe(el);
  });
}

closeInquiryButton?.addEventListener("click", closeInquiry);
inquiryDialog?.addEventListener("close", () => {
  lastDialogTrigger?.focus();
  lastDialogTrigger = null;
});
inquiryForm?.addEventListener("submit", submitInquiry);
catalogFilters?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadProperties().then(() => {
    catalog?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
resetFiltersButton?.addEventListener("click", () => {
  catalogFilters?.reset();
  loadProperties();
  filterLocation?.focus();
});

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

configureNavigation();
loadProperties();
observeMotionElements();
