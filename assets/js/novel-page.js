
function novelsHideCompleteStatusEnabled() {
  try {
    return localStorage.getItem('site:novels-debug-hide-complete-status') === 'true';
  } catch (e) {
    return false;
  }
}

function applyNovelStatusBadgeDebug(scope) {
  if (!scope || !novelsHideCompleteStatusEnabled()) return;

  Array.prototype.slice.call(scope.querySelectorAll('.badge.complete, .related-badge.complete')).forEach(function(node) {
    node.hidden = true;
    node.style.display = 'none';
  });

  Array.prototype.slice.call(scope.querySelectorAll('.meta-row, .related-meta')).forEach(function(container) {
    var hasVisible = Array.prototype.some.call(container.children, function(child) {
      return child.nodeType === 1 && !child.hidden && child.style.display !== 'none';
    });
    container.hidden = !hasVisible;
  });
}

// Continue Reading + chapter progress UI (per novel)
(function() {
  var slug = (document.body && document.body.dataset && document.body.dataset.novelSlug) || '';
  var lastUrlKey = 'novel:'+slug+':lastUrl';
  var stateKey = 'novel:'+slug+':state';
  var chaptersKey = 'novel:'+slug+':chapters';
  var continueBtn = document.getElementById('continueReading');
  var list = document.getElementById('chapterList');
  var state = {};
  var chapters = {};
  var saved = '';

  function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function normalizePath(url) {
    if (!url) return '';
    var s = String(url);
    try {
      if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
    } catch (e) {}
    s = s.replace(/\/index\.html$/i, '/');
    if (s.length > 1) s = s.replace(/\/+$/, '');
    return s;
  }

  function toFiniteNumber(value) {
    var n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }

  function getListItemByUrl(url) {
    if (!list) return null;
    var target = normalizePath(url);
    if (!target) return null;
    var match = null;
    list.querySelectorAll('li').forEach(function(li) {
      if (!match && normalizePath(li.dataset.url) === target) match = li;
    });
    return match;
  }

  function getNextListItem(li) {
    if (!li) return null;
    var next = li.nextElementSibling;
    while (next && next.tagName !== 'LI') next = next.nextElementSibling;
    return next || null;
  }

  function renderContinue(url) {
    if (!continueBtn || !url) return;
    var li = getListItemByUrl(url);
    var chapterNo = li ? li.dataset.no : ((state && state.lastOrder != null) ? state.lastOrder : '');
    var label = chapterNo ? ('Continue Chapter ' + chapterNo) : 'Continue';
    continueBtn.href = url;
    continueBtn.textContent = label;
    continueBtn.setAttribute('aria-label', label);
    continueBtn.style.display = 'inline-block';
  }

  function hasMeaningfulProgress(url) {
    var path = normalizePath(url);
    if (!path) return false;

    var entry = chapters[path];
    if (entry && entry.completed) return true;
    if (entry) {
      var entryRatio = toFiniteNumber(entry.ratio);
      var entryScroll = toFiniteNumber(entry.scrollY);
      if (entryRatio != null && entryRatio >= 0.02) return true;
      if (entryScroll != null && entryScroll >= 120) return true;
    }

    if (state && normalizePath(state.lastUrl) === path) {
      if (state.completed) return true;
      var stateRatio = toFiniteNumber(state.ratio);
      var stateScroll = toFiniteNumber(state.scrollY);
      if (stateRatio != null && stateRatio >= 0.02) return true;
      if (stateScroll != null && stateScroll >= 120) return true;
      var lastOrder = parseInt(state.lastOrder, 10);
      var firstLi = list ? list.querySelector('li[data-url]') : null;
      var firstOrder = firstLi ? parseInt(firstLi.dataset.no, 10) : NaN;
      if (Number.isFinite(lastOrder) && (!Number.isFinite(firstOrder) || lastOrder > firstOrder)) {
        return true;
      }
    }

    return false;
  }

  try {
    state = safeParse(localStorage.getItem(stateKey), {}) || {};
    var rawChapters = safeParse(localStorage.getItem(chaptersKey), {}) || {};
    Object.keys(rawChapters).forEach(function(k) {
      chapters[normalizePath(k)] = rawChapters[k];
    });
    saved = (state && state.lastUrl) || localStorage.getItem(lastUrlKey) || '';
  } catch (e) {
    state = {};
    chapters = {};
    saved = '';
  }

  var resumeUrl = saved;
  if (saved) {
    var savedPath = normalizePath(saved);
    var savedEntry = chapters[savedPath];
    var savedLi = getListItemByUrl(saved);
    var isCompleted = !!(savedEntry && savedEntry.completed);
    if (!isCompleted && state && state.lastUrl && normalizePath(state.lastUrl) === savedPath) {
      isCompleted = !!state.completed;
    }
    if (isCompleted && savedLi) {
      var nextLi = getNextListItem(savedLi);
      if (nextLi) {
        resumeUrl = nextLi.dataset.url || (nextLi.querySelector('a') && nextLi.querySelector('a').getAttribute('href')) || saved;
      }
    }
    if (hasMeaningfulProgress(saved)) {
      renderContinue(resumeUrl);
    }
  }

  if (!list) return;
  var savedPath = normalizePath(saved);
  var lastReadItem = null;
  list.querySelectorAll('li').forEach(function(li) {
    var path = normalizePath(li.dataset.url);
    var entry = chapters[path];
    if (savedPath && path && path === savedPath) {
      li.classList.add('last-read');
      lastReadItem = li;
    }
    if (!entry) return;
    if (entry.completed) li.classList.add('completed');
  });

  if (!lastReadItem || location.hash) return;
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(function() {
    var rect = lastReadItem.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    var comfortablyVisible = rect.top >= 96 && rect.bottom <= Math.max(140, viewportHeight - 72);
    if (comfortablyVisible) return;
    lastReadItem.scrollIntoView({ block: 'center', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
})();

// Defer loading of high-resolution cover preview until intent (hover/focus/touch)
(function() {
  var cover = document.querySelector('.novel-hero-cover');
  var popoverImage = document.querySelector('.cover-popover img[data-src]');
  if (!cover || !popoverImage) return;

  function ensurePopoverImageLoaded() {
    if (popoverImage.dataset.loaded === 'true') return;
    var src = popoverImage.getAttribute('data-src');
    if (!src) return;
    popoverImage.onerror = function() {
      var fallback = popoverImage.getAttribute('data-fallback');
      if (!fallback) return;
      popoverImage.onerror = null;
      popoverImage.src = fallback;
    };
    popoverImage.src = src;
    popoverImage.dataset.loaded = 'true';
  }

  cover.addEventListener('mouseenter', ensurePopoverImageLoaded, { once: true });
  cover.addEventListener('focusin', ensurePopoverImageLoaded, { once: true });
  cover.addEventListener('touchstart', ensurePopoverImageLoaded, { once: true, passive: true });
})();

function ensureGalleryLinkMedia(link) {
  if (!link) return;
  var picture = link.querySelector('picture[data-deferred-media]');
  if (!picture || picture.dataset.mediaReady === 'true') return;

  Array.prototype.forEach.call(picture.querySelectorAll('source[data-srcset]'), function(source) {
    var srcset = source.getAttribute('data-srcset');
    if (!srcset) return;
    source.srcset = srcset;
    source.removeAttribute('data-srcset');
  });

  var img = picture.querySelector('img');
  if (img) {
    var srcset = img.getAttribute('data-srcset');
    if (srcset) {
      img.srcset = srcset;
      img.removeAttribute('data-srcset');
    }
    var src = img.getAttribute('data-src');
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
  }

  picture.dataset.mediaReady = 'true';
}

// Defer gallery thumbnail media until the gallery approaches the viewport.
(function() {
  var links = Array.prototype.slice.call(document.querySelectorAll('.novel-gallery-link'));
  if (!links.length) return;

  function activate(link) {
    ensureGalleryLinkMedia(link);
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        activate(entry.target);
      });
    }, { rootMargin: '360px 0px' });

    links.forEach(function(link) {
      observer.observe(link);
    });
  } else {
    links.forEach(activate);
  }

  links.forEach(function(link) {
    var warm = function() { activate(link); };
    link.addEventListener('mouseenter', warm, { once: true });
    link.addEventListener('focusin', warm, { once: true });
    link.addEventListener('touchstart', warm, { once: true, passive: true });
  });
})();

// Gallery lightbox: browse all gallery images without leaving the novel page
(function() {
  var links = Array.prototype.slice.call(document.querySelectorAll('.novel-gallery-link[data-gallery-full]'));
  var lightbox = document.getElementById('galleryLightbox');
  if (!links.length || !lightbox) return;

  var backdrop = lightbox.querySelector('[data-gallery-dismiss]');
  var closeBtn = lightbox.querySelector('[data-gallery-close]');
  var prevBtn = lightbox.querySelector('[data-gallery-prev]');
  var nextBtn = lightbox.querySelector('[data-gallery-next]');
  var dialog = lightbox.querySelector('.gallery-lightbox-dialog');
  var image = document.getElementById('galleryLightboxImage');
  var counter = document.getElementById('galleryLightboxCounter');
  var description = document.getElementById('galleryLightboxDescription');
  var openOriginal = document.getElementById('galleryLightboxOpenOriginal');
  if (!backdrop || !closeBtn || !prevBtn || !nextBtn || !dialog || !image || !counter || !openOriginal) return;

  var activeIndex = 0;
  var opened = false;
  var lastFocused = null;
  var touchStartX = null;
  var lightboxLoadToken = 0;
  var lightboxPreloadCache = Object.create(null);

  function clampIndex(index) {
    if (!links.length) return 0;
    var n = index % links.length;
    return n < 0 ? n + links.length : n;
  }

  function currentLink() {
    return links[activeIndex] || null;
  }

  function lightboxDisplaySrc(link) {
    return link.getAttribute('data-gallery-lightbox') || link.getAttribute('data-gallery-full') || link.getAttribute('href') || '';
  }

  function lightboxFullSrc(link) {
    return link.getAttribute('data-gallery-full') || link.getAttribute('href') || '';
  }

  function lightboxThumbSrc(link) {
    var thumb = link.querySelector('img');
    if (!thumb) return '';
    var src = thumb.currentSrc || thumb.getAttribute('src') || '';
    return /^data:image\/gif/i.test(src) ? '' : src;
  }

  function cacheLightboxImage(src) {
    if (!src || lightboxPreloadCache[src]) return;
    var preload = new Image();
    preload.decoding = 'async';
    preload.src = src;
    if (typeof preload.decode === 'function') {
      preload.decode().catch(function() {});
    }
    lightboxPreloadCache[src] = preload;
  }

  function prefetchLightboxNeighbors(index) {
    [index - 1, index + 1].forEach(function(candidate) {
      var link = links[clampIndex(candidate)];
      if (!link) return;
      cacheLightboxImage(lightboxDisplaySrc(link));
    });
  }

  function setLightboxImageSource(src, fallback) {
    image.onerror = function() {
      if (!fallback || src === fallback) return;
      image.onerror = null;
      image.src = fallback;
    };
    image.src = src;
  }

  function updateLightbox(index) {
    activeIndex = clampIndex(index);
    var link = currentLink();
    if (!link) return;
    ensureGalleryLinkMedia(link);

    var full = lightboxFullSrc(link);
    var display = lightboxDisplaySrc(link);
    var thumb = lightboxThumbSrc(link);
    var alt = link.getAttribute('data-gallery-alt') || '';
    var desc = link.getAttribute('data-gallery-description') || '';
    image.alt = alt;
    if (thumb) {
      image.onerror = null;
      image.src = thumb;
    }
    counter.textContent = (activeIndex + 1) + ' / ' + links.length;
    if (description) {
      description.textContent = desc;
      description.hidden = !desc;
    }
    openOriginal.href = full || '#';

    var requestToken = ++lightboxLoadToken;
    if (!display || display === full) {
      setLightboxImageSource(full, full);
      prefetchLightboxNeighbors(activeIndex);
      return;
    }

    var preload = new Image();
    preload.decoding = 'async';
    preload.onload = function() {
      if (lightboxLoadToken !== requestToken) return;
      setLightboxImageSource(display, full);
      prefetchLightboxNeighbors(activeIndex);
    };
    preload.onerror = function() {
      if (lightboxLoadToken !== requestToken) return;
      setLightboxImageSource(full, full);
      prefetchLightboxNeighbors(activeIndex);
    };
    preload.src = display;
    if (preload.complete && preload.naturalWidth > 0) {
      preload.onload();
    }
  }

  function openAt(index) {
    if (!links.length) return;
    lastFocused = document.activeElement;
    opened = true;
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('gallery-lightbox-open');
    updateLightbox(index);
    closeBtn.focus();
  }

  function closeLightbox() {
    if (!opened) return;
    opened = false;
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gallery-lightbox-open');
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  function nextImage() {
    updateLightbox(activeIndex + 1);
  }

  function prevImage() {
    updateLightbox(activeIndex - 1);
  }

  links.forEach(function(link, index) {
    var prewarm = function() {
      ensureGalleryLinkMedia(link);
      cacheLightboxImage(lightboxDisplaySrc(link));
    };

    link.addEventListener('mouseenter', prewarm, { once: true });
    link.addEventListener('focusin', prewarm, { once: true });
    link.addEventListener('touchstart', prewarm, { once: true, passive: true });
    link.addEventListener('click', function(event) {
      event.preventDefault();
      prewarm();
      openAt(index);
    });
  });

  backdrop.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function(event) {
    if (!opened) return;
    if (dialog.contains(event.target)) return;
    closeLightbox();
  });
  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', prevImage);
  nextBtn.addEventListener('click', nextImage);

  document.addEventListener('keydown', function(event) {
    if (!opened) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextImage();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prevImage();
    }
  });

  lightbox.addEventListener('touchstart', function(event) {
    if (!opened || !event.touches || !event.touches.length) return;
    touchStartX = event.touches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener('touchend', function(event) {
    if (!opened || touchStartX === null || !event.changedTouches || !event.changedTouches.length) return;
    var dx = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) nextImage();
    else prevImage();
  }, { passive: true });
})();

// Filter chapters
(function() {
  var q = document.getElementById('chapterSearch');
  var list = document.getElementById('chapterList');
  var empty = document.getElementById('chapterSearchEmpty');
  var choiceHint = document.getElementById('choiceEpilogueHint');
  var continueBtn = document.getElementById('continueReading');
  if (!q || !list) return;

  var chapterItems = Array.prototype.slice.call(list.querySelectorAll('li[data-url]'));

  function normalizePath(url) {
    if (!url) return '';
    var s = String(url);
    try {
      if (/^https?:\/\//i.test(s)) s = new URL(s).pathname;
    } catch (e) {}
    s = s.replace(/\/index\.html$/i, '/');
    if (s.length > 1) s = s.replace(/\/+$/, '');
    return s;
  }

  function normalizeEpilogueMarker(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d+$/.test(raw)) return String(parseInt(raw, 10));
    if (/^[a-z]+$/i.test(raw)) return raw.toUpperCase();
    return '';
  }

  function isRomanNumeralMarker(value) {
    var token = String(value || '').trim().toUpperCase();
    if (!token) return false;
    // Valid Roman numerals from 1 to 3999 (I..MMMCMXCIX).
    return /^(?=[MDCLXVI]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(token);
  }

  function parseEpilogueInfo(titleText, rawUrl, rawName) {
    var title = String(titleText || '').trim();
    var url = decodeURIComponent(String(rawUrl || ''));
    var name = decodeURIComponent(String(rawName || ''));
    var marker = '';

    var titleMarker = title.match(/^\s*epilogue\b(?:\s+([a-z]+|\d+))?(?=\s*(?:[:.\-\u2013\u2014]|$))/i);
    if (titleMarker && titleMarker[1]) marker = normalizeEpilogueMarker(titleMarker[1]);

    if (!marker) {
      var source = name || (url.split(/[?#]/)[0].split('/').pop() || '');
      source = source.replace(/\.[a-z0-9]+$/i, '');
      var sourceMarker = source.match(/^epilogue[\s._-]*([a-z]+|\d+)$/i);
      if (sourceMarker && sourceMarker[1]) marker = normalizeEpilogueMarker(sourceMarker[1]);
    }

    var isEpilogue = /^\s*epilogue\b/i.test(title) ||
      /^epilogue/i.test(name) ||
      /(^|[\/._-])epilogue([\/._-]|$)/i.test(url);

    return { isEpilogue: isEpilogue, marker: marker };
  }

  function cleanDisplayTitle(text) {
    var value = String(text || '').trim();
    value = value.replace(/^\s*chapter\b\s*\d+\s*[:.\-\u2013\u2014]*\s*/i, '').trim();
    value = value.replace(/^\s*epilogue\b(?:\s+(?:[a-z]+|\d+))?\s*[:.\-\u2013\u2014]*\s*/i, '').trim();
    return value;
  }

  var epilogueCount = 0;
  chapterItems.forEach(function(li) {
    var titleNode = li.querySelector('.chapter-title');
    var rawTitle = titleNode ? titleNode.textContent : (li.dataset.rawTitle || li.dataset.title || '');
    var info = parseEpilogueInfo(rawTitle, li.dataset.url, li.dataset.name);
    li.dataset.isEpilogue = info.isEpilogue ? 'true' : 'false';
    li.dataset.epilogueMarker = info.marker || '';
    if (info.isEpilogue) epilogueCount += 1;
  });

  var epilogueOrdinal = 0;
  var choiceMarkers = [];
  chapterItems.forEach(function(li) {
    var noNode = li.querySelector('.chapter-no');
    var titleNode = li.querySelector('.chapter-title');
    if (!titleNode || !noNode) return;

    var rawTitle = String(li.dataset.rawTitle || titleNode.textContent || '').trim();
    var cleaned = cleanDisplayTitle(rawTitle);
    var displayTitle = cleaned || rawTitle;
    titleNode.textContent = displayTitle;
    li.dataset.title = displayTitle.toLowerCase();

    var isEpilogue = li.dataset.isEpilogue === 'true';
    var marker = li.dataset.epilogueMarker || '';
    var label = '';

    if (isEpilogue) {
      epilogueOrdinal += 1;
      if (epilogueCount === 1) {
        label = 'Epilogue';
        marker = '';
      } else {
        if (!marker) marker = String(epilogueOrdinal);
        label = 'Epilogue ' + marker;
      }
    } else {
      label = 'Chapter ' + (li.dataset.no || '');
    }

    noNode.textContent = label;
    li.dataset.displayLabel = label.toLowerCase();

    var isChoiceEnding = isEpilogue &&
      epilogueCount > 1 &&
      /^[A-Z]+$/.test(marker) &&
      !isRomanNumeralMarker(marker);
    li.dataset.choiceEnding = isChoiceEnding ? 'true' : 'false';
    if (isChoiceEnding) {
      choiceMarkers.push(marker);
      var badge = document.createElement('span');
      badge.className = 'chapter-choice';
      badge.textContent = 'Choose one ending';
      badge.title = 'Choice ending: choose this epilogue path to reach your desired ending.';
      titleNode.appendChild(badge);

      var anchor = li.querySelector('a');
      if (anchor) {
        anchor.setAttribute('aria-label', label + ': ' + displayTitle + '. Choice ending. Choose your desired ending path.');
      }
    }

    var searchText = [li.dataset.title, li.dataset.displayLabel, String(li.dataset.no || '')].join(' ').toLowerCase();
    if (isEpilogue) searchText += ' epilogue';
    if (isChoiceEnding) searchText += ' choice ending choose one';
    li.dataset.search = searchText;
  });

  if (choiceHint) {
    var uniqueMarkers = Array.from(new Set(choiceMarkers)).sort();
    if (uniqueMarkers.length > 0) {
      choiceHint.textContent = 'Choice epilogues available: Epilogue ' + uniqueMarkers.join(' / ') + '. Choose one ending path.';
      choiceHint.hidden = false;
    } else {
      choiceHint.hidden = true;
    }
  }

  function refreshContinueLabel() {
    if (!continueBtn || continueBtn.style.display === 'none') return;
    var href = continueBtn.getAttribute('href');
    if (!href) return;
    var target = normalizePath(href);
    if (!target) return;

    var matched = null;
    chapterItems.forEach(function(li) {
      if (matched) return;
      if (normalizePath(li.dataset.url) === target) matched = li;
    });
    if (!matched) return;

    var displayLabel = String(matched.dataset.displayLabel || '').trim();
    if (!displayLabel) return;
    var text = 'Continue ' + displayLabel.replace(/\s+/g, ' ');
    continueBtn.textContent = text;
    continueBtn.setAttribute('aria-label', text);
  }
  refreshContinueLabel();

  function applyChapterFilter() {
    var v = q.value.trim().toLowerCase();
    var visible = 0;
    chapterItems.forEach(function(li) {
      var hit = !v || String(li.dataset.search || '').includes(v);
      li.style.display = hit ? '' : 'none';
      if (hit) visible += 1;
    });
    if (empty) empty.hidden = visible !== 0;
  }

  q.addEventListener('input', applyChapterFilter);
  applyChapterFilter();
})();

// Keyboard shortcuts for chapter list search
(function() {
  var chapterSearch = document.getElementById('chapterSearch');
  if (!chapterSearch) return;

  function isTypingContext(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('input, textarea, select, [contenteditable], [contenteditable="true"]');
  }

  document.addEventListener('keydown', function(event) {
    var plainKey = !event.altKey && !event.ctrlKey && !event.metaKey;
    if (plainKey && event.key === '/' && !isTypingContext(event.target)) {
      event.preventDefault();
      chapterSearch.focus();
      chapterSearch.select();
      return;
    }
    if (event.key === 'Escape' && document.activeElement === chapterSearch && chapterSearch.value) {
      event.preventDefault();
      chapterSearch.value = '';
      chapterSearch.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
})();

// Related novels list from /novel/index.html
(function() {
  var slug = (document.body && document.body.dataset && document.body.dataset.novelSlug) || '';
  var section = document.getElementById('relatedNovelsSection');
  var summary = document.getElementById('relatedNovelsSummary');
  var list = document.getElementById('relatedNovelsList');
  var heroMeta = document.querySelector('.novel-hero .novel-meta');
  var unlockedKey = 'site:novels-unlocked';
  var indexUrl = (document.body && document.body.dataset && document.body.dataset.indexUrl) || '/novel/index.html';
  var relatedFetchStarted = false;

  if (!slug || !section || !summary || !list || !window.fetch || !window.DOMParser) return;
  applyNovelStatusBadgeDebug(document);

  function clean(value) {
    return String(value || '').trim();
  }

  function normalizeSlug(value) {
    return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function slugFromUrl(url) {
    var s = clean(url);
    if (!s) return '';
    var m = s.match(/\/novel\/([^\/?#]+)(?:\/|\/index\.html)?(?:[?#].*)?$/i);
    return m ? normalizeSlug(m[1]) : '';
  }

  function titleCase(value) {
    return clean(value)
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map(function(word) { return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); })
      .join(' ');
  }

  function normalizeRelation(value) {
    var token = clean(value).toLowerCase().replace(/[^a-z]+/g, '');
    if (!token) return '';
    if (token === 'spinoff') return 'spin-off';
    if (token === 'prequel' || token === 'sequel' || token === 'companion' || token === 'original') return token;
    return '';
  }

  function relationLabel(value) {
    var key = normalizeRelation(value);
    if (!key) return '';
    if (key === 'spin-off') return 'Spin-off';
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  function inverseRelation(value) {
    var key = normalizeRelation(value);
    if (key === 'prequel') return 'sequel';
    if (key === 'sequel') return 'prequel';
    if (key === 'spin-off') return 'spin-off';
    if (key === 'companion') return 'companion';
    if (key === 'original') return 'original';
    return '';
  }

  function parseSeriesLabel(card, fallbackSeriesId) {
    var badge = card.querySelector('.novel-meta .badge[title^="Series:"]');
    if (badge) {
      var text = clean(badge.textContent);
      if (text) return text;
      var title = clean(badge.getAttribute('title'));
      var m = title.match(/^Series:\s*(.+)$/i);
      if (m && m[1]) return clean(m[1]);
    }
    return fallbackSeriesId ? titleCase(fallbackSeriesId) : '';
  }

  function parseOrder(raw) {
    var n = parseInt(clean(raw), 10);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  }

  function cardTitle(card) {
    var titleNode = card.querySelector('.novel-title');
    var titleText = clean(titleNode ? titleNode.textContent : '');
    if (titleText) return titleText;
    var raw = clean(card.getAttribute('data-title'));
    return raw ? titleCase(raw) : '';
  }

  function captureAttrs(node, keys) {
    var attrs = {};
    if (!node) return attrs;
    keys.forEach(function(key) {
      var value = clean(node.getAttribute(key));
      if (value) attrs[key] = value;
    });
    return attrs;
  }

  function parseCover(card) {
    var picture = card.querySelector('picture');
    if (picture) {
      var sources = [];
      picture.querySelectorAll('source').forEach(function(sourceNode) {
        var sourceAttrs = captureAttrs(sourceNode, ['type', 'srcset', 'sizes', 'media']);
        if (Object.keys(sourceAttrs).length) sources.push(sourceAttrs);
      });
      var imgAttrs = captureAttrs(picture.querySelector('img'), ['src', 'srcset', 'sizes']);
      if (imgAttrs.src || imgAttrs.srcset || sources.length) {
        return { kind: 'picture', sources: sources, img: imgAttrs };
      }
    }
    var imgAttrsFallback = captureAttrs(card.querySelector('img'), ['src', 'srcset', 'sizes']);
    if (imgAttrsFallback.src || imgAttrsFallback.srcset) {
      return { kind: 'img', img: imgAttrsFallback };
    }
    return null;
  }

  function fallbackSrcFromSrcset(srcset) {
    var raw = clean(srcset);
    if (!raw) return '';
    var first = raw.split(',')[0] || '';
    var token = clean(first.split(' ')[0]);
    return token;
  }

  function buildCoverElement(cover, title) {
    var wrap = document.createElement('span');
    wrap.className = 'related-cover-wrap';
    var altText = title ? (title + ' cover art') : 'Novel cover art';
    if (!cover) return wrap;

    if (cover.kind === 'picture') {
      var picture = document.createElement('picture');
      (cover.sources || []).forEach(function(sourceInfo) {
        var source = document.createElement('source');
        Object.keys(sourceInfo).forEach(function(key) {
          source.setAttribute(key, sourceInfo[key]);
        });
        picture.appendChild(source);
      });
      var pictureImg = document.createElement('img');
      if (cover.img && cover.img.src) pictureImg.src = cover.img.src;
      if (cover.img && cover.img.srcset) pictureImg.srcset = cover.img.srcset;
      if (cover.img && cover.img.sizes) pictureImg.sizes = cover.img.sizes;
      if (!pictureImg.src && pictureImg.srcset) {
        var derivedSrc = fallbackSrcFromSrcset(pictureImg.srcset);
        if (derivedSrc) pictureImg.src = derivedSrc;
      }
      pictureImg.alt = altText;
      pictureImg.decoding = 'async';
      pictureImg.loading = 'lazy';
      picture.appendChild(pictureImg);
      wrap.appendChild(picture);
      return wrap;
    }

    var img = document.createElement('img');
    if (cover.img && cover.img.src) img.src = cover.img.src;
    if (cover.img && cover.img.srcset) img.srcset = cover.img.srcset;
    if (cover.img && cover.img.sizes) img.sizes = cover.img.sizes;
    if (!img.src && img.srcset) {
      var fallbackSrc = fallbackSrcFromSrcset(img.srcset);
      if (fallbackSrc) img.src = fallbackSrc;
    }
    img.alt = altText;
    img.decoding = 'async';
    img.loading = 'lazy';
    wrap.appendChild(img);
    return wrap;
  }

  function parseCard(card) {
    var anchor = card.querySelector('a[href]');
    var href = anchor ? clean(anchor.getAttribute('href')) : '';
    var cardSlug = slugFromUrl(href);
    var seriesId = clean(card.getAttribute('data-series'));

    return {
      slug: cardSlug,
      url: href,
      title: cardTitle(card),
      seriesId: seriesId,
      seriesLabel: parseSeriesLabel(card, seriesId),
      cover: parseCover(card),
      status: clean(card.getAttribute('data-status')).toLowerCase(),
      order: parseOrder(card.getAttribute('data-order')),
      relationType: normalizeRelation(card.getAttribute('data-relation')),
      relatedTo: normalizeSlug(card.getAttribute('data-related-to')),
      hidden: clean(card.getAttribute('data-hidden')).toLowerCase() === 'true'
    };
  }

  function isDirectRelation(current, candidate) {
    if (!current || !candidate) return false;
    return (candidate.relatedTo && candidate.relatedTo === current.slug) ||
      (current.relatedTo && current.relatedTo === candidate.slug);
  }

  function relationToCurrent(current, candidate) {
    if (!current || !candidate) return '';
    if (candidate.relatedTo && candidate.relatedTo === current.slug && candidate.relationType) {
      return candidate.relationType;
    }
    if (current.relatedTo && current.relatedTo === candidate.slug && current.relationType) {
      return inverseRelation(current.relationType);
    }
    if (current.seriesId && candidate.seriesId && current.seriesId === candidate.seriesId) {
      return 'same-series';
    }
    return '';
  }

  function createBadge(text, className) {
    var el = document.createElement('span');
    el.className = 'related-badge' + (className ? (' ' + className) : '');
    el.textContent = text;
    return el;
  }

  function createHeroRelationshipBadge(text, titleText) {
    var badge = document.createElement('span');
    badge.className = 'badge js-relationship-badge';
    badge.textContent = text;
    if (titleText) badge.title = titleText;
    return badge;
  }

  function mountHeroRelationshipBadges(current, bySlug) {
    if (!heroMeta || !current) return;

    Array.prototype.slice.call(heroMeta.querySelectorAll('.js-relationship-badge')).forEach(function(node) {
      node.remove();
    });

    var badges = [];
    if (current.seriesLabel) {
      badges.push(createHeroRelationshipBadge(current.seriesLabel, 'Series: ' + current.seriesLabel));
    }
    if (Number.isFinite(current.order) && current.order < Number.MAX_SAFE_INTEGER) {
      badges.push(createHeroRelationshipBadge('Book ' + current.order, 'Recommended reading order'));
    }
    if (current.relationType) {
      var label = relationLabel(current.relationType);
      if (label) {
        var relationTitle = label;
        if (current.relatedTo) {
          var relatedNovel = bySlug[current.relatedTo];
          var relatedLabel = relatedNovel && relatedNovel.title
            ? relatedNovel.title
            : titleCase(String(current.relatedTo).replace(/-/g, ' '));
          relationTitle = label + ' to ' + relatedLabel;
        }
        badges.push(createHeroRelationshipBadge(label, relationTitle));
      }
    }

    if (!badges.length) return;

    var chapterBadge = null;
    Array.prototype.slice.call(heroMeta.querySelectorAll('.badge')).forEach(function(node) {
      if (!chapterBadge && /chapters\s*:/i.test(String(node.textContent || ''))) {
        chapterBadge = node;
      }
    });

    var insertBeforeNode = chapterBadge ? chapterBadge.nextSibling : null;
    badges.forEach(function(node) {
      if (insertBeforeNode) {
        heroMeta.insertBefore(node, insertBeforeNode);
      } else {
        heroMeta.appendChild(node);
      }
    });
  }

  function loadRelatedNovels() {
    if (relatedFetchStarted) return;
    relatedFetchStarted = true;

    fetch(indexUrl, { credentials: 'same-origin' })
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.text();
      })
      .then(function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var cards = Array.prototype.slice.call(doc.querySelectorAll('.novel-card'));
        if (!cards.length) return;

        var bySlug = {};
        cards.forEach(function(card) {
          var data = parseCard(card);
          if (data.slug) bySlug[data.slug] = data;
        });

        var current = bySlug[normalizeSlug(slug)];
        if (!current) return;
        mountHeroRelationshipBadges(current, bySlug);
        applyNovelStatusBadgeDebug(heroMeta);

        var unlocked = localStorage.getItem(unlockedKey) === 'true';
        var related = Object.keys(bySlug)
          .map(function(key) { return bySlug[key]; })
          .filter(function(item) {
            if (!item || item.slug === current.slug) return false;
            if (item.hidden && !unlocked) return false;
            var sameSeries = current.seriesId && item.seriesId && current.seriesId === item.seriesId;
            return sameSeries || isDirectRelation(current, item);
          });

        if (!related.length) return;

        related.sort(function(a, b) {
          var aSameSeries = !!(current.seriesId && a.seriesId === current.seriesId);
          var bSameSeries = !!(current.seriesId && b.seriesId === current.seriesId);
          if (aSameSeries !== bSameSeries) return aSameSeries ? -1 : 1;
          if (a.order !== b.order) return a.order - b.order;
          return a.title.localeCompare(b.title);
        });

        summary.textContent = related.length + ' related novel' + (related.length === 1 ? '' : 's') + ' found.';

        related.forEach(function(item) {
          var li = document.createElement('li');
          var link = document.createElement('a');
          link.href = item.url;
          link.className = 'related-card';
          link.setAttribute('aria-label', item.title);
          link.appendChild(buildCoverElement(item.cover, item.title));

          var body = document.createElement('div');
          body.className = 'related-body';

          var title = document.createElement('span');
          title.className = 'related-title';
          title.textContent = item.title;
          body.appendChild(title);

          var meta = document.createElement('span');
          meta.className = 'related-meta';

          var relation = relationToCurrent(current, item);
          if (relation) {
            var relationText = relation === 'same-series' ? 'Same series' : relationLabel(relation);
            if (relationText) meta.appendChild(createBadge(relationText, 'relation'));
          }
          if (item.seriesLabel) meta.appendChild(createBadge(item.seriesLabel, 'series'));
          if (Number.isFinite(item.order) && item.order < Number.MAX_SAFE_INTEGER) {
            meta.appendChild(createBadge('Book ' + item.order, 'order'));
          }
          if (item.status === 'complete') meta.appendChild(createBadge('Complete', 'complete'));
          if (item.status === 'incomplete') meta.appendChild(createBadge('Incomplete', 'incomplete'));

          if (meta.childNodes.length) body.appendChild(meta);
          link.appendChild(body);
          li.appendChild(link);
          list.appendChild(li);
        });

        applyNovelStatusBadgeDebug(section);
        section.hidden = false;
      })
      .catch(function() {
        section.hidden = true;
      });
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        loadRelatedNovels();
      });
    }, { rootMargin: '300px 0px' });
    observer.observe(section);
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadRelatedNovels, { timeout: 1800 });
  } else {
    setTimeout(loadRelatedNovels, 1200);
  }
})();

// Horizontal wheel support for related novel cards
(function() {
  var strip = document.getElementById('relatedNovelsList');
  if (!strip) return;
  strip.addEventListener('wheel', function(event) {
    if (strip.scrollWidth <= strip.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    strip.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });
})();

// Theme toggle (light/dark), remembers choice and updates theme-color
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
