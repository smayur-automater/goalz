// Local lint rules. `no-literal-ui-string` keeps user-facing copy in i18n files
// (eslint-plugin-i18next does not report under ESLint 10).

const USER_FACING_PROPS = new Set([
  'label',
  'title',
  'placeholder',
  'hint',
  'error',
  'valueText',
  'accessibilityLabel',
  'accessibilityHint',
  'aria-label',
  'aria-valuetext',
]);

const HAS_LETTER = /\p{L}/u;

const noLiteralUiString = {
  meta: {
    type: 'problem',
    docs: { description: 'User-facing strings must come from i18n (t()).' },
    messages: { literal: 'Move "{{text}}" into the i18n files and use t().' },
    schema: [],
  },
  create(context) {
    const report = (node, text) =>
      context.report({ node, messageId: 'literal', data: { text: text.trim().slice(0, 40) } });
    return {
      JSXText(node) {
        if (HAS_LETTER.test(node.value)) report(node, node.value);
      },
      JSXAttribute(node) {
        const name = typeof node.name.name === 'string' ? node.name.name : '';
        if (!USER_FACING_PROPS.has(name) || !node.value) return;
        const v = node.value;
        if (v.type === 'Literal' && typeof v.value === 'string' && HAS_LETTER.test(v.value)) {
          report(v, v.value);
        } else if (
          v.type === 'JSXExpressionContainer' &&
          v.expression.type === 'Literal' &&
          typeof v.expression.value === 'string' &&
          HAS_LETTER.test(v.expression.value)
        ) {
          report(v, v.expression.value);
        }
      },
    };
  },
};

export default { rules: { 'no-literal-ui-string': noLiteralUiString } };
