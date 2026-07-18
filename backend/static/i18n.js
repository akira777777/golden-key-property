/* ============================================================
   i18n — Golden Key
   Static translations for the property catalogue.
   Languages: ru, en, de, es.
   Defaults: ru. Persisted to localStorage as `gk.locale`.
   ============================================================ */

const SUPPORTED_LOCALES = ["ru", "en", "de", "es"];
const LOCALE_STORAGE_KEY = "gk.locale";
const FALLBACK_LOCALE = "ru";

const LOCALE_LABELS = {
  ru: "Русский",
  en: "English",
  de: "Deutsch",
  es: "Español",
};

const LOCALE_TO_HTML = {
  ru: "ru",
  en: "en",
  de: "de",
  es: "es",
};

const LOCALE_TO_BCP47 = {
  ru: "ru-RU",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
};

// Per-locale number / currency formatting. USD is the display currency;
// the locale only changes the formatting (decimal/grouping/symbol placement).
const CURRENCY_FORMATTERS = {};
function getCurrencyFormatter(locale) {
  if (!CURRENCY_FORMATTERS[locale]) {
    try {
      CURRENCY_FORMATTERS[locale] = new Intl.NumberFormat(LOCALE_TO_BCP47[locale] || locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
    } catch {
      CURRENCY_FORMATTERS[locale] = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
    }
  }
  return CURRENCY_FORMATTERS[locale];
}

const NUMBER_FORMATTERS = {};
function getNumberFormatter(locale) {
  if (!NUMBER_FORMATTERS[locale]) {
    try {
      NUMBER_FORMATTERS[locale] = new Intl.NumberFormat(LOCALE_TO_BCP47[locale] || locale, {
        maximumFractionDigits: 0,
      });
    } catch {
      NUMBER_FORMATTERS[locale] = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
    }
  }
  return NUMBER_FORMATTERS[locale];
}

// ============================================================
//  Translation dictionaries
// ============================================================

const TRANSLATIONS = {
  ru: {
    "meta.title": "Golden Key — избранная недвижимость",
    "meta.description":
      "Golden Key — международная недвижимость с персональным подбором и прозрачным сопровождением сделки.",
    "a11y.skip": "Перейти к содержанию",

    "nav.catalog": "Объекты",
    "nav.approach": "Подход",
    "nav.partners": "Партнёрам",
    "nav.menu.label": "Меню",
    "nav.menu.open": "Открыть навигацию",
    "nav.menu.close": "Закрыть навигацию",
    "header.cta": "Запросить подбор",

    "hero.eyebrow": "International property advisory",
    "hero.title.a": "Недвижимость, которая",
    "hero.title.b": "ощущается",
    "hero.title.c": "как верное решение.",
    "hero.lead":
      "Тщательно отобранные объекты в знаковых локациях и персональное сопровождение, в котором понятен каждый следующий шаг.",
    "hero.cta.primary": "Подобрать объект",
    "hero.cta.secondary": "Смотреть предложения",
    "hero.pillars.1": "Частный подбор",
    "hero.pillars.2": "Проверяемая информация",
    "hero.pillars.3": "Сопровождение без лишнего шума",

    "intro.label": "Не каталог ради каталога",
    "intro.kicker": "Golden Key Property",
    "intro.title.a": "Сначала понимаем ваш ритм жизни.",
    "intro.title.b": "Затем",
    "intro.title.c": "открываем нужные двери.",
    "intro.body":
      "Мы работаем с ограниченным числом запросов одновременно: так консультант остаётся в контексте, а рекомендации не превращаются в поток ссылок.",
    "intro.cta": "Как устроен подбор",

    "catalog.eyebrow": "Selected listings",
    "catalog.title.a": "Выберите пространство,",
    "catalog.title.b": "к которому",
    "catalog.title.c": "хочется вернуться.",
    "catalog.loading": "Загружаем предложения…",
    "catalog.cta": "Запросить персональный подбор",
    "catalog.noscript":
      "Для отображения каталога включите JavaScript или используйте API напрямую.",
    "catalog.similar.empty":
      "Похожих объектов пока нет. Попробуйте оставить персональный запрос.",
    "catalog.similar.unavailable": "Похожих объектов временно недоступен.",
    "catalog.similar.unavailableShort": "Похожих объектов временно недоступны.",
    "catalog.empty":
      "По выбранным фильтрам ничего не найдено. Измените параметры или оставьте персональный запрос.",
    "catalog.unavailable":
      "Не удалось загрузить каталог. Обновите страницу или попробуйте позже.",
    "catalog.unavailableShort": "Каталог временно недоступен.",
    "catalog.priceError": "Проверьте диапазон цены.",

    "filter.location.label": "Локация",
    "filter.location.placeholder": "Город, район или страна",
    "filter.price.minLabel": "Цена от, USD",
    "filter.price.maxLabel": "Цена до, USD",
    "filter.status.label": "Статус",
    "filter.status.active": "Доступные",
    "filter.status.pending": "На согласовании",
    "filter.status.sold": "Проданные",
    "filter.apply": "Показать",
    "filter.reset": "Сбросить",
    "filter.rangeError": "Минимальная цена не может быть выше максимальной.",

    "approach.label": "Путь к объекту",
    "approach.kicker": "From brief to keys",
    "approach.title.a": "Собранный процесс,",
    "approach.title.b": "который",
    "approach.title.c": "оставляет место для личного.",
    "approach.step1.title": "Понимаем задачу",
    "approach.step1.body":
      "Обсуждаем локацию, сценарии жизни, сроки и то, что для вас не подлежит компромиссу.",
    "approach.step2.title": "Сужаем выбор",
    "approach.step2.body":
      "Показываем релевантные варианты и помогаем сравнить их на языке реальных решений.",
    "approach.step3.title": "Двигаемся уверенно",
    "approach.step3.body":
      "Координируем контакт с агентом и напоминаем, какие сведения нужно подтвердить до сделки.",

    "partners.eyebrow": "For partners",
    "partners.title.a": "Для тех, кто ценит сдержанную работу",
    "partners.title.b": "с сильными",
    "partners.title.c": "объектами.",
    "partners.body":
      "Если вы представляете семейный офис, девелоперскую команду или профессионального партнёра, начните с вводной беседы о критериях отбора и формате взаимодействия.",
    "partners.cta": "Изучить подборку",
    "partners.notice":
      "Сайт не предлагает финансовые продукты, не принимает переводы и не гарантирует доходность. Любые решения требуют независимой проверки и профессиональной консультации.",

    "contact.eyebrow": "Start with a conversation",
    "contact.title.a": "Расскажите, какой",
    "contact.title.b": "дом",
    "contact.title.c": "вы ищете.",
    "contact.cta": "Оставить запрос",

    "footer.tagline": "International property advisory",
    "footer.legal":
      "Информация по объектам носит ознакомительный характер и требует проверки у агента и владельца.",

    "inquiry.eyebrow": "Private enquiry",
    "inquiry.title": "Начнём с нескольких деталей.",
    "inquiry.intro":
      "Консультант свяжется только по вашему запросу и только по выбранному объекту.",
    "inquiry.field.property": "Объект",
    "inquiry.field.propertyLoading": "Загружаем объекты…",
    "inquiry.field.name": "Имя и фамилия",
    "inquiry.field.email": "Email",
    "inquiry.field.phone": "Телефон",
    "inquiry.field.optional": "(необязательно)",
    "inquiry.field.message": "О чём вы хотите поговорить?",
    "inquiry.field.consent": "Я согласен(-на), чтобы со мной связались по этому запросу.",
    "inquiry.submit": "Отправить запрос",
    "inquiry.note":
      "Не отправляйте через форму документы, платёжные данные или конфиденциальную информацию.",
    "inquiry.sending": "Отправляем запрос…",
    "inquiry.success": "Запрос отправлен.",
    "inquiry.error": "Не удалось отправить запрос. Попробуйте ещё раз.",

    "tour.eyebrow": "Virtual tour",
    "tour.title": "3D-прогулка",
    "tour.loading": "Загружаем 3D-прогулку…",
    "tour.notFound": "Для этого объекта пока нет виртуальной прогулки.",
    "tour.error": "Не удалось загрузить тур. Попробуйте позже.",
    "tour.modelHint":
      "Перетаскивайте мышью, чтобы осмотреться. Используйте колёсико для приближения.",

    "card.status.active": "Доступен",
    "card.status.pending": "На согласовании",
    "card.status.sold": "Продан",
    "card.status.fallback": "По запросу",
    "card.bedrooms": "Спальни",
    "card.bathrooms": "Санузлы",
    "card.area": "{n} м²",
    "card.price": "{price}",
    "card.pricePerSqM": "{price} / м²",
    "card.pricePerSqMShort": "{price}/м²",
    "card.cta.inquire": "Узнать больше",
    "card.cta.similar": "Найти похожее",
    "card.cta.tour360": "Панорамный тур 360°",
    "card.cta.tour3d": "3D-модель объекта",
    "card.cta.tourVideo": "3D-видео прогулка",
    "card.cta.tourFallback": "3D-тур",
    "card.aria.inquire": "Запросить информацию об объекте «{title}»",
    "card.aria.similar": "Найти похожие объекты к «{title}»",
    "card.aria.tour": "{tourType} для «{title}»",

    "summary.total": "{total} {word} {availability} для персонального подбора.",
    "summary.shown": "Показано: {shown} из {total}.",
    "summary.empty": "По выбранным фильтрам нет объектов.",
    "summary.similar": "{count} {word}.",

    "word.object.0": "объект",
    "word.object.1": "объекта",
    "word.object.2": "объектов",
    "word.similar.0": "похожий объект",
    "word.similar.1": "похожих объекта",
    "word.similar.2": "похожих объектов",
    "word.availability.singular": "доступен",
    "word.availability.plural": "доступны",

    "map.title": "Объекты на карте",
    "map.viewProperty": "Смотреть объект",
    "map.openInMaps": "Открыть в Google Maps",

    "gallery.open": "Открыть галерею",
    "gallery.close": "Закрыть",
    "gallery.prev": "Предыдущее фото",
    "gallery.next": "Следующее фото",
    "gallery.counter": "{current} из {total}",

    "card.yearBuilt": "Год постройки",
    "card.parking": "Парковка",
    "card.features": "Особенности",
    "card.photos": "Фото ({count})",
  },

  en: {
    "meta.title": "Golden Key — curated property",
    "meta.description":
      "Golden Key — international property with a personal shortlist and transparent deal support.",
    "a11y.skip": "Skip to main content",

    "nav.catalog": "Listings",
    "nav.approach": "Approach",
    "nav.partners": "Partners",
    "nav.menu.label": "Menu",
    "nav.menu.open": "Open navigation",
    "nav.menu.close": "Close navigation",
    "header.cta": "Request a shortlist",

    "hero.eyebrow": "International property advisory",
    "hero.title.a": "Property that",
    "hero.title.b": "feels like",
    "hero.title.c": "the right decision.",
    "hero.lead":
      "Hand-picked homes in iconic locations and personal guidance where the next step is always clear.",
    "hero.cta.primary": "Find a home",
    "hero.cta.secondary": "See listings",
    "hero.pillars.1": "Private shortlist",
    "hero.pillars.2": "Verifiable facts",
    "hero.pillars.3": "Quiet, thorough support",

    "intro.label": "Not a catalogue for catalogue's sake",
    "intro.kicker": "Golden Key Property",
    "intro.title.a": "First we understand your rhythm.",
    "intro.title.b": "Then",
    "intro.title.c": "we open the right doors.",
    "intro.body":
      "We work with a limited number of inquiries at once, so your consultant stays close to the brief and the recommendations stay focused, not noisy.",
    "intro.cta": "How the shortlist works",

    "catalog.eyebrow": "Selected listings",
    "catalog.title.a": "Pick a space you",
    "catalog.title.b": "want to come back",
    "catalog.title.c": "to.",
    "catalog.loading": "Loading listings…",
    "catalog.cta": "Request a personal shortlist",
    "catalog.noscript":
      "Enable JavaScript to browse the catalogue or call the API directly.",
    "catalog.similar.empty":
      "No similar listings yet. Try leaving a personal inquiry.",
    "catalog.similar.unavailable": "Similar listings temporarily unavailable.",
    "catalog.similar.unavailableShort": "Similar listings temporarily unavailable.",
    "catalog.empty":
      "Nothing matches your filters. Adjust the parameters or leave a personal inquiry.",
    "catalog.unavailable":
      "Could not load the catalogue. Refresh the page or try again later.",
    "catalog.unavailableShort": "Catalogue temporarily unavailable.",
    "catalog.priceError": "Please check the price range.",

    "filter.location.label": "Location",
    "filter.location.placeholder": "City, district or country",
    "filter.price.minLabel": "Price from, USD",
    "filter.price.maxLabel": "Price to, USD",
    "filter.status.label": "Status",
    "filter.status.active": "Available",
    "filter.status.pending": "In negotiation",
    "filter.status.sold": "Sold",
    "filter.apply": "Apply",
    "filter.reset": "Reset",
    "filter.rangeError": "Minimum price cannot exceed maximum price.",

    "approach.label": "Path to a home",
    "approach.kicker": "From brief to keys",
    "approach.title.a": "A structured process that",
    "approach.title.b": "leaves room",
    "approach.title.c": "for the personal.",
    "approach.step1.title": "Understand the brief",
    "approach.step1.body":
      "We discuss location, lifestyle scenarios, timing and what is non-negotiable for you.",
    "approach.step2.title": "Narrow the choice",
    "approach.step2.body":
      "We surface relevant options and help you compare them in the language of real decisions.",
    "approach.step3.title": "Move forward with confidence",
    "approach.step3.body":
      "We coordinate with the listing agent and remind you which facts to verify before completion.",

    "partners.eyebrow": "For partners",
    "partners.title.a": "For those who value quiet work",
    "partners.title.b": "with strong",
    "partners.title.c": "listings.",
    "partners.body":
      "If you represent a family office, a development team or an institutional partner, begin with a short conversation about selection criteria and how we collaborate.",
    "partners.cta": "Browse the selection",
    "partners.notice":
      "This site does not offer financial products, accept transfers or guarantee returns. Any decision requires independent verification and professional advice.",

    "contact.eyebrow": "Start with a conversation",
    "contact.title.a": "Tell us the",
    "contact.title.b": "home",
    "contact.title.c": "you are looking for.",
    "contact.cta": "Leave an inquiry",

    "footer.tagline": "International property advisory",
    "footer.legal":
      "Listing information is illustrative and must be verified with the agent and owner.",

    "inquiry.eyebrow": "Private enquiry",
    "inquiry.title": "Let's start with a few details.",
    "inquiry.intro":
      "A consultant will follow up only on your request and only on the selected listing.",
    "inquiry.field.property": "Property",
    "inquiry.field.propertyLoading": "Loading listings…",
    "inquiry.field.name": "Full name",
    "inquiry.field.email": "Email",
    "inquiry.field.phone": "Phone",
    "inquiry.field.optional": "(optional)",
    "inquiry.field.message": "What would you like to discuss?",
    "inquiry.field.consent": "I agree to be contacted about this inquiry.",
    "inquiry.submit": "Submit inquiry",
    "inquiry.note":
      "Do not send documents, payment details or confidential information through this form.",
    "inquiry.sending": "Sending…",
    "inquiry.success": "Inquiry sent.",
    "inquiry.error": "Could not send your inquiry. Please try again.",

    "tour.eyebrow": "Virtual tour",
    "tour.title": "3D walkthrough",
    "tour.loading": "Loading 3D walkthrough…",
    "tour.notFound": "No virtual walkthrough is available for this listing yet.",
    "tour.error": "Could not load the tour. Please try again later.",
    "tour.modelHint":
      "Drag to look around. Use the mouse wheel to zoom in.",

    "card.status.active": "Available",
    "card.status.pending": "In negotiation",
    "card.status.sold": "Sold",
    "card.status.fallback": "By request",
    "card.bedrooms": "Bedrooms",
    "card.bathrooms": "Bathrooms",
    "card.area": "{n} m²",
    "card.price": "{price}",
    "card.pricePerSqM": "{price} / m²",
    "card.pricePerSqMShort": "{price}/m²",
    "card.cta.inquire": "Learn more",
    "card.cta.similar": "Find similar",
    "card.cta.tour360": "360° panorama",
    "card.cta.tour3d": "3D model",
    "card.cta.tourVideo": "3D video walk",
    "card.cta.tourFallback": "3D tour",
    "card.aria.inquire": "Request information about «{title}»",
    "card.aria.similar": "Find similar listings to «{title}»",
    "card.aria.tour": "{tourType} for «{title}»",

    "summary.total": "{total} {word} {availability} for a personal shortlist.",
    "summary.shown": "Showing {shown} of {total}.",
    "summary.empty": "No listings match these filters.",
    "summary.similar": "{count} {word}.",

    "word.object.0": "listing",
    "word.object.1": "listings",
    "word.object.2": "listings",
    "word.similar.0": "similar listing",
    "word.similar.1": "similar listings",
    "word.similar.2": "similar listings",
    "word.availability.singular": "available",
    "word.availability.plural": "available",

    "map.title": "Listings on the map",
    "map.viewProperty": "View property",
    "map.openInMaps": "Open in Google Maps",

    "gallery.open": "Open gallery",
    "gallery.close": "Close",
    "gallery.prev": "Previous photo",
    "gallery.next": "Next photo",
    "gallery.counter": "{current} of {total}",

    "card.yearBuilt": "Year built",
    "card.parking": "Parking",
    "card.features": "Features",
    "card.photos": "Photos ({count})",
  },

  de: {
    "meta.title": "Golden Key — kuratierte Immobilien",
    "meta.description":
      "Golden Key — internationale Immobilien mit persönlicher Auswahl und transparenter Begleitung bis zum Abschluss.",
    "a11y.skip": "Zum Inhalt springen",

    "nav.catalog": "Objekte",
    "nav.approach": "Vorgehen",
    "nav.partners": "Partner",
    "nav.menu.label": "Menü",
    "nav.menu.open": "Navigation öffnen",
    "nav.menu.close": "Navigation schließen",
    "header.cta": "Auswahl anfragen",

    "hero.eyebrow": "International property advisory",
    "hero.title.a": "Immobilien, die sich",
    "hero.title.b": "richtig",
    "hero.title.c": "anfühlen.",
    "hero.lead":
      "Ausgewählte Objekte in ikonischen Lagen und persönliche Begleitung, in der jeder nächste Schritt klar ist.",
    "hero.cta.primary": "Objekt finden",
    "hero.cta.secondary": "Auswahl ansehen",
    "hero.pillars.1": "Private Auswahl",
    "hero.pillars.2": "Überprüfbare Fakten",
    "hero.pillars.3": "Stille, gründliche Begleitung",

    "intro.label": "Kein Katalog um des Katalogs willen",
    "intro.kicker": "Golden Key Property",
    "intro.title.a": "Zuerst verstehen wir Ihren Rhythmus.",
    "intro.title.b": "Dann",
    "intro.title.c": "öffnen wir die richtigen Türen.",
    "intro.body":
      "Wir betreuen nur eine begrenzte Anzahl von Anfragen gleichzeitig — so bleibt Ihre Beraterin im Kontext und die Empfehlungen fokussiert, nicht laut.",
    "intro.cta": "So funktioniert die Auswahl",

    "catalog.eyebrow": "Selected listings",
    "catalog.title.a": "Wählen Sie einen Ort, zu dem Sie",
    "catalog.title.b": "gerne zurück",
    "catalog.title.c": "kehren.",
    "catalog.loading": "Angebote werden geladen…",
    "catalog.cta": "Persönliche Auswahl anfragen",
    "catalog.noscript":
      "Aktivieren Sie JavaScript, um den Katalog anzuzeigen, oder nutzen Sie die API direkt.",
    "catalog.similar.empty":
      "Noch keine ähnlichen Objekte. Versuchen Sie eine persönliche Anfrage.",
    "catalog.similar.unavailable": "Ähnliche Objekte vorübergehend nicht verfügbar.",
    "catalog.similar.unavailableShort": "Ähnliche Objekte vorübergehend nicht verfügbar.",
    "catalog.empty":
      "Keine Treffer für die gewählten Filter. Passen Sie die Parameter an oder stellen Sie eine persönliche Anfrage.",
    "catalog.unavailable":
      "Der Katalog konnte nicht geladen werden. Aktualisieren Sie die Seite oder versuchen Sie es später.",
    "catalog.unavailableShort": "Katalog vorübergehend nicht verfügbar.",
    "catalog.priceError": "Bitte überprüfen Sie das Preisfenster.",

    "filter.location.label": "Lage",
    "filter.location.placeholder": "Stadt, Bezirk oder Land",
    "filter.price.minLabel": "Preis ab, USD",
    "filter.price.maxLabel": "Preis bis, USD",
    "filter.status.label": "Status",
    "filter.status.active": "Verfügbar",
    "filter.status.pending": "In Verhandlung",
    "filter.status.sold": "Verkauft",
    "filter.apply": "Anwenden",
    "filter.reset": "Zurücksetzen",
    "filter.rangeError": "Der Mindestpreis darf den Höchstpreis nicht übersteigen.",

    "approach.label": "Weg zum Objekt",
    "approach.kicker": "From brief to keys",
    "approach.title.a": "Ein klarer Prozess, der",
    "approach.title.b": "Raum lässt",
    "approach.title.c": "für Persönliches.",
    "approach.step1.title": "Auftrag verstehen",
    "approach.step1.body":
      "Wir besprechen Lage, Lebensstil, Zeitrahmen und das, was für Sie nicht verhandelbar ist.",
    "approach.step2.title": "Auswahl eingrenzen",
    "approach.step2.body":
      "Wir zeigen relevante Optionen und helfen, sie in der Sprache echter Entscheidungen zu vergleichen.",
    "approach.step3.title": "Sicher vorangehen",
    "approach.step3.body":
      "Wir koordinieren den Kontakt zum Makler und erinnern an Fakten, die vor dem Abschluss zu prüfen sind.",

    "partners.eyebrow": "For partners",
    "partners.title.a": "Für alle, die leise Arbeit mit",
    "partners.title.b": "starken",
    "partners.title.c": "Objekten schätzen.",
    "partners.body":
      "Wenn Sie ein Family Office, ein Entwicklerteam oder einen institutionellen Partner vertreten, beginnen Sie mit einem kurzen Gespräch zu Auswahlkriterien und Zusammenarbeit.",
    "partners.cta": "Auswahl ansehen",
    "partners.notice":
      "Diese Website bietet keine Finanzprodukte an, nimmt keine Überweisungen entgegen und garantiert keine Rendite. Jede Entscheidung erfordert unabhängige Prüfung und professionelle Beratung.",

    "contact.eyebrow": "Start with a conversation",
    "contact.title.a": "Erzählen Sie uns, welches",
    "contact.title.b": "Zuhause",
    "contact.title.c": "Sie suchen.",
    "contact.cta": "Anfrage stellen",

    "footer.tagline": "International property advisory",
    "footer.legal":
      "Die Objektinformationen sind illustrativ und müssen mit Makler und Eigentümer verifiziert werden.",

    "inquiry.eyebrow": "Private enquiry",
    "inquiry.title": "Beginnen wir mit wenigen Details.",
    "inquiry.intro":
      "Eine Beraterin meldet sich ausschließlich zu Ihrer Anfrage und zum ausgewählten Objekt.",
    "inquiry.field.property": "Objekt",
    "inquiry.field.propertyLoading": "Objekte werden geladen…",
    "inquiry.field.name": "Vor- und Nachname",
    "inquiry.field.email": "E-Mail",
    "inquiry.field.phone": "Telefon",
    "inquiry.field.optional": "(optional)",
    "inquiry.field.message": "Worüber möchten Sie sprechen?",
    "inquiry.field.consent":
      "Ich stimme zu, zu dieser Anfrage kontaktiert zu werden.",
    "inquiry.submit": "Anfrage senden",
    "inquiry.note":
      "Senden Sie keine Dokumente, Zahlungsdaten oder vertrauliche Informationen über dieses Formular.",
    "inquiry.sending": "Wird gesendet…",
    "inquiry.success": "Anfrage gesendet.",
    "inquiry.error":
      "Anfrage konnte nicht gesendet werden. Bitte erneut versuchen.",

    "tour.eyebrow": "Virtual tour",
    "tour.title": "3D-Rundgang",
    "tour.loading": "3D-Rundgang wird geladen…",
    "tour.notFound": "Für dieses Objekt ist noch kein virtueller Rundgang verfügbar.",
    "tour.error": "Der Rundgang konnte nicht geladen werden. Bitte später erneut versuchen.",
    "tour.modelHint":
      "Ziehen Sie mit der Maus, um sich umzusehen. Mit dem Mausrad zoomen.",

    "card.status.active": "Verfügbar",
    "card.status.pending": "In Verhandlung",
    "card.status.sold": "Verkauft",
    "card.status.fallback": "Auf Anfrage",
    "card.bedrooms": "Schlafzimmer",
    "card.bathrooms": "Bäder",
    "card.area": "{n} m²",
    "card.price": "{price}",
    "card.pricePerSqM": "{price} / m²",
    "card.pricePerSqMShort": "{price}/m²",
    "card.cta.inquire": "Mehr erfahren",
    "card.cta.similar": "Ähnliches finden",
    "card.cta.tour360": "360°-Panorama",
    "card.cta.tour3d": "3D-Modell",
    "card.cta.tourVideo": "3D-Videorundgang",
    "card.cta.tourFallback": "3D-Tour",
    "card.aria.inquire": "Informationen zu «{title}» anfragen",
    "card.aria.similar": "Ähnliche Objekte zu «{title}» finden",
    "card.aria.tour": "{tourType} für «{title}»",

    "summary.total": "{total} {word} {availability} für eine persönliche Auswahl.",
    "summary.shown": "Angezeigt: {shown} von {total}.",
    "summary.empty": "Keine Objekte entsprechen diesen Filtern.",
    "summary.similar": "{count} {word}.",

    "word.object.0": "Objekt",
    "word.object.1": "Objekte",
    "word.object.2": "Objekte",
    "word.similar.0": "ähnliches Objekt",
    "word.similar.1": "ähnliche Objekte",
    "word.similar.2": "ähnliche Objekte",
    "word.availability.singular": "verfügbar",
    "word.availability.plural": "verfügbar",

    "map.title": "Objekte auf der Karte",
    "map.viewProperty": "Objekt ansehen",
    "map.openInMaps": "In Google Maps öffnen",

    "gallery.open": "Galerie öffnen",
    "gallery.close": "Schließen",
    "gallery.prev": "Vorheriges Foto",
    "gallery.next": "Nächstes Foto",
    "gallery.counter": "{current} von {total}",

    "card.yearBuilt": "Baujahr",
    "card.parking": "Stellplätze",
    "card.features": "Ausstattung",
    "card.photos": "Fotos ({count})",
  },

  es: {
    "meta.title": "Golden Key — propiedades seleccionadas",
    "meta.description":
      "Golden Key — propiedad internacional con selección personal y acompañamiento transparente hasta el cierre.",
    "a11y.skip": "Saltar al contenido",

    "nav.catalog": "Propiedades",
    "nav.approach": "Enfoque",
    "nav.partners": "Aliados",
    "nav.menu.label": "Menú",
    "nav.menu.open": "Abrir navegación",
    "nav.menu.close": "Cerrar navegación",
    "header.cta": "Pedir selección",

    "hero.eyebrow": "International property advisory",
    "hero.title.a": "Propiedades que se sienten como",
    "hero.title.b": "la decisión",
    "hero.title.c": "correcta.",
    "hero.lead":
      "Propiedades seleccionadas en ubicaciones emblemáticas y un acompañamiento personal donde cada paso siguiente es claro.",
    "hero.cta.primary": "Encontrar una propiedad",
    "hero.cta.secondary": "Ver selección",
    "hero.pillars.1": "Selección privada",
    "hero.pillars.2": "Datos verificables",
    "hero.pillars.3": "Acompañamiento sobrio",

    "intro.label": "No un catálogo por el catálogo",
    "intro.kicker": "Golden Key Property",
    "intro.title.a": "Primero entendemos su ritmo.",
    "intro.title.b": "Después",
    "intro.title.c": "abrimos las puertas correctas.",
    "intro.body":
      "Trabajamos con un número limitado de consultas a la vez: así el asesor se mantiene cerca de su brief y las recomendaciones no se convierten en una lista ruidosa.",
    "intro.cta": "Cómo funciona la selección",

    "catalog.eyebrow": "Selected listings",
    "catalog.title.a": "Elija un espacio al que",
    "catalog.title.b": "quiera volver",
    "catalog.title.c": "una y otra vez.",
    "catalog.loading": "Cargando selección…",
    "catalog.cta": "Pedir una selección personal",
    "catalog.noscript":
      "Active JavaScript para ver el catálogo o use la API directamente.",
    "catalog.similar.empty":
      "Aún no hay propiedades similares. Deje una consulta personal.",
    "catalog.similar.unavailable": "Propiedades similares no disponibles temporalmente.",
    "catalog.similar.unavailableShort": "Propiedades similares no disponibles temporalmente.",
    "catalog.empty":
      "No hay coincidencias con sus filtros. Cambie los parámetros o deje una consulta personal.",
    "catalog.unavailable":
      "No se pudo cargar el catálogo. Actualice la página o inténtelo más tarde.",
    "catalog.unavailableShort": "Catálogo no disponible temporalmente.",
    "catalog.priceError": "Revise el rango de precios.",

    "filter.location.label": "Ubicación",
    "filter.location.placeholder": "Ciudad, zona o país",
    "filter.price.minLabel": "Precio desde, USD",
    "filter.price.maxLabel": "Precio hasta, USD",
    "filter.status.label": "Estado",
    "filter.status.active": "Disponibles",
    "filter.status.pending": "En negociación",
    "filter.status.sold": "Vendidas",
    "filter.apply": "Aplicar",
    "filter.reset": "Restablecer",
    "filter.rangeError": "El precio mínimo no puede superar al máximo.",

    "approach.label": "Camino a la propiedad",
    "approach.kicker": "From brief to keys",
    "approach.title.a": "Un proceso estructurado",
    "approach.title.b": "que deja espacio",
    "approach.title.c": "para lo personal.",
    "approach.step1.title": "Entender el brief",
    "approach.step1.body":
      "Hablamos de ubicación, estilo de vida, plazos y lo que para usted no es negociable.",
    "approach.step2.title": "Acotar la selección",
    "approach.step2.body":
      "Mostramos opciones relevantes y ayudamos a compararlas en el idioma de decisiones reales.",
    "approach.step3.title": "Avanzar con confianza",
    "approach.step3.body":
      "Coordinamos el contacto con el agente y recordamos qué datos verificar antes del cierre.",

    "partners.eyebrow": "For partners",
    "partners.title.a": "Para quienes valoran un trabajo sobrio",
    "partners.title.b": "con propiedades",
    "partners.title.c": "sólidas.",
    "partners.body":
      "Si representa a una family office, a un equipo promotor o a un aliado institucional, empiece con una breve conversación sobre criterios de selección y formato de colaboración.",
    "partners.cta": "Ver la selección",
    "partners.notice":
      "Este sitio no ofrece productos financieros, no recibe transferencias y no garantiza rentabilidad. Toda decisión requiere verificación independiente y asesoramiento profesional.",

    "contact.eyebrow": "Start with a conversation",
    "contact.title.a": "Cuéntenos qué",
    "contact.title.b": "hogar",
    "contact.title.c": "busca.",
    "contact.cta": "Dejar una consulta",

    "footer.tagline": "International property advisory",
    "footer.legal":
      "La información de las propiedades es ilustrativa y debe verificarse con el agente y el propietario.",

    "inquiry.eyebrow": "Private enquiry",
    "inquiry.title": "Empecemos por unos detalles.",
    "inquiry.intro":
      "Un asesor se pondrá en contacto solo por su consulta y solo sobre la propiedad elegida.",
    "inquiry.field.property": "Propiedad",
    "inquiry.field.propertyLoading": "Cargando propiedades…",
    "inquiry.field.name": "Nombre y apellido",
    "inquiry.field.email": "Email",
    "inquiry.field.phone": "Teléfono",
    "inquiry.field.optional": "(opcional)",
    "inquiry.field.message": "¿Sobre qué le gustaría hablar?",
    "inquiry.field.consent": "Acepto que me contacten sobre esta consulta.",
    "inquiry.submit": "Enviar consulta",
    "inquiry.note":
      "No envíe documentos, datos de pago ni información confidencial a través de este formulario.",
    "inquiry.sending": "Enviando…",
    "inquiry.success": "Consulta enviada.",
    "inquiry.error": "No se pudo enviar la consulta. Inténtelo de nuevo.",

    "tour.eyebrow": "Virtual tour",
    "tour.title": "Recorrido 3D",
    "tour.loading": "Cargando recorrido 3D…",
    "tour.notFound": "Aún no hay recorrido virtual para esta propiedad.",
    "tour.error": "No se pudo cargar el recorrido. Inténtelo más tarde.",
    "tour.modelHint":
      "Arrastre con el ratón para mirar alrededor. Use la rueda para acercar.",

    "card.status.active": "Disponible",
    "card.status.pending": "En negociación",
    "card.status.sold": "Vendida",
    "card.status.fallback": "Bajo consulta",
    "card.bedrooms": "Habitaciones",
    "card.bathrooms": "Baños",
    "card.area": "{n} m²",
    "card.price": "{price}",
    "card.pricePerSqM": "{price} / m²",
    "card.pricePerSqMShort": "{price}/m²",
    "card.cta.inquire": "Saber más",
    "card.cta.similar": "Ver similares",
    "card.cta.tour360": "Panorama 360°",
    "card.cta.tour3d": "Modelo 3D",
    "card.cta.tourVideo": "Vídeo 3D",
    "card.cta.tourFallback": "Recorrido 3D",
    "card.aria.inquire": "Pedir información sobre «{title}»",
    "card.aria.similar": "Buscar propiedades similares a «{title}»",
    "card.aria.tour": "{tourType} para «{title}»",

    "summary.total": "{total} {word} {availability} para una selección personal.",
    "summary.shown": "Mostrando {shown} de {total}.",
    "summary.empty": "No hay propiedades que coincidan con estos filtros.",
    "summary.similar": "{count} {word}.",

    "word.object.0": "propiedad",
    "word.object.1": "propiedades",
    "word.object.2": "propiedades",
    "word.similar.0": "propiedad similar",
    "word.similar.1": "propiedades similares",
    "word.similar.2": "propiedades similares",
    "word.availability.singular": "disponible",
    "word.availability.plural": "disponibles",
  },
};

// ============================================================
//  Public API
// ============================================================

let currentLocale = FALLBACK_LOCALE;

function detectInitialLocale() {
  try {
    const stored = window.localStorage?.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    // localStorage may be unavailable (private mode, sandboxed iframes).
  }
  const browser = (navigator.language || "").toLowerCase().slice(0, 2);
  if (SUPPORTED_LOCALES.includes(browser)) return browser;
  return FALLBACK_LOCALE;
}

function persistLocale(locale) {
  try {
    window.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

function translate(key, locale = currentLocale) {
  const dict = TRANSLATIONS[locale] || TRANSLATIONS[FALLBACK_LOCALE];
  return dict[key] ?? TRANSLATIONS[FALLBACK_LOCALE][key] ?? key;
}

function format(template, vars) {
  if (!template || !vars) return template || "";
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

function formatPrice(value) {
  return getCurrencyFormatter(currentLocale).format(Number(value) || 0);
}

function formatNumber(value) {
  return getNumberFormatter(currentLocale).format(Number(value) || 0);
}

function formatArea(sqm) {
  const n = formatNumber(sqm);
  return format(translate("card.area"), { n });
}

function pluralizeRuForms(count, forms) {
  // ru pluralization by exact rules: 1 → forms[0], 2-4 → forms[1], 5-20 + 11-14 → forms[2].
  const absolute = Math.abs(count) % 100;
  const lastDigit = absolute % 10;
  if (absolute > 10 && absolute < 20) return forms[2];
  if (lastDigit > 1 && lastDigit < 5) return forms[1];
  if (lastDigit === 1) return forms[0];
  return forms[2];
}

function pluralizeEn(count, _forms) {
  return Math.abs(count) === 1 ? _forms[0] : _forms[1];
}

function pluralize(count, forms) {
  if (currentLocale === "ru") return pluralizeRuForms(count, forms);
  return pluralizeEn(count, forms);
}

function applyTranslations(root = document) {
  // text content + aria attributes
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    const text = translate(key);
    if (text) node.textContent = text;
  });
  // placeholder / content / aria-label / title via data-i18n-attr="x"
  root.querySelectorAll("[data-i18n-attr]").forEach((node) => {
    const attr = node.getAttribute("data-i18n-attr");
    const key = node.getAttribute("data-i18n");
    if (!attr || !key) return;
    const text = translate(key);
    if (text) node.setAttribute(attr, text);
  });
  // lang / dir on <html>
  document.documentElement.lang = LOCALE_TO_HTML[currentLocale] || "en";
}

function setLocale(locale, options = {}) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  currentLocale = locale;
  persistLocale(locale);

  // Update switcher pressed state
  document.querySelectorAll("[data-lang-switcher] [data-lang]").forEach((btn) => {
    const isActive = btn.dataset.lang === locale;
    btn.setAttribute("aria-pressed", String(isActive));
  });

  // Apply static translations + update <html lang>
  applyTranslations();

  // Tell the rest of the app to refresh derived UI (cards, dropdowns, summaries, etc.)
  if (!options.silent) {
    document.dispatchEvent(new CustomEvent("locale:change", { detail: { locale } }));
  }
}

// expose globally for inline access from app.js
window.GK_I18N = {
  setLocale,
  getLocale: () => currentLocale,
  translate,
  format,
  formatPrice,
  formatNumber,
  formatArea,
  pluralize,
  applyTranslations,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
};

// Bootstrap on DOM ready so we translate the static copy before app.js renders cards.
function bootstrapLocale() {
  currentLocale = detectInitialLocale();
  setLocale(currentLocale, { silent: true });
  // Re-apply once more after DOM ready (the first invocation happened on parser-attach;
  // we keep it idempotent and cheap).
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        applyTranslations();
        document
          .querySelectorAll("[data-lang-switcher] [data-lang]")
          .forEach((btn) => {
            const isActive = btn.dataset.lang === currentLocale;
            btn.setAttribute("aria-pressed", String(isActive));
          });
      },
      { once: true },
    );
  }

  // Wire the language switcher
  document.addEventListener("click", (event) => {
    const btn = event.target instanceof Element
      ? event.target.closest("[data-lang-switcher] [data-lang]")
      : null;
    if (btn && btn.dataset.lang) {
      setLocale(btn.dataset.lang);
    }
  });
}

bootstrapLocale();
