import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const scriptPath = new URL('../wordpress/wp-content/themes/hungry-4-joy/assets/js/donation-attempt.js', import.meta.url);
const source = await readFile(scriptPath, 'utf8');

const context = {
  window: {},
  document: {
    listeners: [],
    addEventListener(type, listener, options) {
      this.listeners.push({ type, listener, options: { ...options } });
    },
  },
  URL,
  console: {
    error() {},
  },
};

context.globalThis = context.window;
vm.runInNewContext(source, context, { filename: scriptPath.pathname });

const { createDonationAttemptId, withDonationAttemptId } = context.window.H4JDonationAttempt;

assert.equal(context.document.listeners.length, 1);
assert.equal(context.document.listeners[0].type, 'click');
assert.deepEqual(context.document.listeners[0].options, { capture: true });

const generated = createDonationAttemptId({
  randomUUID: () => '018f4f22-24ad-79e3-a92f-0f1d95bbf1d8',
});

assert.equal(generated, 'h4j_attempt_018f4f22-24ad-79e3-a92f-0f1d95bbf1d8');

const fallback = createDonationAttemptId({
  now: () => 1770000000000,
  random: () => 0.123456789,
});

assert.equal(fallback, 'h4j_attempt_ml4kasqo-4fzzzxjy');

const originalUrl = 'https://hungry-4-joy.foxycart.com/cart?name=Loaves+4+Joy&price=25';
const updatedUrl = withDonationAttemptId(originalUrl, 'h4j_attempt_demo_123');

assert.equal(
  updatedUrl,
  'https://hungry-4-joy.foxycart.com/cart?name=Loaves+4+Joy&price=25&donation_attempt_id=h4j_attempt_demo_123'
);

const replacedUrl = withDonationAttemptId(
  'https://hungry-4-joy.foxycart.com/cart?donation_attempt_id=old&price=10',
  'h4j_attempt_new'
);

assert.equal(
  replacedUrl,
  'https://hungry-4-joy.foxycart.com/cart?donation_attempt_id=h4j_attempt_new&price=10'
);

const clickedLink = {
  href: originalUrl,
  dataset: {},
};

context.window.crypto = {
  randomUUID: () => 'listener-id',
};

context.document.listeners[0].listener({
  target: {
    closest(selector) {
      assert.equal(selector, 'a.h4j-donation-button.foxycart');
      return clickedLink;
    },
  },
});

assert.equal(
  clickedLink.href,
  'https://hungry-4-joy.foxycart.com/cart?name=Loaves+4+Joy&price=25&donation_attempt_id=h4j_attempt_listener-id'
);
assert.equal(clickedLink.dataset.donationAttemptId, 'h4j_attempt_listener-id');

let prevented = false;

context.document.listeners[0].listener({
  target: {},
  preventDefault() {
    prevented = true;
  },
});

assert.equal(prevented, false);

context.document.listeners[0].listener({
  target: {
    closest: () => ({
      get href() {
        throw new Error('bad href');
      },
      dataset: {},
    }),
  },
  preventDefault() {
    prevented = true;
  },
});

assert.equal(prevented, false);

console.log('donation attempt JavaScript checks passed');
