import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const themeJs = '../wordpress/wp-content/themes/hungry-4-joy/assets/js';

async function loadScript(relativePath) {
  const scriptPath = new URL(`${themeJs}/${relativePath}`, import.meta.url);
  const source = await readFile(scriptPath, 'utf8');

  return { source, scriptPath };
}

function createStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

function bootstrapAnalyticsContext() {
  const listeners = [];
  const dispatched = [];

  const context = {
    window: {
      dataLayer: [],
      localStorage: createStorage(),
      H4J_ANALYTICS_CONFIG: {
        providersEnabled: false,
        sourcePage: 'home',
      },
      crypto: {
        randomUUID: (() => {
          let count = 0;

          return () => {
            count += 1;

            return `018f4f22-24ad-79e3-a92f-0f1d95bbf1d${count}`;
          };
        })(),
      },
      console: {
        info() {},
        warn() {},
      },
    },
    document: {
      body: {
        appendChild(node) {
          context.document.banner = node;
        },
      },
      banner: null,
      createElement(tagName) {
        return {
          tagName,
          id: '',
          className: '',
          hidden: false,
          innerHTML: '',
          setAttribute() {},
          addEventListener(type, listener) {
            this.listeners = this.listeners || [];
            this.listeners.push({ type, listener });
          },
        };
      },
      getElementById() {
        return context.document.banner;
      },
      listeners,
      readyState: 'complete',
      addEventListener(type, listener) {
        listeners.push({ type, listener });
      },
      dispatchEvent(event) {
        dispatched.push(event);
        listeners
          .filter((entry) => entry.type === event.type)
          .forEach((entry) => entry.listener(event));

        return true;
      },
      querySelectorAll() {
        return [];
      },
    },
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
        this.bubbles = Boolean(options.bubbles);
      }
    },
    Date,
    URL,
    console: {
      info() {},
      warn() {},
    },
  };

  context.window.document = context.document;
  context.globalThis = context.window;

  return { context, dispatched };
}

const consentScript = await loadScript('analytics-consent.js');
const analyticsScript = await loadScript('donation-analytics.js');

const { context, dispatched } = bootstrapAnalyticsContext();

vm.runInNewContext(consentScript.source, context, { filename: consentScript.scriptPath.pathname });
vm.runInNewContext(analyticsScript.source, context, { filename: analyticsScript.scriptPath.pathname });

const { H4JAnalyticsConsent, H4JAnalytics, dataLayer } = context.window;

const link = {
  dataset: {
    campaignId: 'loaves-campaign-01',
    campaignName: 'Loaves 4 Joy',
    donationAmount: '25',
    donationLabel: '3 loaves',
    donationType: 'one_time',
    sourcePage: 'home',
    checkoutProvider: 'foxy',
  },
};

assert.equal(H4JAnalyticsConsent.readConsent(), null);
assert.equal(H4JAnalytics.pushEvent('PageView', { source_page: 'home' }), null);
assert.equal(dataLayer.length, 0);
assert.equal(H4JAnalytics.eventLog.length, 0);

context.window.localStorage.setItem('h4j_analytics_consent', 'granted');
assert.equal(H4JAnalyticsConsent.isConsentGranted(), true);

const pageView = H4JAnalytics.pushEvent('PageView', { source_page: 'home' });

assert.equal(pageView.event, 'PageView');
assert.equal(pageView.producer, 'browser');
assert.match(pageView.analytics_event_id, /^anl_h4j_/);
assert.equal(dataLayer.length, 1);

const handoffEvents = H4JAnalytics.trackDonationHandoff(link, 'h4j_attempt_demo_123');

assert.equal(handoffEvents.length, 2);
assert.equal(handoffEvents[0].event, 'StartDonation');
assert.equal(handoffEvents[1].event, 'InitiateCheckout');
assert.equal(handoffEvents[0].donation_attempt_id, 'h4j_attempt_demo_123');
assert.equal(handoffEvents[0].donation_amount, 25);
assert.equal(handoffEvents[0].donation_currency, 'USD');
assert.notEqual(handoffEvents[0].analytics_event_id, handoffEvents[1].analytics_event_id);
assert.equal(dataLayer.length, 3);

const duplicateHandoff = H4JAnalytics.trackDonationHandoff(link, 'h4j_attempt_demo_456');

assert.equal(duplicateHandoff.length, 2);
assert.equal(dataLayer.length, 5);
assert.equal(duplicateHandoff[0].donation_attempt_id, 'h4j_attempt_demo_456');
assert.notEqual(duplicateHandoff[0].donation_attempt_id, handoffEvents[0].donation_attempt_id);

const firstTrackedPageView = H4JAnalytics.trackPageView();
const duplicatePageView = H4JAnalytics.trackPageView();

assert.ok(firstTrackedPageView);
assert.equal(duplicatePageView, null);
assert.equal(dataLayer.length, 6);

H4JAnalyticsConsent.setConsent(H4JAnalyticsConsent.CONSENT_DENIED);
assert.equal(H4JAnalyticsConsent.readConsent(), 'denied');
assert.ok(dispatched.some((event) => event.type === 'h4j:analytics-consent'));

const blocked = H4JAnalytics.trackDonationHandoff(link, 'h4j_attempt_blocked');

assert.equal(blocked.length, 0);
assert.equal(dataLayer.length, 6);

const incomplete = H4JAnalytics.trackDonationHandoff({ dataset: { campaignId: 'x' } }, 'h4j_attempt_incomplete');

assert.equal(incomplete.length, 0);

console.log('donation analytics JavaScript checks passed');
