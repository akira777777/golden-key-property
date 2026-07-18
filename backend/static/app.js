/* ============================================================
   Golden Key Property Listings — frontend
   Locale-aware: pulls strings/formatting from GK_I18N (i18n.js).
   Re-renders catalog and dropdowns on locale change.
   ============================================================ */

const I18N = window.GK_I18N || {
  setLocale: () => {},
  getLocale: () => "ru",
  translate: (key) => key,
  format: (template, vars) => (template || "").replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? ""),
  formatPrice: (value) => `$${value}`,
  formatNumber: (value) => String(value),
  formatArea: (sqm) => `${sqm} m²`,
  pluralize: (_count, forms) => forms[1] || forms[0],
};

const t = (key, vars) => I18N.format(I18N.translate(key), vars);
const fmtPrice = (value) => I18N.formatPrice(value);
const fmtArea = (sqm) => I18N.formatArea(sqm);
const pluralizeKey = (count, key) => {
  const forms = [
    I18N.translate(`${key}.0`),
    I18N.translate(`${key}.1`),
    I18N.translate(`${key}.2`),
  ];
  return I18N.pluralize(count, forms);
};

// ----- Element refs -----

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
const siteHeader = document.querySelector("[data-site-header]");
const heroSection = document.querySelector("[data-hero]");
const toastContainer = document.querySelector("[data-toast-container]");
const scrollProgress = document.querySelector("[data-scroll-progress]");

// ----- State -----

let availableProperties = [];
let lastDialogTrigger = null;
let catalogRequestController = null;

// ----- Feature detection helpers -----

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const supportsViewTransitions = () =>
  typeof document !== "undefined" && "startViewTransition" in document;

// ----- Toast notification system -----

function ensureToastContainer() {
  if (toastContainer && toastContainer.isConnected) return toastContainer;
  let container = document.querySelector("[data-toast-container]");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-stack";
    container.setAttribute("data-toast-container", "");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "true");
    document.body.appendChild(container);
  }
  return container;
}

function createToast(variant, message, durationMs = 4000) {
  const container = ensureToastContainer();
  if (!container) return null;

  const toast = document.createElement("div");
  toast.className = `toast toast--${variant || "info"}`;
  toast.setAttribute("role", variant === "error" ? "alert" : "status");

  const text = document.createElement("span");
  text.className = "toast__message";
  text.textContent = String(message ?? "");
  toast.append(text);

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "toast__dismiss";
  dismiss.setAttribute("aria-label", "Dismiss notification");
  dismiss.textContent = "×";
  dismiss.addEventListener("click", () => removeToast(toast));
  toast.append(dismiss);

  container.append(toast);
  // Trigger enter animation on next frame.
  requestAnimationFrame(() => toast.classList.add("is-visible"));

  if (durationMs > 0) {
    window.setTimeout(() => removeToast(toast), durationMs);
  }
  return toast;
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.remove("is-visible");
  toast.classList.add("is-leaving");
  window.setTimeout(() => toast.remove(), 240);
}

const toast = {
  success: (msg, ms) => createToast("success", msg, ms),
  error: (msg, ms) => createToast("error", msg, ms),
  info: (msg, ms) => createToast("info", msg, ms),
};

// ----- View Transitions wrapper -----

function withViewTransition(update) {
  if (typeof update !== "function") return undefined;
  if (supportsViewTransitions() && !prefersReducedMotion()) {
    try {
      return document.startViewTransition(() => {
        update();
      });
    } catch (error) {
      // Fall through to direct update if the API throws.
      console.warn("View transition failed; falling back.", error);
    }
  }
  update();
  return undefined;
}

// ----- Status / tour type labels (locale-aware) -----

function statusLabel(status) {
  const key = `card.status.${String(status).toLowerCase()}`;
  return I18N.translate(key) || I18N.translate("card.status.fallback");
}

function tourTypeLabel(tourType) {
  if (tourType === "PHOTO_360") return I18N.translate("card.cta.tour360");
  if (tourType === "MODEL_3D") return I18N.translate("card.cta.tour3d");
  if (tourType === "VIDEO_3D") return I18N.translate("card.cta.tourVideo");
  return I18N.translate("card.cta.tourFallback");
}

// ----- Catalog loading / similar listings -----

async function loadSimilarProperties(propertyId) {
  if (!catalog) return;
  showCatalogLoading();
  try {
    const response = await fetch(`/api/properties/${propertyId}/similar`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("similar_unavailable");
    const payload = await response.json();
    const properties = Array.isArray(payload.data) ? payload.data : [];
    availableProperties = properties;
    populatePropertySelect(properties);

    catalog.setAttribute("aria-busy", "false");
    if (properties.length) {
      withViewTransition(() => {
        catalog.replaceChildren(...properties.map(createPropertyCard));
      });
      if (listingCount) {
        const word = pluralizeKey(properties.length, "word.similar");
        listingCount.textContent = t("summary.similar", { count: properties.length, word });
      }
    } else {
      showCatalogMessage(I18N.translate("catalog.similar.empty"));
      if (listingCount) listingCount.textContent = I18N.translate("catalog.similar.unavailableShort");
    }
    catalog.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    showCatalogMessage(I18N.translate("catalog.similar.unavailable"));
    if (listingCount) listingCount.textContent = I18N.translate("catalog.similar.unavailableShort");
  }
}

// ----- DOM helpers -----

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createPropertyCard(property) {
  const card = document.createElement("article");
  card.className = "property-card";
  // Cycle through 3 visual variants (emerald, gold, navy) for visual variety
  card.dataset.cardVariant = String(((property.id - 1) % 3) + 1);

  const visual = document.createElement("div");
  visual.className = "property-card__visual";
  visual.dataset.propertyId = String(property.id);
  visual.style.cursor = "pointer";
  visual.addEventListener("click", (e) => {
    if (e.target.closest(".property-card__compare")) return;
    openDetails(property);
  });

  if (property.imageUrl) {
    const image = document.createElement("img");
    image.src = property.imageUrl;
    image.alt = "";
    image.loading = "lazy";
    visual.classList.add("property-card__visual--image");
    visual.append(image);
  }
  const statusNode = createTextElement("p", `property-card__status property-card__status--${String(property.listingStatus).toLowerCase()}`, statusLabel(property.listingStatus));
  visual.append(statusNode);
  if (property.askingPriceUsd) {
    visual.append(
      createTextElement("span", "property-card__price-tag", fmtPrice(property.askingPriceUsd)),
    );
  }

  // Compare checkbox overlay
  const compareLabel = document.createElement("label");
  compareLabel.className = "property-card__compare";
  compareLabel.setAttribute("aria-label", I18N.translate("compare.label"));
  compareLabel.addEventListener("click", (e) => e.stopPropagation());

  const compareInput = document.createElement("input");
  compareInput.type = "checkbox";
  compareInput.value = property.id;
  compareInput.checked = selectedCompareIds.includes(property.id);
  compareInput.addEventListener("change", (e) => {
    toggleCompareProperty(property, e.target.checked);
  });

  const compareSpan = document.createElement("span");
  compareSpan.textContent = I18N.translate("compare.label");

  compareLabel.append(compareInput, compareSpan);
  visual.append(compareLabel);

  const content = document.createElement("div");
  content.className = "property-card__content";

  content.append(createTextElement("p", "property-card__location", property.location));
  
  // Make title clickable button
  const titleNode = createTextElement("h3", "", property.title);
  titleNode.style.cursor = "pointer";
  titleNode.setAttribute("tabindex", "0");
  titleNode.setAttribute("role", "button");
  titleNode.setAttribute("aria-label", `${I18N.translate("details.view")}: ${property.title}`);
  titleNode.addEventListener("click", () => openDetails(property));
  titleNode.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetails(property);
    }
  });
  content.append(titleNode);

  content.append(createTextElement("p", "property-card__price", fmtPrice(property.askingPriceUsd)));

  // price per sqm subtitle, only when both values are valid
  if (property.askingPriceUsd && property.areaSqM) {
    const perSqm = Math.round(property.askingPriceUsd / property.areaSqM);
    content.append(
      createTextElement("p", "property-card__price-sub", t("card.pricePerSqM", { price: fmtPrice(perSqm) })),
    );
  }

  // detail pills
  const details = document.createElement("div");
  details.className = "property-card__details";
  details.append(
    createTextElement("span", "", `${property.bedrooms} · ${I18N.translate("card.bedrooms")}`),
    createTextElement("span", "", `${property.bathrooms} · ${I18N.translate("card.bathrooms")}`),
    createTextElement("span", "", fmtArea(property.areaSqM)),
  );
  content.append(details);

  content.append(createTextElement("p", "property-card__description", property.description));

  const actionsRow = document.createElement("div");
  actionsRow.className = "property-card__actions";

  const action = document.createElement("button");
  action.className = "property-card__action";
  action.type = "button";
  if (property.listingStatus === "SOLD") {
    action.dataset.findSimilar = "";
    action.dataset.propertyId = String(property.id);
    action.setAttribute(
      "aria-label",
      t("card.aria.similar", { title: property.title }),
    );
    action.textContent = I18N.translate("card.cta.similar");
  } else {
    action.dataset.openInquiry = "";
    action.dataset.propertyId = String(property.id);
    action.setAttribute(
      "aria-label",
      t("card.aria.inquire", { title: property.title }),
    );
    action.textContent = I18N.translate("card.cta.inquire");
  }
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  action.append(arrow);
  actionsRow.append(action);

  if (property.tourType && property.tourType !== "NONE" && property.tourUrl) {
    const tourAction = document.createElement("button");
    tourAction.className = "property-card__action property-card__action--tour";
    tourAction.type = "button";
    tourAction.dataset.openTour = "";
    tourAction.dataset.propertyId = String(property.id);
    const tourLabel = tourTypeLabel(property.tourType);
    tourAction.setAttribute(
      "aria-label",
      t("card.aria.tour", { tourType: tourLabel, title: property.title }),
    );
    tourAction.textContent = tourLabel;
    const tourArrow = document.createElement("span");
    tourArrow.setAttribute("aria-hidden", "true");
    tourArrow.textContent = "↗";
    tourAction.append(tourArrow);
    actionsRow.append(tourAction);
  }

  content.append(actionsRow);

  card.append(visual, content);
  return card;
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
  if (listingCount) listingCount.textContent = I18N.translate("catalog.loading");
}

function populatePropertySelect(properties) {
  if (!propertySelect) return;
  const currentValue = propertySelect.value;
  const placeholder = new Option(I18N.translate("inquiry.field.property"), "");
  placeholder.disabled = true;

  if (!properties.length) {
    propertySelect.replaceChildren(
      new Option(I18N.translate("inquiry.field.propertyLoading"), ""),
    );
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

// ----- Catalog summary (locale-aware) -----

function formatListingSummary(shown, total) {
  if (total === 0) return I18N.translate("summary.empty");
  const listingWord = pluralizeKey(total, "word.object");
  const availability =
    total === 1
      ? I18N.translate("word.availability.singular")
      : I18N.translate("word.availability.plural");
  if (shown < total) return t("summary.shown", { shown, total });
  return t("summary.total", { total, word: listingWord, availability });
}

// ----- Filter query -----

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
    return { error: I18N.translate("filter.rangeError") };
  }

  params.set("listingStatus", listingStatus);
  if (location) params.set("location", location);
  if (minPrice !== null) params.set("minPrice", String(minPrice));
  if (maxPrice !== null) params.set("maxPrice", String(maxPrice));
  return { params };
}

// ----- Inquiry dialog -----

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
    if (listingCount) listingCount.textContent = I18N.translate("catalog.priceError");
    toast.error(query.error);
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
    if (!response.ok) throw new Error("catalog_unavailable");

    const payload = await response.json();
    const properties = Array.isArray(payload.data) ? payload.data : [];
    availableProperties = properties;
    catalog.setAttribute("aria-busy", "false");
    if (properties.length) {
      withViewTransition(() => {
        catalog.replaceChildren(...properties.map(createPropertyCard));
      });
    } else {
      showCatalogMessage(I18N.translate("catalog.empty"));
    }
    populatePropertySelect(properties);

    if (listingCount) {
      const totalItems = Number(payload.pagination?.totalItems) || properties.length;
      listingCount.textContent = formatListingSummary(properties.length, totalItems);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    showCatalogMessage(I18N.translate("catalog.unavailable"));
    if (listingCount) listingCount.textContent = I18N.translate("catalog.unavailableShort");
    if (propertySelect) {
      propertySelect.replaceChildren(new Option(I18N.translate("catalog.unavailableShort"), ""));
      propertySelect.disabled = true;
    }
    toast.error(I18N.translate("catalog.unavailable"));
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
  setFormStatus(I18N.translate("inquiry.sending"), "pending");

  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || I18N.translate("inquiry.error"));

    setFormStatus(payload.message || I18N.translate("inquiry.success"), "success");
    toast.success(payload.message || I18N.translate("inquiry.success"));
    inquiryForm.reset();
    populatePropertySelect(availableProperties);
  } catch (error) {
    const message = error instanceof Error ? error.message : I18N.translate("inquiry.error");
    setFormStatus(message, "error");
    toast.error(message);
  } finally {
    submitButton?.removeAttribute("disabled");
  }
}

// ----- Navigation -----

function configureNavigation() {
  if (!menuToggle || !siteNavigation) return;

  const setOpen = (isOpen) => {
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    siteNavigation.classList.toggle("is-open", isOpen);
    const hiddenLabel = menuToggle.querySelector(".sr-only");
    if (hiddenLabel) {
      hiddenLabel.textContent = isOpen
        ? I18N.translate("nav.menu.close")
        : I18N.translate("nav.menu.open");
    }
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  siteNavigation.addEventListener("click", () => {
    setOpen(false);
  });
}

// ----- Tour dialog -----

const tourProgress = document.querySelector("[data-tour-progress]");
const tourProgressBar = document.querySelector("[data-tour-progress-bar]");
const tourProgressLabel = document.querySelector("[data-tour-progress-label]");
const tourControls = document.querySelector("[data-tour-controls]");

function setTourProgress(value) {
  if (!tourProgress || !tourProgressBar || !tourProgressLabel) return;
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  tourProgressBar.style.setProperty("--tour-progress", `${pct}%`);
  tourProgressLabel.textContent = `${pct}%`;
  tourProgress.hidden = pct >= 100;
}

function hookModelEvents() {
  if (!tourModel) return;
  const onProgress = (event) => {
    const value = event.detail?.totalProgress ?? 0;
    setTourProgress(value * 100);
  };
  const onLoad = () => setTourProgress(100);
  const onError = () => {
    setTourProgress(0);
    if (tourNotice) tourNotice.textContent = I18N.translate("tour.error");
  };
  tourModel.addEventListener("progress", onProgress);
  tourModel.addEventListener("load", onLoad);
  tourModel.addEventListener("error", onError);
}

async function openTour(propertyId) {
  if (!tourDialog) return;
  tourTitle.textContent = I18N.translate("tour.title");
  tourNotice.textContent = "";
  setTourProgress(0);
  tourPlaceholder.hidden = false;
  tourFrame.hidden = true;
  if (tourModel) tourModel.hidden = true;
  if (tourControls) tourControls.hidden = true;
  tourDialog.showModal();

  try {
    const response = await fetch(`/api/properties/${propertyId}/tour`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("tour_unavailable");
    const payload = await response.json();
    const tour = payload.data;
    tourTitle.textContent = tour.title || I18N.translate("tour.title");
    if (!tour.tourUrl || tour.tourType === "NONE") {
      tourNotice.textContent = I18N.translate("tour.notFound");
      return;
    }
    tourPlaceholder.hidden = true;
    if (tour.isLocalModel && tourModel) {
      tourModel.src = tour.tourUrl;
      tourModel.hidden = false;
      if (tourControls) tourControls.hidden = false;
      tourNotice.textContent = I18N.translate("tour.modelHint");
    } else {
      tourFrame.hidden = false;
      tourFrame.src = tour.tourUrl;
      tourNotice.textContent = tourTypeLabel(tour.tourType);
    }
  } catch {
    tourNotice.textContent = I18N.translate("tour.error");
  }
}

function closeTour() {
  if (tourDialog?.open) tourDialog.close();
}

tourDialog?.addEventListener("click", (event) => {
  const action = event.target instanceof Element ? event.target.closest("[data-tour-action]") : null;
  if (!action || !tourModel) return;
  const actionName = action.dataset.tourAction;
  if (actionName === "reset") {
    tourModel.cameraOrbit = "45deg 75deg 12m";
    tourModel.fieldOfView = "45deg";
    tourModel.jumpCameraToGoal();
  } else if (actionName === "ar") {
    tourModel.activateAR?.();
  }
});

hookModelEvents();

// ----- Motion / reveal observer -----

function observeMotionElements() {
  if (!window.IntersectionObserver) {
    document.querySelectorAll(".motion-reveal, .stagger, [data-reveal]").forEach((el) => {
      el.classList.add("is-visible");
    });
    applyStaggerDelays();
    return;
  }
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
  document.querySelectorAll(".motion-reveal, .stagger, [data-reveal]").forEach((el) => {
    el.classList.add("motion-reveal");
    observer.observe(el);
  });
  applyStaggerDelays();
}

function applyStaggerDelays(stepMs = 70) {
  if (prefersReducedMotion()) stepMs = 0;
  document.querySelectorAll("[data-stagger-children]").forEach((parent) => {
    const children = Array.from(parent.children);
    children.forEach((child, index) => {
      child.style.setProperty("--stagger-delay", `${index * stepMs}ms`);
      child.style.setProperty("animation-delay", `${index * stepMs}ms`);
    });
  });
}

// ----- Header scroll progress + state -----

function configureHeaderScroll() {
  if (!siteHeader) return;
  const update = () => {
    const scrolled = window.scrollY > 32;
    siteHeader.classList.toggle("is-scrolled", scrolled);

    if (scrollProgress) {
      const scrollMax = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const ratio = Math.max(0, Math.min(1, window.scrollY / scrollMax));
      scrollProgress.style.setProperty("--scroll-progress", `${ratio * 100}%`);
    }
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
}

// ----- Active nav section highlighting -----

function configureActiveNavHighlight() {
  if (!siteNavigation) return;
  const navLinks = Array.from(siteNavigation.querySelectorAll("a[href^='#']"));
  if (!navLinks.length) return;

  const linkByHash = new Map();
  const sections = [];
  navLinks.forEach((link) => {
    const hash = link.getAttribute("href");
    if (!hash || hash.length < 2) return;
    const id = hash.slice(1);
    const section = document.getElementById(id);
    if (!section) return;
    linkByHash.set(section, link);
    sections.push(section);
  });

  if (!sections.length || !window.IntersectionObserver) return;

  const setCurrent = (section) => {
    navLinks.forEach((link) => link.classList.remove("is-current"));
    const match = section ? linkByHash.get(section) : null;
    if (match) match.classList.add("is-current");
  };

  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the entry closest to the top of the viewport.
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) {
        setCurrent(visible[0].target);
      }
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
  );

  sections.forEach((section) => observer.observe(section));
}

// ----- Smooth scroll-to-anchor (header-aware) -----

function getHeaderOffset() {
  if (!siteHeader) return 0;
  return siteHeader.getBoundingClientRect().height || 0;
}

function configureSmoothScroll() {
  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href^='#']") : null;
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.length < 2 || href === "#") return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    event.preventDefault();
    const offset = getHeaderOffset() + 16;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    window.scrollTo({ top, behavior });
    if (siteNavigation?.classList.contains("is-open")) {
      menuToggle?.setAttribute("aria-expanded", "false");
      siteNavigation.classList.remove("is-open");
    }
  });
}

// ----- Focus restoration polish for dialogs -----

function configureDialogPolish() {
  [inquiryDialog, tourDialog, detailsDialog, compareDialog].forEach((dialog) => {
    if (!dialog) return;
    dialog.addEventListener("close", () => {
      // Native focus restoration handled by the browser, but make sure the
      // trigger (when known) regains focus and the tabindex is reset.
      if (dialog === inquiryDialog && lastDialogTrigger) {
        lastDialogTrigger.focus();
        lastDialogTrigger = null;
      }
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });
  });
}

// ----- Hero entrance -----

function primeHero() {
  if (!heroSection) return;
  // Trigger CSS animations on the hero content after first frame.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => heroSection.classList.add("is-ready"));
  });
}

// ----- Event wiring -----

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-open-inquiry]") : null;
  if (target) openInquiry(target);

  const similar = event.target instanceof Element ? event.target.closest("[data-find-similar]") : null;
  if (similar && similar.dataset.propertyId) loadSimilarProperties(similar.dataset.propertyId);

  const tourTrigger = event.target instanceof Element ? event.target.closest("[data-open-tour]") : null;
  if (tourTrigger && tourTrigger.dataset.propertyId) openTour(tourTrigger.dataset.propertyId);

  const copyTrigger = event.target instanceof Element ? event.target.closest("[data-copy]") : null;
  if (copyTrigger) {
    const value = copyTrigger.dataset.copy;
    if (value) {
      navigator.clipboard?.writeText(value).then(
        () => toast.success(I18N.translate("toast.copied")),
        () => toast.error(I18N.translate("toast.copyError")),
      );
    }
  }

  // Details dialog controls
  if (event.target instanceof Element && event.target.closest("[data-close-details]")) {
    detailsDialog?.close();
  }
  if (event.target instanceof Element && event.target.closest("[data-carousel-prev]")) {
    goToCarouselSlide(detailsCarouselIndex - 1);
  }
  if (event.target instanceof Element && event.target.closest("[data-carousel-next]")) {
    goToCarouselSlide(detailsCarouselIndex + 1);
  }

  // Compare dialog controls
  if (event.target instanceof Element && event.target.closest("[data-close-compare]")) {
    compareDialog?.close();
  }
  if (event.target instanceof Element && event.target.closest("[data-compare-trigger]")) {
    openComparison();
  }
  if (event.target instanceof Element && event.target.closest("[data-compare-clear]")) {
    clearCompareSelection();
  }
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

// ============================================================
//  Premium Feature: Details Modal & Carousel & Landmarks
// ============================================================

const detailsDialog = document.querySelector("[data-details-dialog]");
let detailsCarouselIndex = 0;
let detailsCarouselImages = [];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function openDetails(property) {
  if (!detailsDialog) return;

  const locationEl = detailsDialog.querySelector("[data-details-location]");
  const titleEl = detailsDialog.querySelector("[data-details-title]");
  const priceEl = detailsDialog.querySelector("[data-details-price]");
  const priceSqmEl = detailsDialog.querySelector("[data-details-price-sqm]");
  const specsEl = detailsDialog.querySelector("[data-details-specs]");
  const amenitiesEl = detailsDialog.querySelector("[data-details-amenities]");
  const landmarksEl = detailsDialog.querySelector("[data-details-landmarks]");

  if (locationEl) locationEl.textContent = property.location;
  if (titleEl) titleEl.textContent = property.title;
  if (priceEl) priceEl.textContent = fmtPrice(property.askingPriceUsd);

  if (priceSqmEl && property.askingPriceUsd && property.areaSqM) {
    const perSqm = Math.round(property.askingPriceUsd / property.areaSqM);
    priceSqmEl.textContent = t("card.pricePerSqM", { price: fmtPrice(perSqm) });
  } else if (priceSqmEl) {
    priceSqmEl.textContent = "";
  }

  if (specsEl) {
    specsEl.innerHTML = "";
    
    // Bedrooms
    const bed = document.createElement("div");
    bed.className = "details-spec-item";
    bed.innerHTML = `
      <span class="details-spec-label">${I18N.translate("card.bedrooms")}</span>
      <span class="details-spec-value">${property.bedrooms}</span>
    `;
    specsEl.appendChild(bed);

    // Bathrooms
    const bath = document.createElement("div");
    bath.className = "details-spec-item";
    bath.innerHTML = `
      <span class="details-spec-label">${I18N.translate("card.bathrooms")}</span>
      <span class="details-spec-value">${property.bathrooms}</span>
    `;
    specsEl.appendChild(bath);

    // Area
    const area = document.createElement("div");
    area.className = "details-spec-item";
    const areaLabel = I18N.translate("card.area").replace("{n}", "").trim() || "Area";
    area.innerHTML = `
      <span class="details-spec-label">${areaLabel}</span>
      <span class="details-spec-value">${fmtArea(property.areaSqM)}</span>
    `;
    specsEl.appendChild(area);

    // Year Built
    if (property.yearBuilt) {
      const yr = document.createElement("div");
      yr.className = "details-spec-item";
      yr.innerHTML = `
        <span class="details-spec-label">${I18N.translate("card.yearBuilt")}</span>
        <span class="details-spec-value">${property.yearBuilt}</span>
      `;
      specsEl.appendChild(yr);
    }

    // Parking
    if (property.parking !== null && property.parking !== undefined) {
      const prk = document.createElement("div");
      prk.className = "details-spec-item";
      prk.innerHTML = `
        <span class="details-spec-label">${I18N.translate("card.parking")}</span>
        <span class="details-spec-value">${property.parking}</span>
      `;
      specsEl.appendChild(prk);
    }
  }

  if (amenitiesEl) {
    amenitiesEl.innerHTML = "";
    const feats = Array.isArray(property.features) ? property.features : [];
    if (feats.length) {
      feats.forEach(f => {
        const badge = document.createElement("span");
        badge.className = "details-amenity-badge";
        badge.textContent = f;
        amenitiesEl.appendChild(badge);
      });
    } else {
      const fallback = document.createElement("span");
      fallback.className = "details-amenity-badge";
      fallback.textContent = "Luxury details";
      amenitiesEl.appendChild(fallback);
    }
  }

  if (landmarksEl && property.latitude && property.longitude) {
    landmarksEl.innerHTML = "";
    const keyLandmarks = [
      { nameKey: "details.landmark.burj_khalifa", lat: 25.1972, lon: 55.2744 },
      { nameKey: "details.landmark.palm_jumeirah", lat: 25.1124, lon: 55.1390 },
      { nameKey: "details.landmark.dubai_marina", lat: 25.0801, lon: 55.1346 },
      { nameKey: "details.landmark.mall_of_emirates", lat: 25.1181, lon: 55.2006 },
      { nameKey: "details.landmark.dxb_airport", lat: 25.2532, lon: 55.3657 }
    ];
    keyLandmarks.forEach(item => {
      const dist = calculateDistance(property.latitude, property.longitude, item.lat, item.lon);
      const li = document.createElement("li");
      li.textContent = t("details.distanceTo", { distance: dist.toFixed(1), landmark: I18N.translate(item.nameKey) });
      landmarksEl.appendChild(li);
    });
  }

  // Carousel
  detailsCarouselIndex = 0;
  detailsCarouselImages = Array.isArray(property.images) && property.images.length ? property.images : (property.imageUrl ? [property.imageUrl] : []);
  renderCarousel();

  // CTA handlers
  const inqBtn = detailsDialog.querySelector("[data-details-inquiry]");
  if (inqBtn) {
    inqBtn.onclick = () => {
      detailsDialog.close();
      setTimeout(() => {
        openInquiry({ dataset: { propertyId: property.id } });
      }, 150);
    };
  }

  const tourBtn = detailsDialog.querySelector("[data-details-tour]");
  if (tourBtn) {
    if (property.tourType && property.tourType !== "NONE" && property.tourUrl) {
      tourBtn.hidden = false;
      tourBtn.onclick = () => {
        detailsDialog.close();
        setTimeout(() => {
          openTour(property.id);
        }, 150);
      };
    } else {
      tourBtn.hidden = true;
    }
  }

  detailsDialog.showModal();
}

function renderCarousel() {
  const track = detailsDialog.querySelector("[data-carousel-track]");
  const nav = detailsDialog.querySelector("[data-carousel-nav]");
  if (!track) return;

  track.innerHTML = "";
  if (nav) nav.innerHTML = "";

  const prevBtn = detailsDialog.querySelector("[data-carousel-prev]");
  const nextBtn = detailsDialog.querySelector("[data-carousel-next]");

  if (!detailsCarouselImages.length) {
    const slide = document.createElement("li");
    slide.className = "details-carousel__slide";
    slide.innerHTML = `<div class="carousel-no-photos">No photos</div>`;
    track.appendChild(slide);
    if (prevBtn) prevBtn.hidden = true;
    if (nextBtn) nextBtn.hidden = true;
    return;
  }

  const showControls = detailsCarouselImages.length > 1;
  if (prevBtn) prevBtn.hidden = !showControls;
  if (nextBtn) nextBtn.hidden = !showControls;

  detailsCarouselImages.forEach((imgUrl, idx) => {
    const slide = document.createElement("li");
    slide.className = "details-carousel__slide";
    
    const img = document.createElement("img");
    img.src = imgUrl;
    img.alt = "";
    img.loading = idx === 0 ? "eager" : "lazy";
    slide.appendChild(img);
    track.appendChild(slide);

    if (nav && detailsCarouselImages.length > 1) {
      const dot = document.createElement("button");
      dot.className = `details-carousel__indicator ${idx === 0 ? "is-active" : ""}`;
      dot.setAttribute("aria-label", `Slide ${idx + 1}`);
      dot.addEventListener("click", () => goToCarouselSlide(idx));
      nav.appendChild(dot);
    }
  });

  goToCarouselSlide(0);
}

function goToCarouselSlide(idx) {
  const track = detailsDialog.querySelector("[data-carousel-track]");
  if (!track) return;
  
  const total = detailsCarouselImages.length;
  if (!total) return;

  detailsCarouselIndex = (idx + total) % total;
  track.style.transform = `translateX(-${detailsCarouselIndex * 100}%)`;

  const indicators = detailsDialog.querySelectorAll(".details-carousel__indicator");
  indicators.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === detailsCarouselIndex);
  });
}

// ============================================================
//  Premium Feature: Comparison Dashboard
// ============================================================

let selectedCompareIds = [];
let selectedCompareCache = {}; // Cache selected property objects
const compareBar = document.querySelector("[data-compare-bar]");
const compareThumbnails = document.querySelector("[data-compare-thumbnails]");
const compareCount = document.querySelector("[data-compare-count]");
const compareDialog = document.querySelector("[data-compare-dialog]");

function toggleCompareProperty(property, isChecked) {
  const propertyId = typeof property === "object" ? property.id : property;
  const idx = selectedCompareIds.indexOf(propertyId);
  if (isChecked) {
    if (selectedCompareIds.length >= 3) {
      toast.error(I18N.translate("compare.limit"));
      document.querySelectorAll(`.property-card__compare input[value="${propertyId}"]`).forEach(input => {
        input.checked = false;
      });
      return;
    }
    if (idx === -1) {
      selectedCompareIds.push(propertyId);
      if (typeof property === "object") {
        selectedCompareCache[propertyId] = property;
      }
      toast.success(I18N.translate("compare.added"));
    }
  } else {
    if (idx !== -1) {
      selectedCompareIds.splice(idx, 1);
      delete selectedCompareCache[propertyId];
      toast.info(I18N.translate("compare.removed"));
    }
  }
  // Sync all checkboxes on the page for this property
  document.querySelectorAll(`.property-card__compare input[value="${propertyId}"]`).forEach(input => {
    input.checked = isChecked;
  });
  updateCompareBar();
}

function updateCompareBar() {
  if (!compareBar) return;
  if (selectedCompareIds.length === 0) {
    compareBar.hidden = true;
    return;
  }

  compareBar.hidden = false;
  if (compareCount) compareCount.textContent = selectedCompareIds.length;

  if (compareThumbnails) {
    compareThumbnails.innerHTML = "";
    selectedCompareIds.forEach(id => {
      const p = selectedCompareCache[id] || availableProperties.find(item => item.id === id);
      if (!p) return;

      const thumb = document.createElement("div");
      thumb.className = "compare-bar__thumb";

      const img = document.createElement("img");
      img.src = p.imageUrl || (Array.isArray(p.images) ? p.images[0] : "");
      img.alt = "";
      thumb.appendChild(img);

      const removeBtn = document.createElement("button");
      removeBtn.className = "compare-bar__thumb-remove";
      removeBtn.innerHTML = "×";
      removeBtn.addEventListener("click", () => {
        toggleCompareProperty(p, false);
      });
      thumb.appendChild(removeBtn);

      compareThumbnails.appendChild(thumb);
    });
  }
}

function clearCompareSelection() {
  selectedCompareIds = [];
  selectedCompareCache = {};
  document.querySelectorAll(".property-card__compare input").forEach(input => {
    input.checked = false;
  });
  updateCompareBar();
}

function openComparison() {
  if (!compareDialog) return;
  const table = compareDialog.querySelector("[data-compare-table]");
  if (!table) return;

  table.innerHTML = "";

  const properties = selectedCompareIds
    .map(id => selectedCompareCache[id] || availableProperties.find(p => p.id === id))
    .filter(Boolean);

  if (!properties.length) return;

  // Title / Image Row
  const r1 = document.createElement("tr");
  r1.appendChild(createTextElement("th", "", I18N.translate("details.title")));
  properties.forEach(p => {
    const td = document.createElement("td");
    td.className = "compare-table__header-cell";
    td.innerHTML = `
      <div class="compare-table__header-card">
        <div class="compare-table__header-img">
          <img src="${p.imageUrl || (Array.isArray(p.images) ? p.images[0] : '')}" alt="">
        </div>
        <h4 class="compare-table__header-title">${p.title}</h4>
        <p class="compare-table__header-loc">${p.location}</p>
      </div>
    `;
    r1.appendChild(td);
  });
  table.appendChild(r1);

  // Price Row
  const r2 = document.createElement("tr");
  const priceLabel = I18N.translate("filter.price.minLabel").split(",")[0] || "Price";
  r2.appendChild(createTextElement("th", "", priceLabel));
  properties.forEach(p => {
    const td = document.createElement("td");
    td.style.fontWeight = "700";
    td.style.color = "var(--forest)";
    td.textContent = fmtPrice(p.askingPriceUsd);
    r2.appendChild(td);
  });
  table.appendChild(r2);

  // Price per SqM Row
  const r3 = document.createElement("tr");
  const psqmLabel = I18N.translate("card.pricePerSqMShort").replace("{price}", "").trim() || "Price / m²";
  r3.appendChild(createTextElement("th", "", psqmLabel));
  properties.forEach(p => {
    const td = document.createElement("td");
    if (p.askingPriceUsd && p.areaSqM) {
      const perSqm = Math.round(p.askingPriceUsd / p.areaSqM);
      td.textContent = fmtPrice(perSqm);
    } else {
      td.textContent = "—";
    }
    r3.appendChild(td);
  });
  table.appendChild(r3);

  // Area Row
  const r4 = document.createElement("tr");
  const areaLabel = I18N.translate("card.area").replace("{n}", "").trim() || "Area";
  r4.appendChild(createTextElement("th", "", areaLabel));
  properties.forEach(p => {
    const td = document.createElement("td");
    td.textContent = fmtArea(p.areaSqM);
    r4.appendChild(td);
  });
  table.appendChild(r4);

  // Bedrooms Row
  const r5 = document.createElement("tr");
  r5.appendChild(createTextElement("th", "", I18N.translate("card.bedrooms")));
  properties.forEach(p => {
    const td = document.createElement("td");
    td.textContent = p.bedrooms;
    r5.appendChild(td);
  });
  table.appendChild(r5);

  // Bathrooms Row
  const r6 = document.createElement("tr");
  r6.appendChild(createTextElement("th", "", I18N.translate("card.bathrooms")));
  properties.forEach(p => {
    const td = document.createElement("td");
    td.textContent = p.bathrooms;
    r6.appendChild(td);
  });
  table.appendChild(r6);

  // Year Built Row
  const r7 = document.createElement("tr");
  r7.appendChild(createTextElement("th", "", I18N.translate("card.yearBuilt")));
  properties.forEach(p => {
    const td = document.createElement("td");
    td.textContent = p.yearBuilt || "—";
    r7.appendChild(td);
  });
  table.appendChild(r7);

  // Parking Row
  const r8 = document.createElement("tr");
  r8.appendChild(createTextElement("th", "", I18N.translate("card.parking")));
  properties.forEach(p => {
    const td = document.createElement("td");
    td.textContent = p.parking !== null && p.parking !== undefined ? p.parking : "—";
    r8.appendChild(td);
  });
  table.appendChild(r8);

  // Features Row
  const r9 = document.createElement("tr");
  r9.appendChild(createTextElement("th", "", I18N.translate("card.features")));
  properties.forEach(p => {
    const td = document.createElement("td");
    const ul = document.createElement("ul");
    ul.className = "compare-table__feature-list";
    const feats = Array.isArray(p.features) ? p.features : [];
    if (feats.length) {
      feats.forEach(f => {
        const li = document.createElement("li");
        li.className = "compare-table__feature-tag";
        li.textContent = f;
        ul.appendChild(li);
      });
    } else {
      ul.textContent = "—";
    }
    td.appendChild(ul);
    r9.appendChild(td);
  });
  table.appendChild(r9);

  // Actions Row
  const r10 = document.createElement("tr");
  r10.appendChild(createTextElement("th", "", ""));
  properties.forEach(p => {
    const td = document.createElement("td");
    td.className = "compare-table__actions";

    const inq = document.createElement("button");
    inq.className = "button button--dark button--full";
    inq.textContent = I18N.translate("card.cta.inquire");
    inq.onclick = () => {
      compareDialog.close();
      setTimeout(() => {
        openInquiry({ dataset: { propertyId: p.id } });
      }, 150);
    };
    td.appendChild(inq);

    if (p.tourType && p.tourType !== "NONE" && p.tourUrl) {
      const tour = document.createElement("button");
      tour.className = "button button--outline button--full";
      tour.textContent = tourTypeLabel(p.tourType);
      tour.onclick = () => {
        compareDialog.close();
        setTimeout(() => {
          openTour(p.id);
        }, 150);
      };
      td.appendChild(tour);
    }
    r10.appendChild(td);
  });
  table.appendChild(r10);

  compareDialog.showModal();
}

// ----- Locale change handling -----

document.addEventListener("locale:change", () => {
  // Re-render the catalog (cards carry formatted prices + translated pills),
  // re-populate the dropdown, and update the live listing summary.
  if (availableProperties.length) {
    withViewTransition(() => {
      catalog?.replaceChildren(...availableProperties.map(createPropertyCard));
    });
    catalog?.setAttribute("aria-busy", "false");
    populatePropertySelect(availableProperties);
    if (listingCount) {
      const totalItems = availableProperties.length;
      listingCount.textContent = formatListingSummary(availableProperties.length, totalItems);
    }
    updateCompareBar();
  } else {
    // Restore the loading placeholder text in the right locale
    if (listingCount) listingCount.textContent = I18N.translate("catalog.loading");
  }
});

// ----- Bootstrap -----

configureNavigation();
configureHeaderScroll();
configureActiveNavHighlight();
configureSmoothScroll();
configureDialogPolish();
observeMotionElements();
primeHero();
loadProperties();
