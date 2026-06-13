(function (window, document) {
  const ATTEMPT_PREFIX = 'h4j_attempt_';
  const DONATION_LINK_SELECTOR = 'a.h4j-donation-button.foxycart';

  function createDonationAttemptId(source = window.crypto || {}) {
    if (typeof source.randomUUID === 'function') {
      return `${ATTEMPT_PREFIX}${source.randomUUID()}`;
    }

    const now = typeof source.now === 'function' ? source.now() : Date.now();
    const random = typeof source.random === 'function' ? source.random() : Math.random();
    const token = `${now.toString(36)}-${random.toString(36).slice(2, 10)}`;

    return `${ATTEMPT_PREFIX}${token}`;
  }

  function withDonationAttemptId(href, donationAttemptId) {
    const baseUrl = window.location && window.location.href ? window.location.href : 'https://hungry-4-joy.local/';
    const url = new URL(href, baseUrl);
    url.searchParams.set('donation_attempt_id', donationAttemptId);
    // Foxy session custom field backup when item options are missing from webhook zoom.
    url.searchParams.set('h:donation_attempt_id', donationAttemptId);

    return url.toString();
  }

  function attachDonationAttemptIds(documentRef = document) {
    if (!documentRef) {
      return;
    }

    const handoffConfig = window.H4J_HANDOFF_CONFIG || {};
    const handoffApiUrl = typeof handoffConfig.apiUrl === 'string' ? handoffConfig.apiUrl.trim() : '';

    function registerHandoff(link, donationAttemptId) {
      if (!handoffApiUrl || !link || !donationAttemptId) {
        return;
      }

      const payload = {
        donation_attempt_id: donationAttemptId,
        handoff_at: new Date().toISOString(),
        checkout_provider: 'foxy',
        source_page: link.dataset.sourcePage || handoffConfig.sourcePage || 'home',
        campaign_id: link.dataset.campaignId || '',
        campaign_name: link.dataset.campaignName || '',
        donation_amount: Number(link.dataset.donationAmount || 0),
        donation_currency: 'USD',
        donation_label: link.dataset.donationLabel || '',
        donation_type: link.dataset.donationType || 'one_time',
      };

      if (!payload.campaign_id || !payload.campaign_name || !payload.donation_label || payload.donation_amount <= 0) {
        return;
      }

      try {
        fetch(`${handoffApiUrl.replace(/\/$/, '')}/api/checkout/handoffs`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          keepalive: true,
          mode: 'cors',
        }).catch(() => {});
      } catch (error) {
        // Fire-and-forget registration should never block checkout handoff.
      }
    }

    documentRef.addEventListener('click', (event) => {
      const target = event.target;
      const link = target && typeof target.closest === 'function'
        ? target.closest(DONATION_LINK_SELECTOR)
        : null;

      if (!link) {
        return;
      }

      const donationAttemptId = createDonationAttemptId();

      try {
        link.href = withDonationAttemptId(link.href, donationAttemptId);
        link.dataset.donationAttemptId = donationAttemptId;
        document.dispatchEvent(new CustomEvent('h4j:donation-handoff', {
          detail: { link, donationAttemptId },
          bubbles: true,
        }));
        registerHandoff(link, donationAttemptId);
      } catch (error) {
        console.error('Unable to prepare donation attempt handoff.', error);
      }
    }, { capture: true });
  }

  window.H4JDonationAttempt = {
    attachDonationAttemptIds,
    createDonationAttemptId,
    withDonationAttemptId,
  };

  attachDonationAttemptIds();
})(window, document);
