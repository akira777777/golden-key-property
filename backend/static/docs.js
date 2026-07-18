/* ============================================================
   docs.js — /docs page UI behaviours
   - Tab switching for code examples
   - Copy-to-clipboard buttons with toast feedback
   - Mobile TOC drawer
   - Smooth scroll for TOC anchors (respects reduced motion)
   - Active TOC highlighting via IntersectionObserver
   ============================================================ */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ---------- Copy-to-clipboard with toast ----------

  function ensureToast() {
    let toast = document.querySelector(".copy-toast");
    if (toast) return toast;
    toast = document.createElement("div");
    toast.className = "copy-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("data-i18n", "copy.code");
    toast.textContent = "Copy";
    document.body.appendChild(toast);
    return toast;
  }

  let toastTimer = null;
  function showToast(message, isError) {
    const toast = ensureToast();
    toast.textContent = message;
    toast.classList.toggle("is-visible", true);
    toast.style.background = isError
      ? "rgba(183, 28, 28, 0.95)"
      : "rgba(15, 43, 37, 0.95)";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1800);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext !== false) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        /* fall through to legacy path */
      }
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch (_) {
      return false;
    }
  }

  function attachCopyHandlers(root) {
    const buttons = root.querySelectorAll("[data-copy-code]");
    buttons.forEach(function (button) {
      button.addEventListener("click", async function () {
        const selector = button.getAttribute("data-copy-code");
        const target = selector ? document.querySelector(selector) : null;
        const codeEl = target
          ? target.querySelector("pre code") || target.querySelector("pre") || target
          : null;
        const text = codeEl ? codeEl.innerText : "";
        const ok = await copyToClipboard(text);
        if (ok) {
          button.classList.add("is-copied");
          window.setTimeout(function () {
            button.classList.remove("is-copied");
          }, 1400);
          showToast(
            (window.GK_I18N && window.GK_I18N.t("copied.code")) || "Copied",
            false
          );
        } else {
          showToast("Copy failed", true);
        }
      });
    });
  }

  // ---------- Tabs ----------

  function attachTabs(root) {
    const groups = root.querySelectorAll("[data-tabs]");
    groups.forEach(function (group) {
      const tabs = group.querySelectorAll("[data-tab]");
      const panels = group.querySelectorAll("[data-tab-panel]");
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          const target = tab.getAttribute("data-tab");
          tabs.forEach(function (t) {
            t.classList.toggle("is-active", t === tab);
            t.setAttribute("aria-selected", t === tab ? "true" : "false");
          });
          panels.forEach(function (panel) {
            panel.classList.toggle(
              "is-active",
              panel.getAttribute("data-tab-panel") === target
            );
          });
        });
      });
    });
  }

  // ---------- Mobile TOC drawer ----------

  function attachTocToggle(root) {
    const toggle = root.querySelector("[data-docs-toc-toggle]");
    const toc = root.querySelector("[data-docs-toc]");
    if (!toggle || !toc) return;
    toggle.addEventListener("click", function () {
      toc.classList.toggle("is-open");
      const expanded = toc.classList.contains("is-open");
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
    // Close drawer when a TOC link is clicked on small screens.
    toc.querySelectorAll("a[href^='#']").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 960) {
          toc.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  // ---------- Smooth scroll (respect reduced motion) ----------

  function attachSmoothScroll(root) {
    const links = root.querySelectorAll("[data-docs-toc] a[href^='#']");
    links.forEach(function (link) {
      link.addEventListener("click", function (event) {
        const id = link.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        if (prefersReducedMotion) {
          target.scrollIntoView({ block: "start" });
        } else {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        history.replaceState(null, "", id);
      });
    });
  }

  // ---------- Active TOC highlighting ----------

  function attachActiveToc(root) {
    const tocLinks = Array.from(
      root.querySelectorAll("[data-docs-toc] a[href^='#']")
    );
    if (!tocLinks.length) return;
    const byId = {};
    tocLinks.forEach(function (link) {
      const id = link.getAttribute("href").slice(1);
      byId[id] = link;
    });
    const sections = Object.keys(byId)
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(Boolean);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const link = byId[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            tocLinks.forEach(function (other) {
              other.classList.toggle("is-active", other === link);
            });
          }
        });
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: 0,
      }
    );
    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  // ---------- Boot ----------

  function boot() {
    const shell = document.querySelector("[data-docs-shell]");
    if (!shell) return;
    attachTabs(shell);
    attachCopyHandlers(shell);
    attachTocToggle(shell);
    attachSmoothScroll(shell);
    attachActiveToc(shell);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();