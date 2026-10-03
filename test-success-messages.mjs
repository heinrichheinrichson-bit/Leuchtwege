import assert from 'node:assert/strict';
import {
  successMessages,
  selectSuccessMessage,
  completionMessage,
} from './lib/success-messages.mjs';
assert(successMessages.length >= 30);
assert.equal(
  new Set(successMessages.map((m) => m.id)).size,
  successMessages.length,
);
for (const locale of ['de', 'en']) {
  assert.equal(
    new Set(successMessages.map((m) => m[locale].title)).size,
    successMessages.length,
  );
  for (const m of successMessages) {
    assert(m[locale].title.length <= 42);
    assert(m[locale].body.length <= 90);
  }
}
let state = null,
  previous = null;
for (let bag = 0; bag < 3; bag++) {
  const seen = new Set();
  for (let i = 0; i < successMessages.length; i++) {
    const attempt = `${bag}-${i}`,
      r = selectSuccessMessage(state, attempt, () => 0.5);
    assert(!seen.has(r.message.id));
    assert.notEqual(r.message.id, previous);
    seen.add(r.message.id);
    previous = r.message.id;
    state = r.state;
    assert.deepEqual(
      selectSuccessMessage(JSON.parse(JSON.stringify(state)), attempt).state,
      state,
      'Reopening does not consume a message',
    );
  }
}
assert(state.history.length <= 64);
assert(
  selectSuccessMessage(
    { version: 1, remaining: ['bad'], history: [null, {}, false] },
    'new',
  ).message,
);
assert.deepEqual(
  completionMessage('fallback'),
  completionMessage('fallback'),
  'Works without localStorage, including reopening',
);
console.log(
  'PASS: 32 bilingual messages, no repeats within a bag or at its boundary, stable reopening, corrupt storage and unavailable storage.',
);
