(function () {
  'use strict';

  const CONFIG = Object.freeze({
    key: 'np-privacy-consent-v1',
    policyVersion: '2026-11-26', // Change when purposes/vendors/policy materially change.
    retentionDays: 180,
    gtmId: 'GTM-WKLWC3Q5',
    privacyUrl: 'https://nirabpaudel.com/privacy'
  });
  const CATEGORIES = ['analytics', 'marketing', 'functional'];
  const gpc = navigator.globalPrivacyControl === true;
  const denied = () => ({ analytics: false, marketing: false, functional: false });
  let consent = null;
  let banner = null;
  let floatingButton = null;
  let loadedGtm = false;
  let initialized = false;

  function parseStored() {
    try {
      const raw = localStorage.getItem(CONFIG.key);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (value.version !== CONFIG.policyVersion ||
          !Number.isFinite(value.expiresAt) ||
          Date.now() >= value.expiresAt ||
          !value.categories ||
          !CATEGORIES.every(k => typeof value.categories[k] === 'boolean')) return null;
      return value;
    } catch (_) {
      return null; // Fail closed if storage is disabled or corrupted.
    }
  }

  function effectiveCategories(categories) {
    return {
      analytics: categories.analytics === true,
      // No marketing opt-in can be granted when its checkbox is not displayed.
      marketing: categories.marketing === true && !gpc &&
        Boolean(banner && banner.querySelector('#np-consent-marketing')),
      functional: categories.functional === true
    };
  }

  function remember(categories, decision) {
    const record = {
      version: CONFIG.policyVersion,
      decidedAt: new Date().toISOString(),
      expiresAt: Date.now() + CONFIG.retentionDays * 86400000,
      decision,
      categories: effectiveCategories(categories)
    };
    try {
      localStorage.setItem(CONFIG.key, JSON.stringify(record));
    } catch (_) {
      // Without persistent storage consent is for this page load only.
      // On a later visit visitors will be asked again rather than assumed opted in.
    }
    return record;
  }

  // Basic Google Consent Mode: all optional storage denied before GTM loads.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    personalization_storage: 'denied',
    functionality_storage: 'denied',
    security_storage: 'granted'
  });

  function updateGoogleConsent(categories) {
    gtag('consent', 'update', {
      analytics_storage: categories.analytics ? 'granted' : 'denied',
      ad_storage: categories.marketing ? 'granted' : 'denied',
      ad_user_data: categories.marketing ? 'granted' : 'denied',
      ad_personalization: categories.marketing ? 'granted' : 'denied',
      personalization_storage: 'denied',
      functionality_storage: categories.functional ? 'granted' : 'denied',
      security_storage: 'granted'
    });
  }

  function startGtm() {
    if (loadedGtm) return;
    loadedGtm = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CONFIG.gtmId);
    document.head.appendChild(script);
  }

  // Load only scripts explicitly labelled with the category the visitor opted into:
  // <script type="text/plain" data-np-consent="functional" data-np-src="https://example.org/widget.js"></script>
  // Do NOT leave active tracker script tags elsewhere on the site.
  function activateOptInScripts(categories) {
    const candidates = document.querySelectorAll('script[type="text/plain"][data-np-consent]');
    for (const holder of candidates) {
      const category = holder.getAttribute('data-np-consent');
      if (!CATEGORIES.includes(category) || !categories[category] || holder.dataset.npActivated) continue;
      const src = holder.getAttribute('data-np-src');
      const code = holder.textContent;
      if (!src && !code.trim()) continue;
      holder.dataset.npActivated = 'true';
      const replacement = document.createElement('script');
      if (src) {
        replacement.src = src;
        replacement.async = false; // Keep order among dynamically inserted external scripts.
      } else {
        replacement.textContent = code;
      }
      holder.insertAdjacentElement('afterend', replacement);
    }
  }

  function applyCategories(categories) {
    const safe = effectiveCategories(categories);
    updateGoogleConsent(safe);
    // GTM is reserved for analytics. Marketing tags inside GTM MUST have
    // additional explicit marketing-consent checks; otherwise remove them.
    if (safe.analytics) startGtm();
    activateOptInScripts(safe);
  }

  // First-party tracking cookies only. Third-party/HttpOnly cookies must be
  // managed with the vendor and cannot be cleared from front-end JavaScript.
  function expireKnownTrackingCookies() {
    const names = document.cookie.split(';').map(c => c.split('=')[0].trim())
      .filter(name => /^(?:_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_|_gac_|_fbp$|_fbc$|_hj|_uet|_clck$|_clsk$)/.test(name));
    const parts = location.hostname.split('.');
    const siteDomain = parts.length >= 2 ? parts.slice(-2).join('.') : location.hostname;
    for (const name of names) {
      for (const domain of ['', location.hostname, '.' + siteDomain]) {
        for (const path of ['/', location.pathname]) {
          document.cookie = name + '=; Max-Age=0; Path=' + path +
            (domain ? '; Domain=' + domain : '') + '; SameSite=Lax';
        }
      }
    }
  }

  function storeAndApply(categories, decision) {
    const previous = consent && effectiveCategories(consent.categories);
    const next = effectiveCategories(categories);
    consent = remember(next, decision);
    closeBanner();
    if (floatingButton) floatingButton.hidden = false;
    if (previous && CATEGORIES.some(k => previous[k] && !next[k])) {
      expireKnownTrackingCookies();
      // Reload to stop scripts that were already running. JavaScript cannot unload them.
      location.reload();
      return;
    }
    applyCategories(next);
  }

  function createUi() {
    banner = document.createElement('section');
    banner.id = 'np-consent-banner';
    banner.className = 'np-consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-labelledby', 'np-consent-title');
    banner.hidden = true;
    banner.innerHTML = `
      <div class="np-consent__top">
        <div class="np-consent__eyebrow">NIRAB PAUDEL / PRIVACY</div>
        <h2 id="np-consent-title">Your privacy, your choice.</h2>
        <p>I'd like to use optional technologies to understand website visits, support
        newsletter features, and—only if enabled—measure advertising. You can
        accept, reject, or choose what works for you. The website remains available
        even if you reject optional tracking.</p>
        <p class="np-consent__footnote">Essential functions and privacy preferences
        remain active. Read the <a href="${CONFIG.privacyUrl}">Privacy Policy</a>.</p>
      </div>
      <div class="np-consent__settings" id="np-consent-settings" hidden>
        <div class="np-consent__category">
          <div><strong>Strictly necessary</strong><small>Basic website and remembering your choice.</small></div>
          <span class="np-consent__required">Always active</span>
        </div>
        <label class="np-consent__category">
          <span><strong>Analytics</strong><small>Google Analytics / Tag Manager for usage statistics.</small></span>
          <input type="checkbox" id="np-consent-analytics" />
        </label>
        <!-- Marketing is intentionally not offered on this website.
        <label class="np-consent__category">
          <span><strong>Marketing</strong><small>Optional advertising and conversion tracking (if configured).</small></span>
          <input type="checkbox" id="np-consent-marketing" />
        </label>
        -->
        <label class="np-consent__category">
          <span><strong>Functional</strong><small>Optional third-party services, including Brevo form enhancements.</small></span>
          <input type="checkbox" id="np-consent-functional" />
        </label>
        <p class="np-consent__gpc" id="np-consent-gpc" hidden>
          Global Privacy Control detected: marketing tracking will stay off.
        </p>
      </div>
      <div class="np-consent__actions">
        <button type="button" data-np-action="accept" class="np-consent__button np-consent__button--primary">Accept all</button>
        <button type="button" data-np-action="reject" class="np-consent__button np-consent__button--outline">Reject all</button>
        <button type="button" data-np-action="customize" class="np-consent__button np-consent__button--plain">Customize</button>
        <button type="button" data-np-action="save" class="np-consent__button np-consent__button--primary" hidden>Save choices</button>
      </div>`;
    document.body.appendChild(banner);

    floatingButton = document.createElement('button');
    floatingButton.id = 'np-privacy-shortcut';
    floatingButton.type = 'button';
    floatingButton.textContent = 'Privacy choices';
    floatingButton.setAttribute('aria-label', 'Open privacy preferences');
    floatingButton.hidden = true;
    floatingButton.addEventListener('click', openBanner);
    document.body.appendChild(floatingButton);

    const marketing = banner.querySelector('#np-consent-marketing');
    if (marketing) marketing.disabled = gpc;
    banner.querySelector('#np-consent-gpc').hidden = !gpc;
    banner.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-np-action]');
      if (!button) return;
      const action = button.dataset.npAction;
      if (action === 'accept') {
        storeAndApply({ analytics: true, marketing: !gpc, functional: true }, 'accept-all');
      } else if (action === 'reject') {
        storeAndApply(denied(), 'reject-all');
      } else if (action === 'customize') {
        expandSettings(true);
      } else if (action === 'save') {
        storeAndApply({
          analytics: banner.querySelector('#np-consent-analytics').checked,
          marketing: marketing ? marketing.checked : false,
          functional: banner.querySelector('#np-consent-functional').checked
        }, 'custom');
      }
    });
    document.addEventListener('click', event => {
      const link = event.target.closest('[data-np-open-consent]');
      if (link) { event.preventDefault(); openBanner(); }
    });
  }

  function expandSettings(expanded) {
    const settings = banner.querySelector('#np-consent-settings');
    settings.hidden = !expanded;
    banner.querySelector('[data-np-action="customize"]').hidden = expanded;
    banner.querySelector('[data-np-action="save"]').hidden = !expanded;
    banner.querySelector('[data-np-action="save"]').focus();
  }

  function openBanner() {
    if (!initialized) return;
    const values = consent ? effectiveCategories(consent.categories) : denied();
    banner.querySelector('#np-consent-analytics').checked = values.analytics;
    const marketingInput = banner.querySelector('#np-consent-marketing');
    if (marketingInput) marketingInput.checked = values.marketing;
    banner.querySelector('#np-consent-functional').checked = values.functional;
    banner.querySelector('#np-consent-settings').hidden = true;
    banner.querySelector('[data-np-action="customize"]').hidden = false;
    banner.querySelector('[data-np-action="save"]').hidden = true;
    banner.hidden = false;
    floatingButton.hidden = true;
    banner.querySelector('[data-np-action="reject"]').focus({ preventScroll: true });
  }

  function closeBanner() {
    if (banner) banner.hidden = true;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    createUi();
    consent = parseStored();
    if (consent) {
      applyCategories(consent.categories);
      floatingButton.hidden = false;
    } else {
      openBanner();
    }
  }

  window.NPPrivacy = Object.freeze({
    open: () => openBanner(),
    getConsent: () => consent ? { ...effectiveCategories(consent.categories) } : null,
    isAllowed: category => Boolean(consent && CATEGORIES.includes(category) && effectiveCategories(consent.categories)[category])
  });

  // A change in a different tab must also stop previously authorized tracking.
  addEventListener('storage', event => {
    if (event.key === CONFIG.key) location.reload();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
