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

    return url.toString();
  }

  function attachDonationAttemptIds(documentRef = document) {
    if (!documentRef) {
      return;
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
