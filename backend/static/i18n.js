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
    "meta.title": "каталог недвижимости в Дубае",
    "meta.description":
      "каталог элитной недвижимости в Дубае с персональным подбором и прозрачным сопровождением",
    "a11y.skip": "Перейти к содержанию",

    "nav.catalog": "Объекты",
    "nav.approach": "Подход",
    "nav.partners": "Партнёрам",
    "nav.menu.label": "Меню",
    "nav.menu.open": "Открыть навигацию",
    "nav.menu.close": "Закрыть навигацию",
    "header.cta": "Запросить подбор",

    "hero.eyebrow": "Dubai property catalogue",
    "hero.title.a": "Недвижимость в",
    "hero.title.b": "Дубае",
    "hero.title.c": "— каталог, которому можно доверять.",
    "hero.lead":
      "Информационная подборка объектов в знаковых районах Дубая — от пентхаусов Downtown до вилл на Palm Jumeirah.",
    "hero.cta.primary": "Подобрать объект",
    "hero.cta.secondary": "Смотреть предложения",
    "hero.pillars.1": "Лимитированный подбор",
    "hero.pillars.2": "Проверяемая информация",
    "hero.pillars.3": "Сопровождение без спешки",

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
      "Если вы рассматриваете Дубай как направление или ищете резиденцию для жизни, начните с вводной беседы о ваших целях и бюджете.",
    "partners.cta": "Изучить подборку",
    "partners.notice":
      "Сайт не предлагает финансовые продукты, не принимает переводы и не гарантирует доходность.",

    "contact.eyebrow": "Start with a conversation",
    "contact.title.a": "Расскажите, какой",
    "contact.title.b": "дом",
    "contact.title.c": "вы ищете.",
    "contact.cta": "Оставить запрос",

    "footer.tagline": "Dubai property advisory",
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

    "nav.docs": "Документация",
    "docs.meta.title": "Golden Key — документация",
    "docs.meta.description":
      "Техническая документация по информационному каталогу недвижимости Golden Key.",
    "docs.eyebrow": "Documentation",
    "docs.title": "Golden Key — документация платформы",
    "docs.subtitle":
      "Технический справочник по информационному каталогу недвижимости: архитектура, эндпоинты, схема данных, развёртывание и требования комплаенса.",
    "docs.code.shell": "bash",
    "docs.table.method": "Метод",
    "docs.table.path": "Путь",
    "docs.table.description": "Назначение",
    "docs.callout.note": "Примечание:",
    "docs.callout.compliance": "Комплаенс:",
    "docs.callout.warn": "Внимание:",
    "docs.callout.legal": "Юридическая оговорка:",
    "docs.toc.title": "Содержание",
    "docs.toc.getting-started": "Быстрый старт",
    "docs.toc.architecture": "Архитектура",
    "docs.toc.api": "API справочник",
    "docs.toc.data": "Модель данных",
    "docs.toc.frontend": "Фронтенд",
    "docs.toc.deployment": "Развёртывание",
    "docs.toc.operations": "Эксплуатация",
    "docs.toc.compliance": "Комплаенс и оговорки",
    "docs.toc.faq": "FAQ",
    "docs.section.getting-started.title": "Быстрый старт",
    "docs.section.getting-started.body":
      "Golden Key — это FastAPI-приложение с SQLite и статическим фронтендом. Платформа намеренно узкая: каталог объектов и приём контактных запросов. Никаких платежей, кабинетов, KYC или инвестиционных продуктов.",
    "docs.section.getting-started.install": "Локальный запуск",
    "docs.section.getting-started.docker": "Docker",
    "docs.section.getting-started.env": "Переменные окружения",
    "docs.section.architecture.title": "Обзор архитектуры",
    "docs.section.architecture.body":
      "Сервис построен на FastAPI. Каждый запрос проходит через стек middleware, который выставляет защитные заголовки (CSP, X-Frame-Options, Permissions-Policy, Referrer-Policy) и применяет ограничение скорости к POST /api/inquiries. Данные хранятся в SQLite — это сделано намеренно: каталог информационный, без платежей и без требований распределённых транзакций.",
    "docs.architecture.note":
      "Сервис не использует очереди, фоновые задачи или внешние сервисы — каждый запрос полностью синхронный и читаемый в одном файле (backend/main.py).",
    "docs.section.api.title": "Справочник по API",
    "docs.section.api.body":
      "Публичная поверхность намеренно узкая: чтение каталога, детализация объекта, виртуальный тур, похожие предложения и приём контактного запроса. Любые ответы содержат поле notice с правовой оговоркой.",
    "docs.section.api.list.title": "Список эндпоинтов",
    "docs.api.health": "Проверка доступности сервиса и БД.",
    "docs.api.properties.list": "Пагинированный каталог с фильтрами.",
    "docs.api.properties.detail": "Детальная карточка объекта.",
    "docs.api.properties.tour": "Метаданные виртуального тура.",
    "docs.api.properties.similar": "До трёх похожих объектов (±30% по цене).",
    "docs.api.inquiries": "Создание контактного запроса. Под rate-limit.",
    "docs.api.compliance":
      "В API нет и не будет эндпоинтов /api/payment, /api/kyc, /api/withdrawal или /api/dashboard — каталог остаётся информационным.",
    "docs.api.properties.list.body":
      "Возвращает пагинированный список объектов. Фильтры: location (подстрочный поиск), minPrice, maxPrice, listingStatus. По умолчанию отдаются только ACTIVE объекты.",
    "docs.api.properties.detail.title": "/api/properties/{id}",
    "docs.api.properties.detail.body":
      "Возвращает одну запись и оговорку. 404 NOT_FOUND, если идентификатор неизвестен.",
    "docs.api.properties.tour.title": "/api/properties/{id}/tour",
    "docs.api.properties.tour.body":
      "Возвращает tourType (NONE, PHOTO_360, MODEL_3D, VIDEO_3D) и URL тура. Поле isLocalModel подсказывает фронтенду, что нужно монтировать локальный .glb.",
    "docs.api.properties.similar.title": "/api/properties/{id}/similar",
    "docs.api.properties.similar.body":
      "Подбирает до трёх объектов в коридоре ±30 % по цене, исключая исходный. Источник должен существовать.",
    "docs.api.inquiries.title": "/api/inquiries (POST)",
    "docs.api.inquiries.body":
      "Создаёт контактный запрос. Тело — JSON с camelCase-полями. Поле consentToContact обязательно. Ответ содержит идентификатор запроса, но не эхо персональных данных.",
    "docs.api.inquiries.warn":
      "POST /api/inquiries ограничен скользящим окном (RATE_LIMIT_MAX запросов в RATE_LIMIT_WINDOW секунд). Превышение вернёт 429 RATE_LIMITED.",
    "docs.api.health.title": "/health",
    "docs.api.health.body":
      "Возвращает {\"status\": \"ok\"} при доступной БД. При недоступности — 503.",
    "docs.section.data.title": "Модель данных",
    "docs.section.data.body":
      "SQLite-схема создаётся в initialize_database при старте. Колонки images и features хранят JSON-строки, парсятся через _safe_json_list. Колонка asking_price_usd — единственная денежная величина, хранится исключительно как справочное значение.",
    "docs.data.note":
      "В схеме намеренно нет колонок для балансов, кошельков, транзакций, реферальных кодов или статусов KYC.",
    "docs.section.frontend.title": "Фронтенд: как это собрано",
    "docs.section.frontend.body":
      "Главная страница (/) — статический HTML + небольшой vanilla-JS. Никаких сборщиков и зависимостей, кроме @google/model-viewer для 3D-тура.",
    "docs.section.frontend.i18n": "i18n.js",
    "docs.section.frontend.i18n.body":
      "Словарь TRANSLATIONS хранит ключи для ru/en/de/es. Каждый [data-i18n=\"key\"] получает текст при загрузке и при клике по переключателю языка.",
    "docs.section.frontend.app": "app.js",
    "docs.section.frontend.app.body":
      "Главный клиент: загружает /api/properties, рендерит карточки, открывает диалоги для формы запроса и тура.",
    "docs.section.frontend.styles": "styles.css",
    "docs.section.frontend.styles.body":
      "Единый файл стилей для всей платформы. CSS-переменные вынесены в :root: палитра, отступы, типографика. docs.css наследует переменные.",
    "docs.section.frontend.dialogs": "Диалоги",
    "docs.section.frontend.dialogs.body":
      "Используется нативный <dialog> — фокус-трап и закрытие по Esc работают «из коробки».",
    "docs.section.deployment.title": "Развёртывание",
    "docs.section.deployment.body":
      "Сервис намеренно stateless поверх локальной SQLite. Это упрощает деплой на Vercel или в Docker-контейнер без миграций и очередей.",
    "docs.section.deployment.vercel": "Vercel",
    "docs.section.deployment.vercel.body":
      "Используйте vercel.json: rewrite всего, что не начинается с /api/, на backend/main.py как serverless-функцию.",
    "docs.section.deployment.docker": "Docker",
    "docs.section.deployment.docker.body":
      "В backend/Dockerfile используется python:3.11-slim. EXPOSE 8000, запуск через uvicorn main:app --host 0.0.0.0 --port 8000.",
    "docs.section.deployment.env": "Переменные окружения",
    "docs.section.operations.title": "Эксплуатация и мониторинг",
    "docs.section.operations.body":
      "Сервис пишет структурированные логи. Значимые события: создание запроса, подбор похожих, превышение rate limit, падение health-check.",
    "docs.section.operations.health": "/health",
    "docs.section.operations.health.body":
      "Подходит для liveness/readiness. Делает SELECT 1 FROM listings LIMIT 1, поэтому одновременно является smoke-тестом схемы.",
    "docs.section.operations.logs": "Логи",
    "docs.section.operations.logs.body":
      "Формат %(asctime)s [%(levelname)s] %(name)s: %(message)s. События идут с префиксами similar_properties и inquiry_created.",
    "docs.section.operations.rate": "Сброс rate-limit",
    "docs.section.operations.rate.body":
      "Лимиты живут в in-memory _rate_buckets. При перезапуске процесса окна сбрасываются автоматически.",
    "docs.section.compliance.title": "Комплаенс и оговорки",
    "docs.compliance.legal":
      "Listing information is illustrative and subject to agent and owner verification. It is not an offer, investment advice, or a binding contract.",
    "docs.compliance.no-payments.title": "Без платежей",
    "docs.compliance.no-payments.body":
      "Сервис не принимает деньги, не открывает кошельки, не выплачивает доходность, не продаёт инвестиционные доли и не проводит KYC.",
    "docs.compliance.dubai.title": "Дубай: DLD / RERA",
    "docs.compliance.dubai.body":
      "В Дубае любая сделка по объекту должна сопровождаться лицензированным брокером, зарегистрированным в Dubai Land Department (DLD) и RERA. Информация на сайте носит ознакомительный характер:",
    "docs.compliance.dubai.broker": "проверьте RERA-номер брокера и его актуальный статус;",
    "docs.compliance.dubai.owner": "запросите подтверждение права собственности через DLD;",
    "docs.compliance.dubai.contract": "не подписывайте платёжные документы и формы без проверки условий у лицензированного специалиста.",
    "docs.compliance.dubai.warn":
      "Любые расчёты «доходности», «гарантированной аренды» или «возврата инвестиций» не имеют отношения к этому сервису. Не переводите средства по реквизитам, найденным на сайте.",
    "docs.section.faq.title": "Часто задаваемые вопросы",
    "docs.faq.q1.title": "Это инвестиционная платформа?",
    "docs.faq.q1.body":
      "Нет. Golden Key — информационный каталог недвижимости и сервис приёма контактных запросов. Сайт не предлагает инвестиционные продукты, не принимает средства и не гарантирует доходность.",
    "docs.faq.q2.title": "Что произойдёт после отправки формы?",
    "docs.faq.q2.body":
      "Запрос попадает в очередь консультантов. С вами связываются по выбранному объекту и только по оставленным контактам.",
    "docs.faq.q3.title": "Можно ли платить через сайт?",
    "docs.faq.q3.body":
      "Нет. Сайт не принимает платежи, не хранит реквизиты и не выставляет счета. Любые финансовые расчёты происходят за пределами платформы.",
    "docs.faq.q4.title": "Откуда берутся цены в каталоге?",
    "docs.faq.q4.body":
      "Цены запрашиваются у владельца или его представителя и регулярно пересматриваются. Финальная стоимость может отличаться.",
    "docs.faq.q5.title": "Гарантируется ли наличие объекта?",
    "docs.faq.q5.body":
      "Нет. Доступность зависит от владельца и рынка. Статус ACTIVE означает, что объект опубликован, но не заменяет оффер или договор.",
    "docs.faq.q6.title": "Как проверить брокера в Дубае?",
    "docs.faq.q6.body":
      "Запросите RERA-номер (Broker ID) и сверьте его через публичные реестры Dubai Land Department. Не работайте с брокером без действующей лицензии.",
    "docs.faq.q7.title": "Хранит ли сайт мои документы?",
    "docs.faq.q7.body":
      "Нет. Через форму мы получаем только имя, контакт и текст сообщения. Не присылайте паспорт, банковские реквизиты или иные документы.",
    "docs.faq.q8.title": "Как связаться для уточнений?",
    "docs.faq.q8.body":
      "Используйте форму на странице объекта или на главной — кнопка «Запросить подбор». Мы отвечаем в порядке очереди запросов.",

    "error.404.eyebrow": "404",
    "error.404.title": "Страница не найдена",
    "error.404.body":
      "Запрашиваемый адрес не существует. Возможно, объект снят с публикации или ссылка устарела.",
    "error.404.cta.home": "На главную",
    "error.404.cta.docs": "Открыть документацию",

    "copy.code": "Скопировать",
    "copied.code": "Скопировано",
  },

  en: {
    "meta.title": "Dubai property catalogue",
    "meta.description":
      "Dubai property catalogue with personal selection and transparent guidance.",
    "a11y.skip": "Skip to main content",

    "nav.catalog": "Listings",
    "nav.approach": "Approach",
    "nav.partners": "Partners",
    "nav.menu.label": "Menu",
    "nav.menu.open": "Open navigation",
    "nav.menu.close": "Close navigation",
    "header.cta": "Request a shortlist",

    "hero.eyebrow": "Dubai property catalogue",
    "hero.title.a": "Property in",
    "hero.title.b": "Dubai",
    "hero.title.c": "— a catalogue you can trust.",
    "hero.lead":
      "A curated selection in Dubai's signature districts — from Downtown penthouses to Palm Jumeirah villas.",
    "hero.cta.primary": "Find a home",
    "hero.cta.secondary": "See listings",
    "hero.pillars.1": "Limited intake",
    "hero.pillars.2": "Verifiable information",
    "hero.pillars.3": "Unhurried guidance",

    "intro.label": "Not a catalogue for the sake of it",
    "intro.kicker": "Golden Key Property",
    "intro.title.a": "First we understand your rhythm of life.",
    "intro.title.b": "Then",
    "intro.title.c": "we open the right doors.",
    "intro.body":
      "We work on a limited number of enquiries at a time: the consultant stays in context, and recommendations never become a flood of links.",
    "intro.cta": "How selection works",

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
      "If you're considering Dubai as a destination or looking for a residence, start with an introductory conversation about your goals and budget.",
    "partners.cta": "Browse the selection",
    "partners.notice":
      "This site does not offer financial products, does not accept transfers, and does not guarantee returns.",

    "contact.eyebrow": "Start with a conversation",
    "contact.title.a": "Tell us the",
    "contact.title.b": "home",
    "contact.title.c": "you are looking for.",
    "contact.cta": "Leave an inquiry",

    "footer.tagline": "Dubai property advisory",
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

    "nav.docs": "Documentation",
    "docs.meta.title": "Golden Key — documentation",
    "docs.meta.description":
      "Technical documentation for the Golden Key informational property catalogue.",
    "docs.eyebrow": "Documentation",
    "docs.title": "Golden Key — platform documentation",
    "docs.subtitle":
      "Technical reference for the informational property catalogue: architecture, endpoints, data model, deployment, and compliance posture.",
    "docs.code.shell": "bash",
    "docs.table.method": "Method",
    "docs.table.path": "Path",
    "docs.table.description": "Purpose",
    "docs.callout.note": "Note:",
    "docs.callout.compliance": "Compliance:",
    "docs.callout.warn": "Warning:",
    "docs.callout.legal": "Legal notice:",
    "docs.toc.title": "On this page",
    "docs.toc.getting-started": "Getting started",
    "docs.toc.architecture": "Architecture",
    "docs.toc.api": "API reference",
    "docs.toc.data": "Data model",
    "docs.toc.frontend": "Frontend",
    "docs.toc.deployment": "Deployment",
    "docs.toc.operations": "Operations",
    "docs.toc.compliance": "Compliance & disclaimers",
    "docs.toc.faq": "FAQ",
    "docs.section.getting-started.title": "Getting started",
    "docs.section.getting-started.body":
      "Golden Key is a FastAPI app backed by SQLite with a static frontend. The platform is intentionally narrow: a property catalogue and contact-form intake. No payments, accounts, KYC, or investment products.",
    "docs.section.getting-started.install": "Run it locally",
    "docs.section.getting-started.docker": "Docker",
    "docs.section.getting-started.env": "Environment variables",
    "docs.section.architecture.title": "Architecture overview",
    "docs.section.architecture.body":
      "The service is built on FastAPI. Every request passes through a middleware stack that sets defensive headers (CSP, X-Frame-Options, Permissions-Policy, Referrer-Policy) and applies rate-limiting to POST /api/inquiries. Data lives in SQLite by design — the catalogue is informational, with no payments or distributed-transaction requirements.",
    "docs.architecture.note":
      "There are no queues, background jobs, or external services — each request is fully synchronous and readable in a single file (backend/main.py).",
    "docs.section.api.title": "API reference",
    "docs.section.api.body":
      "The public surface is intentionally narrow: read the catalogue, view a property, fetch a virtual tour, fetch similar listings, and accept a contact request. Every response includes a notice field with a legal disclaimer.",
    "docs.section.api.list.title": "Endpoint inventory",
    "docs.api.health": "Service and database health probe.",
    "docs.api.properties.list": "Paginated catalogue with filters.",
    "docs.api.properties.detail": "Single property card.",
    "docs.api.properties.tour": "Virtual-tour metadata.",
    "docs.api.properties.similar": "Up to three similar listings (±30% by price).",
    "docs.api.inquiries": "Create a contact request. Rate-limited.",
    "docs.api.compliance":
      "There are no and will be no /api/payment, /api/kyc, /api/withdrawal, or /api/dashboard endpoints — the catalogue stays informational.",
    "docs.api.properties.list.body":
      "Returns a paginated list of properties. Filters: location (substring match), minPrice, maxPrice, listingStatus. By default only ACTIVE listings are returned.",
    "docs.api.properties.detail.title": "/api/properties/{id}",
    "docs.api.properties.detail.body":
      "Returns a single record and the disclaimer. 404 NOT_FOUND if the id is unknown.",
    "docs.api.properties.tour.title": "/api/properties/{id}/tour",
    "docs.api.properties.tour.body":
      "Returns tourType (NONE, PHOTO_360, MODEL_3D, VIDEO_3D) and the tour URL. The isLocalModel flag tells the frontend to mount a local .glb model.",
    "docs.api.properties.similar.title": "/api/properties/{id}/similar",
    "docs.api.properties.similar.body":
      "Up to three listings inside a ±30% price band, excluding the source. The source listing must exist.",
    "docs.api.inquiries.title": "/api/inquiries (POST)",
    "docs.api.inquiries.body":
      "Creates a contact request. Body is JSON with camelCase fields. consentToContact is required. The response includes the request id but does not echo any personal data.",
    "docs.api.inquiries.warn":
      "POST /api/inquiries is limited by a sliding window (RATE_LIMIT_MAX requests in RATE_LIMIT_WINDOW seconds). Exceeding it returns 429 RATE_LIMITED.",
    "docs.api.health.title": "/health",
    "docs.api.health.body":
      "Returns {\"status\": \"ok\"} when the database is reachable. 503 when it is not.",
    "docs.section.data.title": "Data model",
    "docs.section.data.body":
      "The SQLite schema is created by initialize_database on startup. The images and features columns store JSON strings, parsed through _safe_json_list. asking_price_usd is the only monetary value and is stored as a reference figure only.",
    "docs.data.note":
      "There are intentionally no columns for balances, wallets, transactions, referral codes, or KYC status.",
    "docs.section.frontend.title": "Frontend: how it fits together",
    "docs.section.frontend.body":
      "The landing page (/) is static HTML plus a small vanilla-JS client. No bundlers or dependencies besides @google/model-viewer for 3D tours.",
    "docs.section.frontend.i18n": "i18n.js",
    "docs.section.frontend.i18n.body":
      "The TRANSLATIONS dictionary holds keys for ru/en/de/es. Each [data-i18n=\"key\"] gets text on load and whenever the language switcher fires.",
    "docs.section.frontend.app": "app.js",
    "docs.section.frontend.app.body":
      "The main client: fetches /api/properties, renders cards, opens dialogs for the contact form and tour.",
    "docs.section.frontend.styles": "styles.css",
    "docs.section.frontend.styles.body":
      "Single stylesheet for the whole platform. CSS variables live in :root: palette, spacing, typography. docs.css inherits them.",
    "docs.section.frontend.dialogs": "Dialogs",
    "docs.section.frontend.dialogs.body":
      "Native <dialog> elements — focus trap and Esc-to-close work out of the box.",
    "docs.section.deployment.title": "Deployment",
    "docs.section.deployment.body":
      "The service is intentionally stateless on top of a local SQLite file. That keeps Vercel or Docker deploys simple — no migrations, no queues.",
    "docs.section.deployment.vercel": "Vercel",
    "docs.section.deployment.vercel.body":
      "Use vercel.json: rewrite anything that does not start with /api/ to backend/main.py as a serverless function.",
    "docs.section.deployment.docker": "Docker",
    "docs.section.deployment.docker.body":
      "backend/Dockerfile uses python:3.11-slim. EXPOSE 8000, run with uvicorn main:app --host 0.0.0.0 --port 8000.",
    "docs.section.deployment.env": "Environment variables",
    "docs.section.operations.title": "Operations & monitoring",
    "docs.section.operations.body":
      "The service writes structured logs. Notable events: inquiry created, similar-property lookup, rate-limit breach, health-check failure.",
    "docs.section.operations.health": "/health",
    "docs.section.operations.health.body":
      "Suitable for liveness/readiness probes. Performs SELECT 1 FROM listings LIMIT 1, doubling as a schema smoke test.",
    "docs.section.operations.logs": "Logs",
    "docs.section.operations.logs.body":
      "Format %(asctime)s [%(levelname)s] %(name)s: %(message)s. Events are prefixed similar_properties and inquiry_created — easy to grep.",
    "docs.section.operations.rate": "Resetting the rate limit",
    "docs.section.operations.rate.body":
      "Limits live in the in-memory _rate_buckets. The window resets automatically when the process restarts.",
    "docs.section.compliance.title": "Compliance & disclaimers",
    "docs.compliance.legal":
      "Listing information is illustrative and subject to agent and owner verification. It is not an offer, investment advice, or a binding contract.",
    "docs.compliance.no-payments.title": "No payments",
    "docs.compliance.no-payments.body":
      "The service does not accept money, open wallets, pay out returns, sell investment shares, or run KYC.",
    "docs.compliance.dubai.title": "Dubai: DLD / RERA",
    "docs.compliance.dubai.body":
      "In Dubai, every transaction must be handled by a broker licensed by the Dubai Land Department (DLD) and RERA. The information on this site is informational only:",
    "docs.compliance.dubai.broker": "verify the broker's RERA number and current status;",
    "docs.compliance.dubai.owner": "request ownership confirmation through the DLD;",
    "docs.compliance.dubai.contract": "do not sign payment documents or forms without a licensed specialist reviewing the terms.",
    "docs.compliance.dubai.warn":
      "Any \"yield\", \"guaranteed rent\", or \"return on investment\" calculations are unrelated to this service. Do not transfer funds to bank details found on the site.",
    "docs.section.faq.title": "Frequently asked questions",
    "docs.faq.q1.title": "Is this an investment platform?",
    "docs.faq.q1.body":
      "No. Golden Key is an informational property catalogue and a contact-request service. It does not offer investment products, accept funds, or guarantee returns.",
    "docs.faq.q2.title": "What happens after I submit the form?",
    "docs.faq.q2.body":
      "Your request goes into the consultants' queue. They contact you about the selected property, using only the contacts you provided.",
    "docs.faq.q3.title": "Can I pay through the site?",
    "docs.faq.q3.body":
      "No. The site does not accept payments, store bank details, or issue invoices. All financial settlement happens off-platform, controlled by your bank and a licensed broker.",
    "docs.faq.q4.title": "Where do the catalogue prices come from?",
    "docs.faq.q4.body":
      "Prices are requested from the owner or their representative and are reviewed regularly. Final pricing may differ and must be confirmed in writing or at a meeting with the agent.",
    "docs.faq.q5.title": "Is availability guaranteed?",
    "docs.faq.q5.body":
      "No. Availability depends on the owner and the market. An ACTIVE status means the listing is published — it does not replace an offer or a contract.",
    "docs.faq.q6.title": "How do I check a Dubai broker?",
    "docs.faq.q6.body":
      "Ask for the RERA (Broker ID) number and cross-check it against the Dubai Land Department's public registers. Do not work with a broker who lacks a valid, current licence.",
    "docs.faq.q7.title": "Does the site store my documents?",
    "docs.faq.q7.body":
      "No. Through the form we receive only your name, contact, and message text. Do not send passports, bank details, or other documents — we do not request or process them.",
    "docs.faq.q8.title": "How do I get in touch for clarifications?",
    "docs.faq.q8.body":
      "Use the form on a property page or the main page — the \"Request a shortlist\" button. We reply in request order.",

    "error.404.eyebrow": "404",
    "error.404.title": "Page not found",
    "error.404.body":
      "The address you requested does not exist. The property may have been withdrawn or the link may be out of date.",
    "error.404.cta.home": "Back to home",
    "error.404.cta.docs": "Open documentation",

    "copy.code": "Copy",
    "copied.code": "Copied",
  },

  de: {
    "meta.title": "Immobilienkatalog Dubai",
    "meta.description":
      "Dubai-Immobilienkatalog mit persönlicher Auswahl und transparenter Begleitung.",
    "a11y.skip": "Zum Inhalt springen",

    "nav.catalog": "Objekte",
    "nav.approach": "Vorgehen",
    "nav.partners": "Partner",
    "nav.menu.label": "Menü",
    "nav.menu.open": "Navigation öffnen",
    "nav.menu.close": "Navigation schließen",
    "header.cta": "Auswahl anfragen",

    "hero.eyebrow": "Dubai property catalogue",
    "hero.title.a": "Immobilien in",
    "hero.title.b": "Dubai",
    "hero.title.c": "— ein Katalog, dem Sie vertrauen können.",
    "hero.lead":
      "Kuratierte Auswahl in Dubais markanten Vierteln — von Downtown-Penthouse bis Palm-Jumeirah-Villa.",
    "hero.cta.primary": "Objekt finden",
    "hero.cta.secondary": "Auswahl ansehen",
    "hero.pillars.1": "Begrenzte Auswahl",
    "hero.pillars.2": "Überprüfbare Informationen",
    "hero.pillars.3": "Begleitung ohne Eile",

    "intro.label": "Kein Katalog um des Katalogs willen",
    "intro.kicker": "Golden Key Property",
    "intro.title.a": "Zuerst verstehen wir Ihren Lebensrhythmus.",
    "intro.title.b": "Dann",
    "intro.title.c": "öffnen wir die richtigen Türen.",
    "intro.body":
      "Wir betreuen eine begrenzte Anzahl von Anfragen gleichzeitig: so bleibt der Berater im Kontext und Empfehlungen werden nicht zu einer Link-Flut.",
    "intro.cta": "Wie die Auswahl funktioniert",

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
      "Wenn Sie Dubai als Ziel in Betracht ziehen oder eine Residenz suchen, beginnen Sie mit einem Erstgespräch über Ihre Ziele und Ihr Budget.",
    "partners.cta": "Auswahl ansehen",
    "partners.notice":
      "Diese Website bietet keine Finanzprodukte, akzeptiert keine Überweisungen und garantiert keine Rendite.",

    "contact.eyebrow": "Start with a conversation",
    "contact.title.a": "Erzählen Sie uns, welches",
    "contact.title.b": "Zuhause",
    "contact.title.c": "Sie suchen.",
    "contact.cta": "Anfrage stellen",

    "footer.tagline": "Dubai property advisory",
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

    "nav.docs": "Dokumentation",
    "docs.meta.title": "Golden Key — Dokumentation",
    "docs.meta.description":
      "Technische Dokumentation für den informativen Immobilienkatalog von Golden Key.",
    "docs.eyebrow": "Documentation",
    "docs.title": "Golden Key — Plattform-Dokumentation",
    "docs.subtitle":
      "Technische Referenz für den informativen Immobilienkatalog: Architektur, Endpunkte, Datenmodell, Deployment und Compliance-Haltung.",
    "docs.code.shell": "bash",
    "docs.table.method": "Methode",
    "docs.table.path": "Pfad",
    "docs.table.description": "Zweck",
    "docs.callout.note": "Hinweis:",
    "docs.callout.compliance": "Compliance:",
    "docs.callout.warn": "Warnung:",
    "docs.callout.legal": "Rechtlicher Hinweis:",
    "docs.toc.title": "Inhalt",
    "docs.toc.getting-started": "Erste Schritte",
    "docs.toc.architecture": "Architektur",
    "docs.toc.api": "API-Referenz",
    "docs.toc.data": "Datenmodell",
    "docs.toc.frontend": "Frontend",
    "docs.toc.deployment": "Deployment",
    "docs.toc.operations": "Betrieb",
    "docs.toc.compliance": "Compliance & Hinweise",
    "docs.toc.faq": "FAQ",
    "docs.section.getting-started.title": "Erste Schritte",
    "docs.section.getting-started.body":
      "Golden Key ist eine FastAPI-Anwendung mit SQLite und einem statischen Frontend. Die Plattform ist bewusst schmal: ein Immobilienkatalog und Kontaktanfragen. Keine Zahlungen, Konten, KYC oder Anlageprodukte.",
    "docs.section.getting-started.install": "Lokal starten",
    "docs.section.getting-started.docker": "Docker",
    "docs.section.getting-started.env": "Umgebungsvariablen",
    "docs.section.architecture.title": "Architekturüberblick",
    "docs.section.architecture.body":
      "Der Dienst basiert auf FastAPI. Jede Anfrage durchläuft einen Middleware-Stack, der Schutzheader (CSP, X-Frame-Options, Permissions-Policy, Referrer-Policy) setzt und für POST /api/inquiries ein Rate-Limit anwendet. Die Daten liegen bewusst in SQLite — der Katalog ist informativ, ohne Zahlungen oder Anforderungen an verteilte Transaktionen.",
    "docs.architecture.note":
      "Es gibt keine Queues, Hintergrundjobs oder externen Dienste — jede Anfrage ist vollständig synchron und in einer einzigen Datei (backend/main.py) lesbar.",
    "docs.section.api.title": "API-Referenz",
    "docs.section.api.body":
      "Die öffentliche Oberfläche ist bewusst schmal: Katalog lesen, Objektdetails, virtueller Rundgang, ähnliche Angebote und Kontaktanfragen. Jede Antwort enthält ein notice-Feld mit einem rechtlichen Hinweis.",
    "docs.section.api.list.title": "Endpunktübersicht",
    "docs.api.health": "Gesundheitsprüfung für Dienst und Datenbank.",
    "docs.api.properties.list": "Paginierter Katalog mit Filtern.",
    "docs.api.properties.detail": "Einzelne Objektkarte.",
    "docs.api.properties.tour": "Metadaten des virtuellen Rundgangs.",
    "docs.api.properties.similar": "Bis zu drei ähnliche Angebote (±30 % nach Preis).",
    "docs.api.inquiries": "Kontaktanfrage anlegen. Rate-limitiert.",
    "docs.api.compliance":
      "Es gibt und wird keine Endpunkte /api/payment, /api/kyc, /api/withdrawal oder /api/dashboard geben — der Katalog bleibt informativ.",
    "docs.api.properties.list.body":
      "Gibt eine paginierte Liste von Objekten zurück. Filter: location (Teilstring), minPrice, maxPrice, listingStatus. Standardmäßig werden nur ACTIVE-Objekte geliefert.",
    "docs.api.properties.detail.title": "/api/properties/{id}",
    "docs.api.properties.detail.body":
      "Gibt einen einzelnen Datensatz und den Hinweis zurück. 404 NOT_FOUND bei unbekannter ID.",
    "docs.api.properties.tour.title": "/api/properties/{id}/tour",
    "docs.api.properties.tour.body":
      "Gibt tourType (NONE, PHOTO_360, MODEL_3D, VIDEO_3D) und die Tour-URL zurück. Das Flag isLocalModel weist das Frontend an, ein lokales .glb-Modell zu laden.",
    "docs.api.properties.similar.title": "/api/properties/{id}/similar",
    "docs.api.properties.similar.body":
      "Bis zu drei Objekte im ±30%-Preisband, ohne das Quellobjekt. Das Quellobjekt muss existieren.",
    "docs.api.inquiries.title": "/api/inquiries (POST)",
    "docs.api.inquiries.body":
      "Legt eine Kontaktanfrage an. Body ist JSON mit camelCase-Feldern. consentToContact ist erforderlich. Die Antwort enthält die Anfrage-ID, aber kein Echo personenbezogener Daten.",
    "docs.api.inquiries.warn":
      "POST /api/inquiries ist durch ein Sliding-Window-Limit begrenzt (RATE_LIMIT_MAX Anfragen in RATE_LIMIT_WINDOW Sekunden). Überschreitung liefert 429 RATE_LIMITED.",
    "docs.api.health.title": "/health",
    "docs.api.health.body":
      "Liefert {\"status\": \"ok\"}, wenn die Datenbank erreichbar ist. Sonst 503.",
    "docs.section.data.title": "Datenmodell",
    "docs.section.data.body":
      "Das SQLite-Schema wird beim Start durch initialize_database angelegt. Die Spalten images und features speichern JSON-Strings, die über _safe_json_list geparst werden. asking_price_usd ist der einzige Geldwert und dient nur als Referenz.",
    "docs.data.note":
      "Es gibt bewusst keine Spalten für Salden, Wallets, Transaktionen, Empfehlungs-Codes oder KYC-Status.",
    "docs.section.frontend.title": "Frontend: Zusammenspiel",
    "docs.section.frontend.body":
      "Die Startseite (/) ist statisches HTML plus ein kleiner Vanilla-JS-Client. Keine Bundler oder Abhängigkeiten außer @google/model-viewer für 3D-Rundgänge.",
    "docs.section.frontend.i18n": "i18n.js",
    "docs.section.frontend.i18n.body":
      "Das TRANSLATIONS-Wörterbuch enthält Schlüssel für ru/en/de/es. Jeder [data-i18n=\"key\"]-Knoten wird beim Laden und beim Wechsel der Sprache gesetzt.",
    "docs.section.frontend.app": "app.js",
    "docs.section.frontend.app.body":
      "Hauptclient: lädt /api/properties, rendert Karten, öffnet Dialoge für Kontaktformular und Tour.",
    "docs.section.frontend.styles": "styles.css",
    "docs.section.frontend.styles.body":
      "Ein einziges Stylesheet für die gesamte Plattform. CSS-Variablen liegen in :root: Palette, Abstände, Typografie. docs.css erbt davon.",
    "docs.section.frontend.dialogs": "Dialoge",
    "docs.section.frontend.dialogs.body":
      "Native <dialog>-Elemente — Focus-Trap und Schließen mit Esc funktionieren out of the box.",
    "docs.section.deployment.title": "Deployment",
    "docs.section.deployment.body":
      "Der Dienst ist bewusst stateless auf Basis einer lokalen SQLite-Datei. Das hält Deploys auf Vercel oder Docker einfach — keine Migrationen, keine Queues.",
    "docs.section.deployment.vercel": "Vercel",
    "docs.section.deployment.vercel.body":
      "vercel.json verwenden: alles, was nicht mit /api/ beginnt, auf backend/main.py als Serverless-Funktion rewriten.",
    "docs.section.deployment.docker": "Docker",
    "docs.section.deployment.docker.body":
      "backend/Dockerfile nutzt python:3.11-slim. EXPOSE 8000, Start mit uvicorn main:app --host 0.0.0.0 --port 8000.",
    "docs.section.deployment.env": "Umgebungsvariablen",
    "docs.section.operations.title": "Betrieb & Monitoring",
    "docs.section.operations.body":
      "Der Dienst schreibt strukturierte Logs. Wichtige Ereignisse: Anfrage angelegt, ähnliche Objekte gesucht, Rate-Limit überschritten, Health-Check fehlgeschlagen.",
    "docs.section.operations.health": "/health",
    "docs.section.operations.health.body":
      "Geeignet für Liveness/Readiness-Probes. Führt SELECT 1 FROM listings LIMIT 1 aus und prüft damit gleichzeitig das Schema.",
    "docs.section.operations.logs": "Logs",
    "docs.section.operations.logs.body":
      "Format %(asctime)s [%(levelname)s] %(name)s: %(message)s. Ereignisse sind mit similar_properties und inquiry_created prefixiert — leicht zu greppen.",
    "docs.section.operations.rate": "Rate-Limit zurücksetzen",
    "docs.section.operations.rate.body":
      "Limits liegen im In-Memory-_rate_buckets. Beim Neustart des Prozesses wird das Fenster automatisch zurückgesetzt.",
    "docs.section.compliance.title": "Compliance & Hinweise",
    "docs.compliance.legal":
      "Listing information is illustrative and subject to agent and owner verification. It is not an offer, investment advice, or a binding contract.",
    "docs.compliance.no-payments.title": "Keine Zahlungen",
    "docs.compliance.no-payments.body":
      "Der Dienst nimmt kein Geld an, eröffnet keine Wallets, zahlt keine Renditen aus, verkauft keine Investmentanteile und führt kein KYC durch.",
    "docs.compliance.dubai.title": "Dubai: DLD / RERA",
    "docs.compliance.dubai.body":
      "In Dubai muss jede Transaktion von einem beim Dubai Land Department (DLD) und RERA lizenzierten Makler begleitet werden. Die Informationen auf dieser Seite sind rein informativ:",
    "docs.compliance.dubai.broker": "überprüfen Sie die RERA-Nummer und den aktuellen Status des Maklers;",
    "docs.compliance.dubai.owner": "fordern Sie eine Eigentumsbestätigung über das DLD an;",
    "docs.compliance.dubai.contract": "unterschreiben Sie keine Zahlungsdokumente oder Formulare ohne Prüfung durch einen lizenzierten Spezialisten.",
    "docs.compliance.dubai.warn":
      "Berechnungen zu „Rendite\", „garantierter Miete" oder „Kapitalrückfluss" haben keinen Bezug zu diesem Dienst. Überweisen Sie kein Geld auf Bankdaten, die Sie auf dieser Seite finden.",
    "docs.section.faq.title": "Häufige Fragen",
    "docs.faq.q1.title": "Ist das eine Investmentplattform?",
    "docs.faq.q1.body":
      "Nein. Golden Key ist ein informativer Immobilienkatalog und ein Kontaktformular-Service. Es werden keine Investmentprodukte angeboten, keine Gelder angenommen und keine Renditen garantiert.",
    "docs.faq.q2.title": "Was passiert nach dem Absenden des Formulars?",
    "docs.faq.q2.body":
      "Ihre Anfrage landet in der Queue der Berater. Wir melden uns nur zum ausgewählten Objekt und nur über die angegebenen Kontaktdaten.",
    "docs.faq.q3.title": "Kann ich über die Seite zahlen?",
    "docs.faq.q3.body":
      "Nein. Die Seite nimmt keine Zahlungen an, speichert keine Bankdaten und stellt keine Rechnungen. Jede finanzielle Abwicklung erfolgt außerhalb der Plattform, kontrolliert von Ihrer Bank und einem lizenzierten Makler.",
    "docs.faq.q4.title": "Woher stammen die Katalogpreise?",
    "docs.faq.q4.body":
      "Preise werden beim Eigentümer oder seinem Vertreter erfragt und regelmäßig überprüft. Der Endpreis kann abweichen und muss schriftlich oder im Gespräch mit dem Makler bestätigt werden.",
    "docs.faq.q5.title": "Ist die Verfügbarkeit garantiert?",
    "docs.faq.q5.body":
      "Nein. Verfügbarkeit hängt vom Eigentümer und vom Markt ab. ACTIVE bedeutet nur, dass das Objekt veröffentlicht ist — es ersetzt weder Angebot noch Vertrag.",
    "docs.faq.q6.title": "Wie überprüfe ich einen Makler in Dubai?",
    "docs.faq.q6.body":
      "Fragen Sie nach der RERA-Nummer (Broker ID) und gleichen Sie sie mit den öffentlichen Registern des Dubai Land Department ab. Arbeiten Sie nicht mit Maklern ohne gültige, aktuelle Lizenz.",
    "docs.faq.q7.title": "Speichert die Seite meine Dokumente?",
    "docs.faq.q7.body":
      "Nein. Über das Formular erhalten wir nur Name, Kontakt und Nachrichtentext. Senden Sie weder Ausweis noch Bankdaten oder andere Dokumente — wir verarbeiten sie nicht.",
    "docs.faq.q8.title": "Wie erreiche ich Sie bei Rückfragen?",
    "docs.faq.q8.body":
      "Über das Formular auf einer Objektseite oder auf der Startseite — Schaltfläche „Auswahl anfordern". Wir antworten in der Reihenfolge der Anfragen.",

    "error.404.eyebrow": "404",
    "error.404.title": "Seite nicht gefunden",
    "error.404.body":
      "Die angeforderte Adresse existiert nicht. Möglicherweise wurde das Objekt entfernt oder der Link ist veraltet.",
    "error.404.cta.home": "Zur Startseite",
    "error.404.cta.docs": "Dokumentation öffnen",

    "copy.code": "Kopieren",
    "copied.code": "Kopiert",
  },

  es: {
    "meta.title": "Catálogo inmobiliario Dubái",
    "meta.description":
      "Catálogo inmobiliario en Dubái con selección personal y acompañamiento transparente.",
    "a11y.skip": "Saltar al contenido",

    "nav.catalog": "Propiedades",
    "nav.approach": "Enfoque",
    "nav.partners": "Aliados",
    "nav.menu.label": "Menú",
    "nav.menu.open": "Abrir navegación",
    "nav.menu.close": "Cerrar navegación",
    "header.cta": "Pedir selección",

    "hero.eyebrow": "Dubai property catalogue",
    "hero.title.a": "Propiedad en",
    "hero.title.b": "Dubái",
    "hero.title.c": "— un catálogo en el que puede confiar.",
    "hero.lead":
      "Selección informativa en los barrios emblemáticos de Dubái — desde áticos en Downtown hasta villas en Palm Jumeirah.",
    "hero.cta.primary": "Encontrar una propiedad",
    "hero.cta.secondary": "Ver selección",
    "hero.pillars.1": "Selección limitada",
    "hero.pillars.2": "Información verificable",
    "hero.pillars.3": "Acompañamiento sin prisa",

    "intro.label": "No un catálogo por el catálogo",
    "intro.kicker": "Golden Key Property",
    "intro.title.a": "Primero entendemos su ritmo de vida.",
    "intro.title.b": "Después",
    "intro.title.c": "abrimos las puertas correctas.",
    "intro.body":
      "Trabajamos con un número limitado de consultas a la vez: el asesor mantiene el contexto, y las recomendaciones nunca se convierten en un flujo de enlaces.",
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
      "Si considera Dubái como destino o busca una residencia, comience con una conversación introductoria sobre sus objetivos y presupuesto.",
    "partners.cta": "Ver la selección",
    "partners.notice":
      "Este sitio no ofrece productos financieros, no acepta transferencias y no garantiza rentabilidad.",

    "contact.eyebrow": "Start with a conversation",
    "contact.title.a": "Cuéntenos qué",
    "contact.title.b": "hogar",
    "contact.title.c": "busca.",
    "contact.cta": "Dejar una consulta",

    "footer.tagline": "Dubai property advisory",
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

    "nav.docs": "Documentación",
    "docs.meta.title": "Golden Key — documentación",
    "docs.meta.description":
      "Documentación técnica del catálogo informativo de propiedades de Golden Key.",
    "docs.eyebrow": "Documentation",
    "docs.title": "Golden Key — documentación de la plataforma",
    "docs.subtitle":
      "Referencia técnica del catálogo informativo de propiedades: arquitectura, endpoints, modelo de datos, despliegue y postura de cumplimiento.",
    "docs.code.shell": "bash",
    "docs.table.method": "Método",
    "docs.table.path": "Ruta",
    "docs.table.description": "Propósito",
    "docs.callout.note": "Nota:",
    "docs.callout.compliance": "Cumplimiento:",
    "docs.callout.warn": "Aviso:",
    "docs.callout.legal": "Aviso legal:",
    "docs.toc.title": "En esta página",
    "docs.toc.getting-started": "Primeros pasos",
    "docs.toc.architecture": "Arquitectura",
    "docs.toc.api": "Referencia de la API",
    "docs.toc.data": "Modelo de datos",
    "docs.toc.frontend": "Frontend",
    "docs.toc.deployment": "Despliegue",
    "docs.toc.operations": "Operaciones",
    "docs.toc.compliance": "Cumplimiento y avisos",
    "docs.toc.faq": "FAQ",
    "docs.section.getting-started.title": "Primeros pasos",
    "docs.section.getting-started.body":
      "Golden Key es una aplicación FastAPI con SQLite y un frontend estático. La plataforma es deliberadamente pequeña: un catálogo de propiedades y un formulario de contacto. Sin pagos, cuentas, KYC ni productos de inversión.",
    "docs.section.getting-started.install": "Ejecutar en local",
    "docs.section.getting-started.docker": "Docker",
    "docs.section.getting-started.env": "Variables de entorno",
    "docs.section.architecture.title": "Visión general de la arquitectura",
    "docs.section.architecture.body":
      "El servicio está construido sobre FastAPI. Cada petición pasa por una pila de middleware que fija cabeceras de seguridad (CSP, X-Frame-Options, Permissions-Policy, Referrer-Policy) y aplica un límite de velocidad a POST /api/inquiries. Los datos viven en SQLite a propósito: el catálogo es informativo, sin pagos ni requisitos de transacciones distribuidas.",
    "docs.architecture.note":
      "No hay colas, trabajos en segundo plano ni servicios externos: cada petición es completamente síncrona y se lee en un único archivo (backend/main.py).",
    "docs.section.api.title": "Referencia de la API",
    "docs.section.api.body":
      "La superficie pública es deliberadamente pequeña: leer el catálogo, ver una propiedad, obtener un recorrido virtual, similares y registrar una solicitud de contacto. Cada respuesta incluye un campo notice con un aviso legal.",
    "docs.section.api.list.title": "Inventario de endpoints",
    "docs.api.health": "Sondeo de salud del servicio y la base de datos.",
    "docs.api.properties.list": "Catálogo paginado con filtros.",
    "docs.api.properties.detail": "Ficha de una propiedad.",
    "docs.api.properties.tour": "Metadatos del recorrido virtual.",
    "docs.api.properties.similar": "Hasta tres propiedades similares (±30 % por precio).",
    "docs.api.inquiries": "Crear una solicitud de contacto. Con límite de velocidad.",
    "docs.api.compliance":
      "No hay ni habrá endpoints /api/payment, /api/kyc, /api/withdrawal ni /api/dashboard: el catálogo se mantiene informativo.",
    "docs.api.properties.list.body":
      "Devuelve una lista paginada de propiedades. Filtros: location (coincidencia parcial), minPrice, maxPrice, listingStatus. Por defecto solo se listan propiedades ACTIVE.",
    "docs.api.properties.detail.title": "/api/properties/{id}",
    "docs.api.properties.detail.body":
      "Devuelve un único registro y el aviso. 404 NOT_FOUND si el identificador no existe.",
    "docs.api.properties.tour.title": "/api/properties/{id}/tour",
    "docs.api.properties.tour.body":
      "Devuelve tourType (NONE, PHOTO_360, MODEL_3D, VIDEO_3D) y la URL del recorrido. El indicador isLocalModel indica al frontend que monte un modelo .glb local.",
    "docs.api.properties.similar.title": "/api/properties/{id}/similar",
    "docs.api.properties.similar.body":
      "Hasta tres propiedades en una banda de precio ±30 %, excluyendo la fuente. La propiedad fuente debe existir.",
    "docs.api.inquiries.title": "/api/inquiries (POST)",
    "docs.api.inquiries.body":
      "Crea una solicitud de contacto. El cuerpo es JSON con campos en camelCase. consentToContact es obligatorio. La respuesta incluye el identificador de la solicitud pero no hace eco de datos personales.",
    "docs.api.inquiries.warn":
      "POST /api/inquiries está limitado por una ventana deslizante (RATE_LIMIT_MAX peticiones en RATE_LIMIT_WINDOW segundos). Superarlo devuelve 429 RATE_LIMITED.",
    "docs.api.health.title": "/health",
    "docs.api.health.body":
      "Devuelve {\"status\": \"ok\"} cuando la base de datos está disponible. Si no, devuelve 503.",
    "docs.section.data.title": "Modelo de datos",
    "docs.section.data.body":
      "El esquema SQLite se crea al arrancar desde initialize_database. Las columnas images y features almacenan cadenas JSON, parseadas con _safe_json_list. asking_price_usd es el único valor monetario y se guarda únicamente como referencia.",
    "docs.data.note":
      "No hay a propósito columnas para saldos, monederos, transacciones, códigos de referido ni estados de KYC.",
    "docs.section.frontend.title": "Frontend: cómo encaja",
    "docs.section.frontend.body":
      "La página de inicio (/) es HTML estático con un pequeño cliente en vanilla JS. Sin bundlers ni dependencias, salvo @google/model-viewer para los recorridos 3D.",
    "docs.section.frontend.i18n": "i18n.js",
    "docs.section.frontend.i18n.body":
      "El diccionario TRANSLATIONS contiene claves para ru/en/de/es. Cada [data-i18n=\"key\"] recibe el texto al cargar y al cambiar de idioma.",
    "docs.section.frontend.app": "app.js",
    "docs.section.frontend.app.body":
      "Cliente principal: pide /api/properties, renderiza las fichas y abre los diálogos del formulario de contacto y del recorrido.",
    "docs.section.frontend.styles": "styles.css",
    "docs.section.frontend.styles.body":
      "Una hoja de estilos única para toda la plataforma. Las variables CSS viven en :root: paleta, espaciados, tipografía. docs.css las hereda.",
    "docs.section.frontend.dialogs": "Diálogos",
    "docs.section.frontend.dialogs.body":
      "Se usan elementos <dialog> nativos: el focus trap y el cierre con Esc funcionan de fábrica.",
    "docs.section.deployment.title": "Despliegue",
    "docs.section.deployment.body":
      "El servicio es deliberadamente sin estado sobre un archivo SQLite local. Eso simplifica los despliegues en Vercel o Docker: sin migraciones, sin colas.",
    "docs.section.deployment.vercel": "Vercel",
    "docs.section.deployment.vercel.body":
      "Usa vercel.json: redirige todo lo que no empiece por /api/ hacia backend/main.py como función serverless.",
    "docs.section.deployment.docker": "Docker",
    "docs.section.deployment.docker.body":
      "backend/Dockerfile usa python:3.11-slim. EXPOSE 8000, arranca con uvicorn main:app --host 0.0.0.0 --port 8000.",
    "docs.section.deployment.env": "Variables de entorno",
    "docs.section.operations.title": "Operaciones y monitorización",
    "docs.section.operations.body":
      "El servicio emite logs estructurados. Eventos relevantes: creación de solicitud, búsqueda de similares, superación del límite de velocidad, fallo del health check.",
    "docs.section.operations.health": "/health",
    "docs.section.operations.health.body":
      "Adecuado como probe de liveness/readiness. Ejecuta SELECT 1 FROM listings LIMIT 1, sirviendo también como smoke test del esquema.",
    "docs.section.operations.logs": "Logs",
    "docs.section.operations.logs.body":
      "Formato %(asctime)s [%(levelname)s] %(name)s: %(message)s. Los eventos llevan los prefijos similar_properties e inquiry_created, fáciles de filtrar con grep.",
    "docs.section.operations.rate": "Restablecer el límite de velocidad",
    "docs.section.operations.rate.body":
      "Los límites viven en _rate_buckets en memoria. La ventana se reinicia automáticamente al reiniciar el proceso.",
    "docs.section.compliance.title": "Cumplimiento y avisos",
    "docs.compliance.legal":
      "Listing information is illustrative and subject to agent and owner verification. It is not an offer, investment advice, or a binding contract.",
    "docs.compliance.no-payments.title": "Sin pagos",
    "docs.compliance.no-payments.body":
      "El servicio no acepta dinero, no abre monederos, no paga rendimientos, no vende participaciones de inversión ni realiza KYC.",
    "docs.compliance.dubai.title": "Dubái: DLD / RERA",
    "docs.compliance.dubai.body":
      "En Dubái, cualquier transacción debe ir acompañada de un corredor autorizado por el Dubai Land Department (DLD) y RERA. La información de este sitio es solo informativa:",
    "docs.compliance.dubai.broker": "verifica el número RERA y el estado actual del corredor;",
    "docs.compliance.dubai.owner": "solicita la confirmación de propiedad a través del DLD;",
    "docs.compliance.dubai.contract": "no firmes documentos de pago ni formularios sin la revisión de un profesional autorizado.",
    "docs.compliance.dubai.warn":
      "Cualquier cálculo de «rentabilidad», «alquiler garantizado» o «retorno de inversión» no tiene relación con este servicio. No transfieras fondos a cuentas bancarias que encuentres en el sitio.",
    "docs.section.faq.title": "Preguntas frecuentes",
    "docs.faq.q1.title": "¿Es una plataforma de inversión?",
    "docs.faq.q1.body":
      "No. Golden Key es un catálogo informativo de propiedades y un servicio de solicitudes de contacto. No ofrece productos de inversión, no acepta fondos y no garantiza rentabilidad.",
    "docs.faq.q2.title": "¿Qué pasa después de enviar el formulario?",
    "docs.faq.q2.body":
      "La solicitud entra en la cola de los asesores. Te contactan sobre la propiedad seleccionada y solo a través de los datos facilitados.",
    "docs.faq.q3.title": "¿Se puede pagar desde el sitio?",
    "docs.faq.q3.body":
      "No. El sitio no acepta pagos, no guarda datos bancarios ni emite facturas. Toda liquidación económica ocurre fuera de la plataforma, controlada por tu banco y un corredor autorizado.",
    "docs.faq.q4.title": "¿De dónde salen los precios del catálogo?",
    "docs.faq.q4.body":
      "Los precios se piden al propietario o a su representante y se revisan con regularidad. El precio final puede variar y debe confirmarse por escrito o en una reunión con el agente.",
    "docs.faq.q5.title": "¿Se garantiza la disponibilidad?",
    "docs.faq.q5.body":
      "No. La disponibilidad depende del propietario y del mercado. El estado ACTIVE significa que la propiedad está publicada, no que sustituye a una oferta o un contrato.",
    "docs.faq.q6.title": "¿Cómo verifico a un corredor en Dubái?",
    "docs.faq.q6.body":
      "Pide el número RERA (Broker ID) y compruébalo en los registros públicos del Dubai Land Department. No trabajes con corredores sin licencia vigente.",
    "docs.faq.q7.title": "¿El sitio guarda mis documentos?",
    "docs.faq.q7.body":
      "No. Por el formulario solo recibimos nombre, contacto y el mensaje. No envíes pasaporte, datos bancarios ni otros documentos: no los solicitamos ni los procesamos.",
    "docs.faq.q8.title": "¿Cómo contacto para resolver dudas?",
    "docs.faq.q8.body":
      "Usa el formulario en la página de una propiedad o en la página principal: el botón «Solicitar selección». Respondemos por orden de llegada.",

    "error.404.eyebrow": "404",
    "error.404.title": "Página no encontrada",
    "error.404.body":
      "La dirección solicitada no existe. Puede que la propiedad se haya retirado o que el enlace esté desactualizado.",
    "error.404.cta.home": "Volver al inicio",
    "error.404.cta.docs": "Abrir documentación",

    "copy.code": "Copiar",
    "copied.code": "Copiado",
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
