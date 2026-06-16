'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  EMAIL_TEMPLATE_DEFAULTS,
  getDefaultEmailTemplate,
  mergeWithEmailTemplateDefaults,
} = require('../src/lib/email-template-defaults');

describe('email-template-defaults', () => {
  it('defines all four template types', () => {
    const types = EMAIL_TEMPLATE_DEFAULTS.map((t) => t.template_type).sort();
    assert.deepEqual(types, ['nyhetsbrev', 'undersokning', 'valkomstmail', 'win-back']);
  });

  it('each default has subject and body_text', () => {
    for (const template of EMAIL_TEMPLATE_DEFAULTS) {
      assert.ok(template.subject.trim(), `${template.template_type} subject missing`);
      assert.ok(template.body_text.trim(), `${template.template_type} body_text missing`);
    }
  });

  it('getDefaultEmailTemplate returns win-back copy', () => {
    const winBack = getDefaultEmailTemplate('win-back');
    assert.match(winBack.subject, /{{barnets_namn}}/);
    assert.match(winBack.body_text, /{{foralderns_namn}}/);
  });

  it('mergeWithEmailTemplateDefaults fills missing types', () => {
    const merged = mergeWithEmailTemplateDefaults([
      { template_type: 'nyhetsbrev', label: 'Nyhetsbrev', subject: 'Sparad', body_text: 'Text', id: '1' },
    ]);
    assert.equal(merged.length, 4);
    assert.equal(merged.find((t) => t.template_type === 'nyhetsbrev').subject, 'Sparad');
    assert.match(merged.find((t) => t.template_type === 'win-back').subject, /schema väntar/);
  });

  it('mergeWithEmailTemplateDefaults replaces empty saved rows', () => {
    const merged = mergeWithEmailTemplateDefaults([
      { template_type: 'win-back', label: 'Återaktivering', subject: '  ', body_text: '', id: '2' },
    ]);
    const winBack = merged.find((t) => t.template_type === 'win-back');
    assert.match(winBack.subject, /schema väntar/);
    assert.match(winBack.body_text, /stjärnor att tjäna/);
  });
});
