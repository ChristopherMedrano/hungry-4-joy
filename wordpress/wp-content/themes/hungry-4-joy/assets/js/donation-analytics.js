(function (window, document) {
  const DONATION_LINK_SELECTOR = 'a.h4j-donation-button.foxycart';
  const CAMPAIGN_SECTION_SELECTOR = 'section[id^="campaign-"]';
  const viewedCampaigns = new Set();
  let pageViewTracked = false;

  function config() {
    return window.H4J_ANALYTICS_CONFIG || {};
  }

  function consentApi() {
    return window.H4JAnalyticsConsent || {};
  }

  function isConsentGranted() {
    return typeof consentApi().isConsentGranted === 'function' && consentApi().isConsentGranted();
  }

  function createAnalyticsEventId(source = window.crypto || {}) {
    if (typeof source.randomUUID === 'function') {
      return `anl_h4j_${source.randomUUID()}`;
    }

    const now = typeof source.now === 'function' ? source.now() : Date.now();
    const random = typeof source.random === 'function' ? source.random() : Math.random();

    return `anl_h4j_${now.toString(36)}_${random.toString(36).slice(2, 10)}`;
  }

  function isoTimestamp(source = Date) {
    const now = typeof source.now === 'function' ? source.now() : Date.now();

    return new Date(now).toISOString();
  }

  function readDataset(link, key) {
    if (!link || !link.dataset) {
      return undefined;
    }

    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = link.dataset[camelKey];

    return value === undefined || value === '' ? undefined : value;
  }

  function optionalNumber(value) {
    if (value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function metadataFromLink(link) {
    const donationAmount = optionalNumber(readDataset(link, 'donation_amount'));

    return {
      donation_attempt_id: readDataset(link, 'donation_attempt_id'),
      campaign_id: readDataset(link, 'campaign_id'),
      campaign_name: readDataset(link, 'campaign_name'),
      donation_amount: donationAmount,
      donation_currency: donationAmount === undefined ? undefined : 'USD',
      donation_label: readDataset(link, 'donation_label'),
      donation_type: readDataset(link, 'donation_type'),
      source_page: readDataset(link, 'source_page') || config().sourcePage || 'home',
      checkout_provider: readDataset(link, 'checkout_provider'),
    };
  }

  function buildEvent(eventName, properties, source = window.crypto || {}) {
    return {
      event: eventName,
      analytics_event_id: createAnalyticsEventId(source),
      event_created_at: isoTimestamp(),
      producer: 'browser',
      ...properties,
    };
  }

  function pushEvent(eventName, properties, source = window.crypto || {}) {
    if (!isConsentGranted()) {
      return null;
    }

    const payload = buildEvent(eventName, properties, source);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    window.H4JAnalytics.eventLog.push(payload);

    if (!config().providersEnabled) {
      console.info('[H4J analytics demo]', payload.event, payload);
    }

    return payload;
  }

  function trackPageView(source = window.crypto || {}) {
    if (pageViewTracked || !isConsentGranted()) {
      return null;
    }

    pageViewTracked = true;

    return pushEvent('PageView', {
      source_page: config().sourcePage || 'home',
    }, source);
  }

  function trackViewCampaign(section, source = window.crypto || {}) {
    if (!section || !isConsentGranted()) {
      return null;
    }

    const campaignKey = section.id || section.getAttribute('aria-labelledby') || 'campaign';

    if (viewedCampaigns.has(campaignKey)) {
      return null;
    }

    const link = section.querySelector(DONATION_LINK_SELECTOR);
    const metadata = link ? metadataFromLink(link) : { source_page: config().sourcePage || 'home' };

    if (!metadata.campaign_id || !metadata.campaign_name) {
      return null;
    }

    viewedCampaigns.add(campaignKey);

    return pushEvent('ViewCampaign', {
      campaign_id: metadata.campaign_id,
      campaign_name: metadata.campaign_name,
      source_page: metadata.source_page,
      checkout_provider: metadata.checkout_provider,
    }, source);
  }

  function trackDonationHandoff(link, donationAttemptId, source = window.crypto || {}) {
    if (!link || !donationAttemptId || !isConsentGranted()) {
      return [];
    }

    const metadata = metadataFromLink(link);

    if (!metadata.campaign_id || metadata.donation_amount === undefined || !metadata.donation_label) {
      return [];
    }

    const shared = {
      ...metadata,
      donation_attempt_id: donationAttemptId,
    };

    return [
      pushEvent('StartDonation', shared, source),
      pushEvent('InitiateCheckout', shared, source),
    ].filter(Boolean);
  }

  function trackInitialJourney(source = window.crypto || {}) {
    trackPageView(source);
    document.querySelectorAll(CAMPAIGN_SECTION_SELECTOR).forEach((section) => {
      trackViewCampaign(section, source);
    });
  }

  function onConsentChange(consent) {
    if (consent !== consentApi().CONSENT_GRANTED) {
      return;
    }

    trackInitialJourney();
  }

  function attachHandoffListener(documentRef = document) {
    documentRef.addEventListener('h4j:donation-handoff', (event) => {
      const detail = event.detail || {};
      trackDonationHandoff(detail.link, detail.donationAttemptId);
    });
  }

  window.dataLayer = window.dataLayer || [];
  window.H4JAnalytics = {
    eventLog: [],
    buildEvent,
    metadataFromLink,
    onConsentChange,
    pushEvent,
    trackDonationHandoff,
    trackInitialJourney,
    trackPageView,
    trackViewCampaign,
  };

  document.addEventListener('h4j:analytics-consent', (event) => {
    onConsentChange((event.detail || {}).consent);
  });

  attachHandoffListener();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isConsentGranted()) {
        trackInitialJourney();
      }
    });
  } else if (isConsentGranted()) {
    trackInitialJourney();
  }
})(window, document);
