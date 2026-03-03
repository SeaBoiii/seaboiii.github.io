
   var yearNode = document.getElementById("year");
   if (yearNode) yearNode.textContent = new Date().getFullYear();

      (function () {
        var root = document.documentElement;
        var btn = document.getElementById("themeToggle");
        var storageKey = "site:theme";

        function isDarkNow() {
          var forced = root.getAttribute("data-theme");
          if (forced) return forced === "dark";
          return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        }

        var moonIcon = String.fromCodePoint(127769);
        var sunIcon = "\u2600\uFE0F";

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

      (function () {
        var search = document.getElementById("novelSearch");
        var grid = document.getElementById("novelGrid");
        var count = document.getElementById("resultsCount");
        var statusSelect = document.getElementById("statusFilter");
        var categorySelect = document.getElementById("categoryFilter");
        var sortSelect = document.getElementById("sortFilter");
        var seriesSelect = document.getElementById("seriesFilter");
        var filterToggle = document.getElementById("filterToggle");
        var filterPanel = document.getElementById("filterPanel");
        var emptyStateCard = document.getElementById("novelEmptyState");
        var clearFiltersBtn = document.getElementById("clearFiltersBtn");
        var clearFiltersTopBtn = document.getElementById("clearFiltersTop");
        var controlsActions = document.getElementById("controlsActions");
        var activeFilterChips = document.getElementById("activeFilterChips");
        var secretBtn = document.getElementById("secretBtn");
        if (
          !search ||
          !grid ||
          !count ||
          !statusSelect ||
          !categorySelect ||
          !sortSelect ||
          !seriesSelect ||
          !filterToggle ||
          !filterPanel ||
          !secretBtn
        ) return;
        var cards = Array.prototype.slice.call(grid.querySelectorAll(".novel-card"));
        var activeStatusFilter = "all";
        var activeSeriesFilter = "all";
        var activeSeriesNameFilter = "all";
        var activeSortFilter = "recent";
        var isFilterPanelOpen = false;
        var unlockedKey = "site:novels-unlocked";
        var uiStateKey = "site:novels-ui";
        var correctPassword = "seaboiii";
        var focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        var lockIcon = String.fromCodePoint(128274);
        var unlockIcon = String.fromCodePoint(128275);

        cards.forEach(function (card, idx) {
          card.dataset.initialIndex = String(idx);
        });

        function hashSeriesHue(seriesId) {
          var hash = 17;
          var text = String(seriesId || "");
          for (var i = 0; i < text.length; i += 1) {
            hash = (hash * 31 + text.charCodeAt(i)) % 360;
          }
          return (hash + 21) % 360;
        }

        function applySeriesColorSchemes() {
          var paletteBySeries = Object.create(null);
          cards.forEach(function (card) {
            var seriesId = (card.dataset.series || "").trim();
            if (!seriesId) return;

            if (!paletteBySeries[seriesId]) {
              var hue = hashSeriesHue(seriesId);
              paletteBySeries[seriesId] = {
                border: "hsl(" + hue + " 62% 50%)",
                soft: "hsl(" + hue + " 92% 95%)",
                softDark: "hsl(" + hue + " 46% 18%)",
                tag: "hsl(" + hue + " 88% 92%)",
                tagDark: "hsl(" + hue + " 52% 25%)"
              };
            }

            var palette = paletteBySeries[seriesId];
            card.style.setProperty("--series-border", palette.border);
            card.style.setProperty("--series-soft", palette.soft);
            card.style.setProperty("--series-soft-dark", palette.softDark);
            card.style.setProperty("--series-tag", palette.tag);
            card.style.setProperty("--series-tag-dark", palette.tagDark);
          });
        }

        function loadUiState() {
          try {
            var raw = localStorage.getItem(uiStateKey);
            if (!raw) return {};
            var data = JSON.parse(raw);
            return (data && typeof data === "object") ? data : {};
          } catch (e) {
            return {};
          }
        }

        function saveUiState() {
          var payload = {
            statusFilter: activeStatusFilter,
            seriesFilter: activeSeriesFilter,
            seriesNameFilter: activeSeriesNameFilter,
            sortFilter: activeSortFilter,
            searchTerm: (search.value || "").trim(),
            filterPanelOpen: !!isFilterPanelOpen
          };
          try {
            localStorage.setItem(uiStateKey, JSON.stringify(payload));
          } catch (e) {}
        }

        function normalizeChoice(value, allowed, fallback) {
          if (allowed.indexOf(value) >= 0) return value;
          return fallback;
        }

        function countActiveFilters() {
          var n = 0;
          if (activeStatusFilter !== "all") n += 1;
          if (activeSeriesFilter !== "all") n += 1;
          if (activeSortFilter !== "recent") n += 1;
          if (activeSeriesNameFilter !== "all") n += 1;
          if ((search.value || "").trim()) n += 1;
          return n;
        }

        function updateFilterToggleLabel() {
          var count = countActiveFilters();
          filterToggle.textContent = count > 0 ? ("Filters (" + count + ")") : "Filters";
        }

        function normalizeSearchText(value) {
          return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
        }

        function isTypingContext(target) {
          if (!target || !target.closest) return false;
          return !!target.closest('input, textarea, select, [contenteditable], [contenteditable="true"]');
        }

        function getUnlockedState() {
          return localStorage.getItem(unlockedKey) === "true";
        }

        function optionLabel(select, value) {
          var label = "";
          Array.prototype.forEach.call(select.options, function (opt) {
            if (!label && opt.value === value) label = (opt.textContent || "").trim();
          });
          return label || value;
        }

        function updateClearButtons() {
          var hasFilters = countActiveFilters() > 0;
          if (clearFiltersBtn) clearFiltersBtn.disabled = !hasFilters;
          if (clearFiltersTopBtn) {
            clearFiltersTopBtn.disabled = !hasFilters;
            clearFiltersTopBtn.hidden = !hasFilters;
          }
          if (controlsActions) controlsActions.hidden = !hasFilters;
        }

        function renderActiveFilterChips() {
          if (!activeFilterChips) return;
          var chips = [];
          var searchTerm = (search.value || "").trim();
          if (searchTerm) chips.push({ type: "search", label: 'Search: "' + searchTerm + '"' });
          if (activeStatusFilter !== "all") chips.push({ type: "status", label: "Status: " + optionLabel(statusSelect, activeStatusFilter) });
          if (activeSeriesFilter !== "all") chips.push({ type: "category", label: "Category: " + optionLabel(categorySelect, activeSeriesFilter) });
          if (activeSortFilter !== "recent") chips.push({ type: "sort", label: "Sort: " + optionLabel(sortSelect, activeSortFilter) });
          if (activeSeriesNameFilter !== "all") chips.push({ type: "series", label: "Series: " + optionLabel(seriesSelect, activeSeriesNameFilter) });

          activeFilterChips.innerHTML = "";
          activeFilterChips.hidden = chips.length === 0;
          chips.forEach(function (chip) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "active-filter-chip";
            btn.dataset.filterType = chip.type;
            btn.textContent = chip.label + " x";
            btn.setAttribute("aria-label", "Remove " + chip.label + " filter");
            activeFilterChips.appendChild(btn);
          });
        }

        function getPanelFocusableElements() {
          return Array.prototype.slice.call(filterPanel.querySelectorAll(focusableSelector)).filter(function (node) {
            return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
          });
        }

        function focusFirstFilterField() {
          var first = filterPanel.querySelector("select:not([disabled]), input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])");
          if (first && typeof first.focus === "function") {
            first.focus();
            return;
          }
          filterPanel.focus();
        }

        function setFilterPanelOpen(open, options) {
          options = options || {};
          var shouldMoveFocus = !!options.moveFocus;
          var shouldRestoreFocus = !!options.restoreFocus;
          isFilterPanelOpen = !!open;
          filterPanel.hidden = !isFilterPanelOpen;
          filterPanel.setAttribute("aria-hidden", isFilterPanelOpen ? "false" : "true");
          filterToggle.setAttribute("aria-expanded", isFilterPanelOpen ? "true" : "false");
          if (isFilterPanelOpen && shouldMoveFocus) {
            focusFirstFilterField();
          } else if (!isFilterPanelOpen && shouldRestoreFocus && typeof filterToggle.focus === "function") {
            filterToggle.focus();
          }
          saveUiState();
        }

        function syncSecretButton() {
          var unlocked = getUnlockedState();
          secretBtn.textContent = unlocked ? unlockIcon : lockIcon;
          secretBtn.title = unlocked ? unlockIcon : lockIcon;
          secretBtn.setAttribute("aria-label", unlocked ? "Hide hidden novels" : "Unlock hidden novels");
        }

        function clearAllFilters() {
          activeStatusFilter = "all";
          activeSeriesFilter = "all";
          activeSortFilter = "recent";
          activeSeriesNameFilter = "all";
          search.value = "";
          statusSelect.value = activeStatusFilter;
          categorySelect.value = activeSeriesFilter;
          sortSelect.value = activeSortFilter;
          seriesSelect.value = optionExists(seriesSelect, "all") ? "all" : seriesSelect.value;
          update();
        }

        function normalizeMetaRows() {
          if (!grid) return;
          grid.querySelectorAll(".novel-meta").forEach(function (meta) {
            var hasRows = false;
            Array.prototype.forEach.call(meta.children, function (child) {
              if (child.classList && child.classList.contains("meta-row")) {
                hasRows = true;
              }
            });
            if (hasRows) return;

            var badges = Array.prototype.filter.call(meta.children, function (child) {
              return child.classList && child.classList.contains("badge");
            });
            if (!badges.length) return;

            var statusBadge = null;
            badges.forEach(function (badge) {
              if (
                !statusBadge &&
                (badge.classList.contains("complete") || badge.classList.contains("incomplete"))
              ) {
                statusBadge = badge;
              }
            });

            if (!statusBadge) {
              statusBadge = badges[0];
            }

            var statusRow = document.createElement("div");
            statusRow.className = "meta-row meta-row-status";
            statusRow.appendChild(statusBadge);

            var extraRow = document.createElement("div");
            extraRow.className = "meta-row meta-row-extra";
            badges.forEach(function (badge) {
              if (badge !== statusBadge) {
                extraRow.appendChild(badge);
              }
            });

            meta.innerHTML = "";
            meta.appendChild(statusRow);
            if (extraRow.childElementCount > 0) {
              meta.appendChild(extraRow);
            }
          });
        }

        function hasSeries(card) {
          return !!(card.dataset.series || "").trim();
        }

        function matchesSeriesFilter(card) {
          if (activeSeriesFilter === "all") return true;
          if (activeSeriesFilter === "series") return hasSeries(card);
          if (activeSeriesFilter === "standalone") return !hasSeries(card);
          return true;
        }

        function matchesSeriesNameFilter(card) {
          if (activeSeriesNameFilter === "all") return true;
          return (card.dataset.series || "").trim() === activeSeriesNameFilter;
        }

        function cardTitle(card) {
          var raw = (card.dataset.title || "").trim();
          if (raw) return raw.toLowerCase();
          var node = card.querySelector(".novel-title");
          return node ? (node.textContent || "").trim().toLowerCase() : "";
        }

        function titleCaseWords(s) {
          return String(s || "")
            .split(/\s+/)
            .filter(Boolean)
            .map(function (word) {
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(" ");
        }

        function fallbackSeriesLabel(seriesId) {
          return titleCaseWords(String(seriesId || "").replace(/[-_]+/g, " "));
        }

        function seriesLabelFromCard(card) {
          var badge = card.querySelector('.novel-meta .badge[title^="Series:"]');
          if (badge) {
            var text = (badge.textContent || "").trim();
            if (text) return text;
            var title = (badge.getAttribute("title") || "").trim();
            var m = title.match(/^Series:\s*(.+)$/i);
            if (m && m[1]) return m[1].trim();
          }
          return fallbackSeriesLabel((card.dataset.series || "").trim());
        }

        function cardSearchText(card) {
          var parts = [];
          var titleNode = card.querySelector(".novel-title");
          var titleText = (card.dataset.title || (titleNode && titleNode.textContent) || "").trim();
          var status = (card.dataset.status || "").trim();
          var seriesId = (card.dataset.series || "").trim();
          var seriesLabel = seriesLabelFromCard(card);
          var relation = (card.dataset.relation || "").trim();
          var relatedTo = (card.dataset.relatedTo || "").trim();
          var order = (card.dataset.order || "").trim();
          var hidden = card.dataset.hidden === "true";

          if (titleText) parts.push(titleText);
          if (status) parts.push(status);
          if (seriesId) parts.push(seriesId.replace(/[-_]+/g, " "));
          if (seriesLabel) parts.push(seriesLabel);
          if (relation) parts.push(relation.replace(/[-_]+/g, " "));
          if (relatedTo) parts.push(relatedTo.replace(/[-_]+/g, " "));
          if (order) {
            parts.push("book " + order);
            parts.push("order " + order);
          }
          if (hidden) parts.push("hidden");

          Array.prototype.forEach.call(card.querySelectorAll(".novel-meta .badge"), function (badge) {
            var badgeText = (badge.textContent || "").trim();
            var badgeTitle = (badge.getAttribute("title") || "").trim();
            if (badgeText) parts.push(badgeText);
            if (badgeTitle) parts.push(badgeTitle);
          });

          return normalizeSearchText(parts.join(" "));
        }

        function refreshCardSearchIndex() {
          cards.forEach(function (card) {
            card.dataset.search = cardSearchText(card);
          });
        }

        function cardSeriesOrder(card) {
          var raw = (card.dataset.order || "").trim();
          if (!raw) return 2147483647;
          var n = parseInt(raw, 10);
          return Number.isFinite(n) ? n : 2147483647;
        }

        function sortCards() {
          var sorted = cards.slice();
          sorted.sort(function (a, b) {
            var aIdx = parseInt(a.dataset.initialIndex || "0", 10) || 0;
            var bIdx = parseInt(b.dataset.initialIndex || "0", 10) || 0;

            if (activeSortFilter === "recent") {
              if (aIdx !== bIdx) return bIdx - aIdx;
              return 0;
            }

            if (activeSortFilter === "original") {
              if (aIdx !== bIdx) return aIdx - bIdx;
              return 0;
            }

            if (activeSortFilter === "alpha") {
              var alphaCmp = cardTitle(a).localeCompare(cardTitle(b));
              if (alphaCmp !== 0) return alphaCmp;
              return aIdx - bIdx;
            }

            if (activeSortFilter === "series-order") {
              var aSeries = (a.dataset.series || "").trim();
              var bSeries = (b.dataset.series || "").trim();
              var aHasSeries = !!aSeries;
              var bHasSeries = !!bSeries;

              if (aHasSeries !== bHasSeries) return aHasSeries ? -1 : 1;
              if (aHasSeries && bHasSeries) {
                var seriesCmp = seriesLabelFromCard(a).localeCompare(seriesLabelFromCard(b));
                if (seriesCmp !== 0) return seriesCmp;

                var orderCmp = cardSeriesOrder(a) - cardSeriesOrder(b);
                if (orderCmp !== 0) return orderCmp;
              }

              var titleCmp = cardTitle(a).localeCompare(cardTitle(b));
              if (titleCmp !== 0) return titleCmp;
              return aIdx - bIdx;
            }

            return aIdx - bIdx;
          });

          sorted.forEach(function (card) {
            grid.appendChild(card);
          });
        }

        function optionExists(select, value) {
          var found = false;
          Array.prototype.forEach.call(select.options, function (opt) {
            if (!found && opt.value === value) found = true;
          });
          return found;
        }

        function buildSeriesSelectOptions() {
          var seen = Object.create(null);
          var items = [];
          cards.forEach(function (card) {
            var seriesId = (card.dataset.series || "").trim();
            if (!seriesId || seen[seriesId]) return;
            seen[seriesId] = true;
            items.push({
              id: seriesId,
              label: seriesLabelFromCard(card)
            });
          });

          items.sort(function (a, b) {
            return a.label.localeCompare(b.label);
          });

          var preferred = activeSeriesNameFilter;
          seriesSelect.innerHTML = "";

          var allOpt = document.createElement("option");
          allOpt.value = "all";
          allOpt.textContent = "All series";
          seriesSelect.appendChild(allOpt);

          items.forEach(function (item) {
            var opt = document.createElement("option");
            opt.value = item.id;
            opt.textContent = item.label;
            opt.title = "Only " + item.label;
            seriesSelect.appendChild(opt);
          });

          seriesSelect.disabled = !items.length;
          if (!items.length) {
            activeSeriesNameFilter = "all";
            seriesSelect.value = "all";
            return;
          }

          activeSeriesNameFilter = optionExists(seriesSelect, preferred) ? preferred : "all";
          seriesSelect.value = activeSeriesNameFilter;
        }

        function shouldShow(card) {
          var searchable = card.dataset.search || cardSearchText(card);
          var status = card.dataset.status || "";
          var hidden = card.dataset.hidden === "true";
          var term = normalizeSearchText(search.value || "");

          var matchesTerm = !term || searchable.indexOf(term) >= 0;
          var matchesStatus = activeStatusFilter === "all" || status === activeStatusFilter;
          var matchesSeries = matchesSeriesFilter(card);
          var matchesSeriesName = matchesSeriesNameFilter(card);
          var unlocked = getUnlockedState();

          return matchesTerm && matchesStatus && matchesSeries && matchesSeriesName && (unlocked || !hidden);
        }

        function update() {
          var visible = 0;
          sortCards();
          cards.forEach(function (card) {
            var show = shouldShow(card);
            card.style.display = show ? "flex" : "none";
            if (show) visible += 1;
          });
          if (emptyStateCard) {
            emptyStateCard.hidden = visible !== 0;
          }
          count.textContent = visible + " novel" + (visible === 1 ? "" : "s") + " shown";
          updateFilterToggleLabel();
          renderActiveFilterChips();
          updateClearButtons();
          saveUiState();
        }

        var savedUi = loadUiState();
        activeStatusFilter = normalizeChoice(savedUi.statusFilter, ["all", "complete", "incomplete"], "all");
        activeSeriesFilter = normalizeChoice(savedUi.seriesFilter, ["all", "series", "standalone"], "all");
        activeSortFilter = normalizeChoice(savedUi.sortFilter, ["recent", "original", "alpha", "series-order"], "recent");
        isFilterPanelOpen = !!savedUi.filterPanelOpen;
        activeSeriesNameFilter = (typeof savedUi.seriesNameFilter === "string" && savedUi.seriesNameFilter.trim())
          ? savedUi.seriesNameFilter.trim()
          : "all";
        if (typeof savedUi.searchTerm === "string") {
          search.value = savedUi.searchTerm;
        }

        applySeriesColorSchemes();
        normalizeMetaRows();
        buildSeriesSelectOptions();
        refreshCardSearchIndex();

        statusSelect.value = activeStatusFilter;
        categorySelect.value = activeSeriesFilter;
        sortSelect.value = activeSortFilter;
        if (optionExists(seriesSelect, activeSeriesNameFilter)) {
          seriesSelect.value = activeSeriesNameFilter;
        } else {
          seriesSelect.value = "all";
          activeSeriesNameFilter = "all";
        }
        setFilterPanelOpen(isFilterPanelOpen, { moveFocus: false, restoreFocus: false });

        statusSelect.addEventListener("change", function () {
          activeStatusFilter = normalizeChoice(statusSelect.value, ["all", "complete", "incomplete"], "all");
          update();
        });

        categorySelect.addEventListener("change", function () {
          activeSeriesFilter = normalizeChoice(categorySelect.value, ["all", "series", "standalone"], "all");
          update();
        });

        sortSelect.addEventListener("change", function () {
          activeSortFilter = normalizeChoice(sortSelect.value, ["recent", "original", "alpha", "series-order"], "recent");
          update();
        });

        seriesSelect.addEventListener("change", function () {
          activeSeriesNameFilter = seriesSelect.value || "all";
          update();
        });

        filterToggle.addEventListener("click", function () {
          var willOpen = !isFilterPanelOpen;
          setFilterPanelOpen(willOpen, { moveFocus: willOpen, restoreFocus: !willOpen });
          updateFilterToggleLabel();
        });

        if (clearFiltersBtn) {
          clearFiltersBtn.addEventListener("click", function () {
            clearAllFilters();
            search.focus();
          });
        }

        if (clearFiltersTopBtn) {
          clearFiltersTopBtn.addEventListener("click", function () {
            clearAllFilters();
            search.focus();
          });
        }

        if (activeFilterChips) {
          activeFilterChips.addEventListener("click", function (event) {
            var chip = event.target && event.target.closest
              ? event.target.closest("button[data-filter-type]")
              : null;
            if (!chip) return;

            var type = chip.dataset.filterType || "";
            if (type === "search") {
              search.value = "";
            } else if (type === "status") {
              activeStatusFilter = "all";
              statusSelect.value = "all";
            } else if (type === "category") {
              activeSeriesFilter = "all";
              categorySelect.value = "all";
            } else if (type === "sort") {
              activeSortFilter = "recent";
              sortSelect.value = "recent";
            } else if (type === "series") {
              activeSeriesNameFilter = "all";
              seriesSelect.value = "all";
            }

            update();
          });
        }

        if (secretBtn) {
          secretBtn.addEventListener("click", function () {
            var isUnlocked = getUnlockedState();
            if (isUnlocked) {
              localStorage.removeItem(unlockedKey);
              syncSecretButton();
              update();
              return;
            }

            var pwd = prompt("Enter password to unlock hidden novels:");
            if (pwd === correctPassword) {
              localStorage.setItem(unlockedKey, "true");
              syncSecretButton();
              update();
            } else if (pwd) {
              alert("Incorrect password.");
            }
          });
        }

        document.addEventListener("click", function (event) {
          if (isFilterPanelOpen) {
            if (!filterPanel.contains(event.target) && !filterToggle.contains(event.target)) {
              setFilterPanelOpen(false, { restoreFocus: true });
            }
          }
        });

        document.addEventListener("keydown", function (event) {
          var plainKey = !event.altKey && !event.ctrlKey && !event.metaKey;
          if (plainKey && event.key === "/" && !isTypingContext(event.target) && !isFilterPanelOpen) {
            event.preventDefault();
            search.focus();
            search.select();
            return;
          }

          if (event.key === "Escape") {
            if (isFilterPanelOpen) {
              event.preventDefault();
              setFilterPanelOpen(false, { restoreFocus: true });
              return;
            }
            if ((!isTypingContext(event.target) || document.activeElement === search) && search.value) {
              event.preventDefault();
              search.value = "";
              update();
              return;
            }
          }

          if (!isFilterPanelOpen) return;

          if (event.key !== "Tab") return;
          var focusable = getPanelFocusableElements();
          if (!focusable.length) {
            event.preventDefault();
            filterPanel.focus();
            return;
          }

          var first = focusable[0];
          var last = focusable[focusable.length - 1];
          var active = document.activeElement;

          if (event.shiftKey) {
            if (active === first || !filterPanel.contains(active)) {
              event.preventDefault();
              last.focus();
            }
            return;
          }

          if (active === last || !filterPanel.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        });

        search.addEventListener("input", update);
        syncSecretButton();

        update();
      })();
  
