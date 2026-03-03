
      // Theme toggle (synced with rest of site)
      (function () {
        var root = document.documentElement;
        var btn = document.getElementById("themeToggle");
        var storageKey = "site:theme";
        var moonIcon = String.fromCodePoint(127769);
        var sunIcon = "\u2600\uFE0F";

        function isDarkNow() {
          var forced = root.getAttribute("data-theme");
          if (forced) return forced === "dark";
          return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        }

        function icon() {
          btn.textContent = isDarkNow() ? sunIcon : moonIcon;
          btn.setAttribute(
            "aria-label",
            isDarkNow() ? "Switch to light theme" : "Switch to dark theme"
          );
        }

        function updateThemeColor() {
          var m = document.querySelector('meta[name="theme-color"]');
          if (!m) {
            m = document.createElement("meta");
            m.name = "theme-color";
            document.head.appendChild(m);
          }
          var bg = getComputedStyle(root).getPropertyValue("--bg").trim() || "#ffffff";
          m.setAttribute("content", bg);
        }

        function apply(saved) {
          if (saved === "light" || saved === "dark") {
            root.setAttribute("data-theme", saved);
          } else {
            root.removeAttribute("data-theme");
          }
          icon();
          updateThemeColor();
        }

        var saved = localStorage.getItem(storageKey);
        apply(saved);

        btn.addEventListener("click", function () {
          var cur = localStorage.getItem(storageKey);
          var next = cur === "dark" ? "light" : "dark";
          localStorage.setItem(storageKey, next);
          apply(next);
        });

        if (!saved && window.matchMedia) {
          var mq = window.matchMedia("(prefers-color-scheme: dark)");
          mq.addEventListener("change", function () {
            apply(null);
          });
        }
      })();

      // Reader settings (saved per user)
      (function () {
        var root = document.documentElement;
        var toggle = document.getElementById("readerSettingsToggle");
        var panel = document.getElementById("readerSettingsPanel");
        var reset = document.getElementById("readerSettingsReset");
        var fontSizeInput = document.getElementById("readerFontSize");
        var lineHeightInput = document.getElementById("readerLineHeight");
        var widthInput = document.getElementById("readerContentWidth");
        var fontFamilyInput = document.getElementById("readerFontFamily");
        var fontSizeValue = document.getElementById("readerFontSizeValue");
        var lineHeightValue = document.getElementById("readerLineHeightValue");
        var widthValue = document.getElementById("readerContentWidthValue");
        var widthHint = document.getElementById("readerContentWidthHint");
        var widthAvailabilityQuery = window.matchMedia ? window.matchMedia("(min-width: 720px)") : null;

        if (
          !toggle ||
          !panel ||
          !reset ||
          !fontSizeInput ||
          !lineHeightInput ||
          !widthInput ||
          !fontFamilyInput ||
          !fontSizeValue ||
          !lineHeightValue ||
          !widthValue
        ) {
          return;
        }

        var storageKey = "reader:settings:v1";
        var fontStacks = {
          serif: '"Georgia", "Times New Roman", serif',
          book: '"Merriweather", "Georgia", "Times New Roman", serif',
          lora: '"Lora", "Georgia", "Times New Roman", serif',
          "source-serif": '"Source Serif 4", "Georgia", "Times New Roman", serif',
          sans: '"Roboto", "Segoe UI", system-ui, sans-serif',
          atkinson: '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif',
          nunito: '"Nunito Sans", "Segoe UI", system-ui, sans-serif',
          mono: '"Cascadia Mono", "Consolas", "Courier New", monospace'
        };
        var defaults = {
          fontScale: 1,
          lineHeight: 1.75,
          maxWidth: 800,
          fontFamily: "serif"
        };
        var settings = {
          fontScale: defaults.fontScale,
          lineHeight: defaults.lineHeight,
          maxWidth: defaults.maxWidth,
          fontFamily: defaults.fontFamily
        };
        var panelFocusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        function clamp(n, min, max) {
          return Math.min(max, Math.max(min, n));
        }

        function parseNumber(value, fallback) {
          var n = parseFloat(value);
          return Number.isFinite(n) ? n : fallback;
        }

        function normalize(raw) {
          var out = {
            fontScale: defaults.fontScale,
            lineHeight: defaults.lineHeight,
            maxWidth: defaults.maxWidth,
            fontFamily: defaults.fontFamily
          };
          if (!raw || typeof raw !== "object") return out;

          out.fontScale = clamp(parseNumber(raw.fontScale, defaults.fontScale), 0.85, 1.35);
          out.lineHeight = clamp(parseNumber(raw.lineHeight, defaults.lineHeight), 1.45, 2.1);
          out.maxWidth = clamp(Math.round(parseNumber(raw.maxWidth, defaults.maxWidth)), 620, 980);

          var family = String(raw.fontFamily || "").trim();
          out.fontFamily = fontStacks[family] ? family : defaults.fontFamily;
          return out;
        }

        function save() {
          try {
            localStorage.setItem(storageKey, JSON.stringify(settings));
          } catch (e) {}
        }

        function updateValueLabels() {
          fontSizeValue.textContent = Math.round(settings.fontScale * 100) + "%";
          lineHeightValue.textContent = settings.lineHeight.toFixed(2);
          widthValue.textContent = widthInput.disabled ? "Desktop only" : (settings.maxWidth + "px");
        }

        function updateWidthAvailability() {
          var widthControlEnabled = !widthAvailabilityQuery || widthAvailabilityQuery.matches;
          widthInput.disabled = !widthControlEnabled;
          if (widthHint) {
            widthHint.hidden = widthControlEnabled;
          }
          if (widthControlEnabled) {
            widthInput.removeAttribute("aria-describedby");
          } else if (widthHint) {
            widthInput.setAttribute("aria-describedby", "readerContentWidthHint");
          }
          updateValueLabels();
        }

        function syncInputs() {
          fontSizeInput.value = String(settings.fontScale);
          lineHeightInput.value = String(settings.lineHeight);
          widthInput.value = String(settings.maxWidth);
          fontFamilyInput.value = settings.fontFamily;
        }

        function apply() {
          root.style.setProperty("--reader-font-scale", settings.fontScale.toFixed(2));
          root.style.setProperty("--reader-line-height", settings.lineHeight.toFixed(2));
          root.style.setProperty("--reader-max-width", Math.round(settings.maxWidth) + "px");
          root.style.setProperty("--reader-font-family", fontStacks[settings.fontFamily]);
          syncInputs();
          updateWidthAvailability();
        }

        function panelFocusableElements() {
          return Array.prototype.slice.call(panel.querySelectorAll(panelFocusableSelector)).filter(function (node) {
            return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
          });
        }

        function openPanel() {
          if (!panel.hidden) return;
          panel.hidden = false;
          toggle.setAttribute("aria-expanded", "true");
          var firstField = fontSizeInput;
          if (!firstField || firstField.disabled) {
            var focusable = panelFocusableElements();
            firstField = focusable.length ? focusable[0] : panel;
          }
          if (firstField && typeof firstField.focus === "function") {
            firstField.focus();
          }
        }

        function closePanel() {
          if (panel.hidden) return;
          panel.hidden = true;
          toggle.setAttribute("aria-expanded", "false");
          if (typeof toggle.focus === "function") {
            toggle.focus();
          }
        }

        function togglePanel() {
          if (panel.hidden) openPanel();
          else closePanel();
        }

        try {
          settings = normalize(JSON.parse(localStorage.getItem(storageKey)));
        } catch (e) {
          settings = normalize(null);
        }
        apply();

        if (widthAvailabilityQuery) {
          var onWidthAvailabilityChange = function () {
            updateWidthAvailability();
          };
          if (typeof widthAvailabilityQuery.addEventListener === "function") {
            widthAvailabilityQuery.addEventListener("change", onWidthAvailabilityChange);
          } else if (typeof widthAvailabilityQuery.addListener === "function") {
            widthAvailabilityQuery.addListener(onWidthAvailabilityChange);
          }
        }

        fontSizeInput.addEventListener("input", function () {
          settings.fontScale = clamp(parseNumber(fontSizeInput.value, defaults.fontScale), 0.85, 1.35);
          apply();
          save();
        });

        lineHeightInput.addEventListener("input", function () {
          settings.lineHeight = clamp(parseNumber(lineHeightInput.value, defaults.lineHeight), 1.45, 2.1);
          apply();
          save();
        });

        widthInput.addEventListener("input", function () {
          if (widthInput.disabled) return;
          settings.maxWidth = clamp(Math.round(parseNumber(widthInput.value, defaults.maxWidth)), 620, 980);
          apply();
          save();
        });

        fontFamilyInput.addEventListener("change", function () {
          var value = String(fontFamilyInput.value || "").trim();
          settings.fontFamily = fontStacks[value] ? value : defaults.fontFamily;
          apply();
          save();
        });

        reset.addEventListener("click", function () {
          settings = normalize(defaults);
          apply();
          save();
        });

        toggle.addEventListener("click", function (event) {
          event.stopPropagation();
          togglePanel();
        });

        panel.addEventListener("click", function (event) {
          event.stopPropagation();
        });

        document.addEventListener("click", function (event) {
          if (panel.hidden) return;
          if (panel.contains(event.target) || toggle.contains(event.target)) return;
          closePanel();
        });

        document.addEventListener("keydown", function (event) {
          if (panel.hidden) return;
          if (event.key === "Escape") {
            event.preventDefault();
            closePanel();
            return;
          }

          if (event.key !== "Tab") return;
          var focusable = panelFocusableElements();
          if (!focusable.length) {
            event.preventDefault();
            panel.focus();
            return;
          }

          var first = focusable[0];
          var last = focusable[focusable.length - 1];
          var active = document.activeElement;
          if (event.shiftKey) {
            if (active === first || !panel.contains(active)) {
              event.preventDefault();
              last.focus();
            }
            return;
          }

          if (active === last || !panel.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        });
      })();

      // Swipe left/right on mobile for chapter navigation
      (function () {
        var prevLink = document.querySelector('.pager a[rel="prev"]');
        var nextLink = document.querySelector('.pager a[rel="next"]');
        if (!prevLink && !nextLink) return;

        var touchSupported = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        if (!touchSupported) return;

        var startX = 0;
        var startY = 0;
        var startedAt = 0;
        var tracking = false;
        var blocked = false;
        var MIN_DISTANCE = 78;
        var MAX_VERTICAL = 84;
        var MAX_DURATION = 720;
        var EDGE_GUARD = 24;

        function hasHorizontalScrollParent(target) {
          var node = target;
          while (node && node !== document.body) {
            var style = window.getComputedStyle(node);
            var overflowX = style ? style.overflowX : "";
            if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth + 6) {
              return true;
            }
            node = node.parentElement;
          }
          return false;
        }

        function isInteractiveTarget(target) {
          if (!target || !target.closest) return false;
          return !!target.closest(
            'input, select, textarea, button, [role="button"], a[href], .reader-settings'
          );
        }

        document.addEventListener(
          "touchstart",
          function (event) {
            if (!event.touches || event.touches.length !== 1) {
              tracking = false;
              blocked = true;
              return;
            }

            var touch = event.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startedAt = Date.now();
            blocked =
              startX <= EDGE_GUARD ||
              startX >= window.innerWidth - EDGE_GUARD ||
              hasHorizontalScrollParent(event.target) ||
              isInteractiveTarget(event.target);
            tracking = !blocked;
          },
          { passive: true }
        );

        document.addEventListener(
          "touchcancel",
          function () {
            tracking = false;
            blocked = false;
          },
          { passive: true }
        );

        document.addEventListener(
          "touchend",
          function (event) {
            if (!tracking || blocked || !event.changedTouches || !event.changedTouches.length) {
              tracking = false;
              blocked = false;
              return;
            }

            var touch = event.changedTouches[0];
            var dx = touch.clientX - startX;
            var dy = touch.clientY - startY;
            var elapsed = Date.now() - startedAt;
            tracking = false;
            blocked = false;

            if (elapsed > MAX_DURATION) return;
            if (Math.abs(dx) < MIN_DISTANCE) return;
            if (Math.abs(dy) > MAX_VERTICAL) return;
            if (Math.abs(dx) <= Math.abs(dy) * 1.3) return;

            if (dx < 0 && nextLink && nextLink.href) {
              window.location.href = nextLink.href;
            } else if (dx > 0 && prevLink && prevLink.href) {
              window.location.href = prevLink.href;
            }
          },
          { passive: true }
        );
      })();

      // Save + restore reading progress
      (function() {
        try {
          var bodyData = (document.body && document.body.dataset) || {};
          var novel = bodyData.novel || '';
          if (!novel) return;

          var chapterOrderRaw = bodyData.chapterOrder || '';
          var chapterOrder = (typeof chapterOrderRaw === 'number')
            ? chapterOrderRaw
            : parseInt(chapterOrderRaw, 10);
          if (!isFinite(chapterOrder)) chapterOrder = null;

          var chapterTitle = bodyData.chapterTitle || '';
          var path = location.pathname;
          var lastUrlKey = 'novel:'+novel+':lastUrl';
          var stateKey = 'novel:'+novel+':state';
          var chaptersKey = 'novel:'+novel+':chapters';
          var saveTimer = null;
          var restored = false;

          function clamp(n, min, max) {
            return Math.min(max, Math.max(min, n));
          }

          function safeParse(raw, fallback) {
            if (!raw) return fallback;
            try { return JSON.parse(raw); } catch (e) { return fallback; }
          }

          function docHeight() {
            var d = document.documentElement;
            var b = document.body;
            return Math.max(
              d ? d.scrollHeight : 0,
              d ? d.offsetHeight : 0,
              b ? b.scrollHeight : 0,
              b ? b.offsetHeight : 0
            );
          }

          function viewportHeight() {
            return window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 0;
          }

          function metrics() {
            var y = window.scrollY || window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
            var vh = viewportHeight();
            var dh = docHeight();
            var maxScroll = Math.max(0, dh - vh);
            var ratio = maxScroll <= 0 ? 1 : clamp(y / maxScroll, 0, 1);
            var remaining = Math.max(0, dh - (y + vh));
            var completed = maxScroll <= 0 || remaining <= Math.max(64, vh * 0.03);
            return {
              scrollY: Math.round(y),
              ratio: Number(ratio.toFixed(4)),
              completed: completed
            };
          }

          function saveProgress() {
            var m = metrics();
            var entry = {
              url: path,
              order: chapterOrder,
              title: chapterTitle || '',
              scrollY: m.scrollY,
              ratio: m.ratio,
              completed: m.completed,
              updatedAt: new Date().toISOString()
            };

            localStorage.setItem(lastUrlKey, path);
            localStorage.setItem(stateKey, JSON.stringify({
              lastUrl: entry.url,
              lastOrder: entry.order,
              lastTitle: entry.title,
              scrollY: entry.scrollY,
              ratio: entry.ratio,
              completed: entry.completed,
              updatedAt: entry.updatedAt
            }));

            var chapters = safeParse(localStorage.getItem(chaptersKey), {});
            if (!chapters || typeof chapters !== 'object' || Array.isArray(chapters)) chapters = {};
            chapters[path] = entry;
            localStorage.setItem(chaptersKey, JSON.stringify(chapters));
          }

          function scheduleSave() {
            if (saveTimer) return;
            saveTimer = setTimeout(function() {
              saveTimer = null;
              saveProgress();
            }, 250);
          }

          function restoreProgress() {
            if (restored) return;
            if (location.hash) return;

            var chapters = safeParse(localStorage.getItem(chaptersKey), {});
            if (!chapters || typeof chapters !== 'object') return;

            var entry = chapters[path];
            if (!entry || entry.completed) return;

            var target = null;
            if (typeof entry.scrollY === 'number' && isFinite(entry.scrollY)) {
              target = entry.scrollY;
            }
            if ((target == null || target <= 0) && typeof entry.ratio === 'number' && isFinite(entry.ratio)) {
              var maxScroll = Math.max(0, docHeight() - viewportHeight());
              target = clamp(entry.ratio, 0, 1) * maxScroll;
            }
            if (target == null || target < 48) return;

            restored = true;
            var apply = function() {
              var maxScroll = Math.max(0, docHeight() - viewportHeight());
              window.scrollTo(0, clamp(Math.round(target), 0, maxScroll));
            };

            requestAnimationFrame(function() {
              requestAnimationFrame(apply);
            });
            window.addEventListener('load', apply, { once: true });
            setTimeout(apply, 250);
            setTimeout(apply, 800);
          }

          restoreProgress();
          saveProgress();

          window.addEventListener('scroll', scheduleSave, { passive: true });
          window.addEventListener('resize', scheduleSave);
          window.addEventListener('pagehide', saveProgress);
          window.addEventListener('beforeunload', saveProgress);
          document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') saveProgress();
          });
        } catch(e) {}
      })();

      // Reading UI chrome: top progress bar + end-of-chapter completion panel
      (function() {
        var progressBar = document.getElementById('readProgressBar');
        var completionPanel = document.getElementById('chapterCompletionPanel');
        var completionText = document.getElementById('chapterCompletionText');
        var nextLink = document.querySelector('.pager a[rel="next"]');
        var rafPending = false;

        function clamp(n, min, max) {
          return Math.min(max, Math.max(min, n));
        }

        function docHeight() {
          var d = document.documentElement;
          var b = document.body;
          return Math.max(
            d ? d.scrollHeight : 0,
            d ? d.offsetHeight : 0,
            b ? b.scrollHeight : 0,
            b ? b.offsetHeight : 0
          );
        }

        function viewportHeight() {
          return window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 0;
        }

        function metrics() {
          var y = window.scrollY || window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
          var vh = viewportHeight();
          var dh = docHeight();
          var maxScroll = Math.max(0, dh - vh);
          var ratio = maxScroll <= 0 ? 1 : clamp(y / maxScroll, 0, 1);
          var remaining = Math.max(0, dh - (y + vh));
          var completed = maxScroll <= 0 || remaining <= Math.max(64, vh * 0.03);
          return { ratio: ratio, completed: completed };
        }

        function renderProgress(ratio) {
          if (!progressBar) return;
          progressBar.style.transform = 'scaleX(' + clamp(ratio, 0, 1) + ')';
        }

        function setCompletionVisible(visible) {
          if (!completionPanel) return;
          completionPanel.hidden = !visible;
        }

        function render() {
          rafPending = false;
          var m = metrics();
          renderProgress(m.ratio);
          setCompletionVisible(m.completed);
        }

        function scheduleRender() {
          if (rafPending) return;
          rafPending = true;
          requestAnimationFrame(render);
        }

        if (completionText) {
          completionText.textContent = nextLink ? 'Nice. Ready for the next chapter?' : 'You reached the end of this novel.';
        }

        window.addEventListener('scroll', scheduleRender, { passive: true });
        window.addEventListener('resize', scheduleRender);

        scheduleRender();
        window.addEventListener('load', scheduleRender, { once: true });
        setTimeout(scheduleRender, 250);
        setTimeout(scheduleRender, 800);
      })();

      // Prefetch next chapter for faster transitions (best effort)
      (function() {
        try {
          var nextLink = document.querySelector('.pager a[rel="next"]');
          if (!nextLink || !nextLink.href) return;

          var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
          var saveData = !!(connection && connection.saveData);
          var effectiveType = String(connection && connection.effectiveType || '').toLowerCase();
          var slowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';
          if (saveData || slowConnection) return;

          function injectPrefetch() {
            if (document.querySelector('link[rel="prefetch"][href="' + nextLink.href + '"]')) return;
            var prefetch = document.createElement('link');
            prefetch.rel = 'prefetch';
            prefetch.as = 'document';
            prefetch.href = nextLink.href;
            document.head.appendChild(prefetch);
          }

          if ('requestIdleCallback' in window) {
            requestIdleCallback(injectPrefetch, { timeout: 2200 });
          } else {
            setTimeout(injectPrefetch, 900);
          }
        } catch (e) {}
      })();

      // Ink That Reached Me: render journal box entries in monospace/preformatted text
      // so the vertical borders line up consistently.
      (function() {
        try {
          var bodyData = (document.body && document.body.dataset) || {};
          if (bodyData.novel !== 'ink-that-reached-me') return;

          var article = document.querySelector('main.reader article');
          if (!article) return;

          var boxChars = /[\u2554\u2557\u255A\u255D\u2551\u2560\u2563\u2550\u250F\u2513\u2517\u251B\u2503\u2523\u252B\u2501\u2502|]/;
          article.querySelectorAll('p').forEach(function(p) {
            var text = p.textContent || '';
            if (!boxChars.test(text)) return;
            // Require multiple lines to avoid styling normal prose that contains a symbol.
            if ((text.match(/\n/g) || []).length < 2) return;
            if (!/JOURNAL ENTRY/.test(text) && !/^[\s]*[\u2554\u250F|]/m.test(text)) return;
            p.classList.add('journal-box');
          });
        } catch (e) {}
      })();
    
