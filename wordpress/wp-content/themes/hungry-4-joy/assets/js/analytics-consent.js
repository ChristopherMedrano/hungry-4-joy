(function (window, document) {
  const STORAGE_KEY = 'h4j_analytics_consent';
  const CONSENT_GRANTED = 'granted';
  const CONSENT_DENIED = 'denied';

  function readConsent() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);

      if (value === CONSENT_GRANTED || value === CONSENT_DENIED) {
        return value;
      }
    } catch (error) {
      console.warn('Unable to read analytics consent preference.', error);
    }

    return null;
  }

  function writeConsent(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      console.warn('Unable to store analytics consent preference.', error);
    }
  }

  function updateBannerChoice(normalized) {
    const banner = document.getElementById('h4j-analytics-consent');

    if (!banner) {
      return;
    }

    if (typeof banner.querySelectorAll !== 'function') {
      return;
    }

    banner.querySelectorAll('[data-consent]').forEach((button) => {
      const selected = button.getAttribute('data-consent') === normalized;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  function setConsent(value) {
    const normalized = value === CONSENT_GRANTED ? CONSENT_GRANTED : CONSENT_DENIED;
    writeConsent(normalized);

    if (window.H4JAnalytics && typeof window.H4JAnalytics.onConsentChange === 'function') {
      window.H4JAnalytics.onConsentChange(normalized);
    }

    updateBannerChoice(normalized);

    document.dispatchEvent(new CustomEvent('h4j:analytics-consent', {
      detail: { consent: normalized },
      bubbles: true,
    }));

    return normalized;
  }

  function isConsentGranted() {
    return readConsent() === CONSENT_GRANTED;
  }

  function cartHostElement() {
    return document.getElementById('h4j-analytics-consent-host');
  }

  function isFoxyCartOpen() {
    const fc = document.getElementById('fc');

    if (!fc) {
      return false;
    }

    const style = window.getComputedStyle(fc);

    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && fc.getClientRects().length > 0;
  }

  function syncCartOpenState() {
    const host = cartHostElement();

    if (!host) {
      return;
    }

    host.classList.toggle('h4j-analytics-consent-host--cart-open', isFoxyCartOpen());
  }

  function watchFoxyCartState() {
    syncCartOpenState();

    if (typeof MutationObserver !== 'function' || !document.body) {
      return;
    }

    const observer = new MutationObserver(syncCartOpenState);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', syncCartOpenState);
  }

  function mountBanner(banner) {
    let host = cartHostElement();

    if (!host) {
      host = document.createElement('div');
      host.id = 'h4j-analytics-consent-host';
      document.body.appendChild(host);
    }

    host.appendChild(banner);
    watchFoxyCartState();
  }

  function renderBanner() {
    if (!document.body || document.getElementById('h4j-analytics-consent')) {
      return;
    }

    const banner = document.createElement('aside');
    banner.id = 'h4j-analytics-consent';
    banner.className = 'h4j-analytics-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Analytics consent');
    banner.innerHTML = [
      '<p class="h4j-analytics-consent__text">',
      'While Allow demo analytics is on, donation journey events are logged to the browser Console ',
      'and exposed on window.dataLayer for inspection. No production analytics providers are configured.',
      '</p>',
      '<div class="h4j-analytics-consent__actions">',
      '<button type="button" class="h4j-analytics-consent__accept" data-consent="granted">Allow demo analytics</button>',
      '<button type="button" class="h4j-analytics-consent__decline" data-consent="denied">Decline</button>',
      '</div>',
    ].join('');

    banner.addEventListener('click', (event) => {
      const button = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('[data-consent]')
        : null;

      if (!button) {
        return;
      }

      setConsent(button.getAttribute('data-consent'));
    });

    mountBanner(banner);

    const storedConsent = readConsent();

    if (storedConsent !== null) {
      updateBannerChoice(storedConsent);
    }
  }

  window.H4JAnalyticsConsent = {
    CONSENT_DENIED,
    CONSENT_GRANTED,
    isConsentGranted,
    readConsent,
    renderBanner,
    setConsent,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBanner);
  } else {
    renderBanner();
  }
})(window, document);
