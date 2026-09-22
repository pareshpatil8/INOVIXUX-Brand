// Dependency-free generator. Derives email-safe values from tokens.css (the single source of
// truth) and writes static, table-based, inline-styled HTML emails — the one surface where the
// token file itself can't be linked directly (email clients strip <link>/external CSS and need
// inlined styles + table layout). Run with `node scripts/gen-email-templates.mjs`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const outDir = new URL('docs/brand/07-collateral/email/templates/', root);
mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// 1. Parse tokens.css the same way scripts/check-theme-parity.mjs does: strip
//    comments, split into { selector { declarations } } blocks, resolve
//    var(--ino-*) chains. :root is the dark theme baseline; [data-theme="light"]
//    overrides it. Email defaults to light (safest baseline across clients) and
//    layers dark-mode overrides behind @media (prefers-color-scheme: dark).
// ---------------------------------------------------------------------------
const css = read('docs/brand/02-design-tokens/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const declarations = body =>
  Object.fromEntries([...body.matchAll(/(--ino-[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const dark = Object.assign({}, ...blocks.filter(m => m[1].trim() === ':root').map(m => declarations(m[2])));
const lightOverrides = Object.assign(
  {},
  ...blocks.filter(m => m[1].trim() === '[data-theme="light"]').map(m => declarations(m[2]))
);
const light = { ...dark, ...lightOverrides };

function resolve(value, vars, seen = []) {
  return value.replace(/var\((--ino-[\w-]+)\)/g, (_, key) => {
    if (!vars[key] || seen.includes(key)) throw new Error(`missing/cyclic token ${key}`);
    return resolve(vars[key], vars, [...seen, key]);
  });
}
const pick = (vars, keys) => Object.fromEntries(keys.map(k => [k, resolve(vars[`--ino-color-${k}`], vars)]));

const roleKeys = [
  'surface',
  'surface-raised',
  'on-surface',
  'on-surface-muted',
  'border',
  'accent',
  'accent-text-safe',
  'on-accent',
  'danger-text-safe',
];
const L = pick(light, roleKeys);
const D = pick(dark, roleKeys);
// Inline style="" attributes are double-quoted, so the font stack's own double
// quotes (from tokens.css) must become single quotes there or they'd truncate
// the attribute early. The <style> block isn't an attribute, so it keeps the
// token file's original quoting.
const fontDisplayBlock = resolve(light['--ino-font-display'], light);
const fontDisplay = fontDisplayBlock.replace(/"/g, "'");
const radiusMd = resolve(light['--ino-radius-md'], light);
const radiusLg = resolve(light['--ino-radius-lg'], light);
const space = n => resolve(light[`--ino-space-${n}`], light);

// ---------------------------------------------------------------------------
// 2. Email shell. Table layout (not flex/grid — most email clients render with
//    a stripped-down WebKit/Word engine that only trusts <table>). Every color
//    is inlined on the element (the baseline every client honors); the
//    prefers-color-scheme block is a progressive enhancement for clients that
//    support it (Apple Mail, iOS/macOS Mail, Outlook.com web). Clients that
//    don't support it silently keep the light, inlined values — correct
//    degrade per the issue's dark-mode requirement.
// ---------------------------------------------------------------------------
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function shell({ preheader, heading, bodyHtml, ctaLabel, ctaUrl, footNote }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escape(heading)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body, table, td { font-family: ${fontDisplayBlock}; }
  a { color: ${L['accent-text-safe']}; }
  @media (prefers-color-scheme: dark) {
    .ino-bg { background-color: ${D.surface} !important; }
    .ino-card { background-color: ${D['surface-raised']} !important; border-color: ${D.border} !important; }
    .ino-text { color: ${D['on-surface']} !important; }
    .ino-text-muted { color: ${D['on-surface-muted']} !important; }
    .ino-button { background-color: ${D.accent} !important; color: ${D['on-accent']} !important; }
    a.ino-link { color: ${D['accent-text-safe']} !important; }
  }
  @media (max-width: 600px) {
    .ino-container { width: 100% !important; }
    .ino-px { padding-left: ${space(5)} !important; padding-right: ${space(5)} !important; }
  }
</style>
</head>
<body class="ino-bg" style="margin:0; padding:0; background-color:${L.surface};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escape(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ino-bg" style="background-color:${L.surface};">
    <tr>
      <td align="center" style="padding:${space(7)} ${space(4)};">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="ino-container" style="width:600px; max-width:100%;">
          <tr>
            <td class="ino-px" style="padding:0 ${space(4)} ${space(6)} ${space(4)};">
              <span style="font-family:${fontDisplay}; font-weight:700; font-size:18px; letter-spacing:0.02em; color:${L['on-surface']};" class="ino-text">INOVIXUX</span>
            </td>
          </tr>
          <tr>
            <td class="ino-card ino-px" style="background-color:${L['surface-raised']}; border:1px solid ${L.border}; border-radius:${radiusLg}; padding:${space(7)} ${space(6)};">
              <h1 class="ino-text" style="margin:0 0 ${space(4)} 0; font-family:${fontDisplay}; font-weight:600; font-size:22px; line-height:1.3; color:${L['on-surface']};">${escape(heading)}</h1>
              <div class="ino-text" style="font-family:${fontDisplay}; font-size:15px; line-height:1.6; color:${L['on-surface']};">
${bodyHtml}
              </div>
              ${ctaLabel && ctaUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${space(6)} 0 0 0;">
                <tr>
                  <td class="ino-button" style="background-color:${L.accent}; border-radius:${radiusMd};">
                    <a href="${escape(ctaUrl)}" class="ino-link" style="display:inline-block; padding:${space(3)} ${space(6)}; font-family:${fontDisplay}; font-weight:600; font-size:15px; color:${L['on-accent']}; text-decoration:none; border-radius:${radiusMd};">${escape(ctaLabel)}</a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          <tr>
            <td class="ino-px" style="padding:${space(6)} ${space(4)} 0 ${space(4)};">
              <p class="ino-text-muted" style="margin:0; font-family:${fontDisplay}; font-size:12px; line-height:1.6; color:${L['on-surface-muted']};">${footNote}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

const commonFoot =
  'INOVIXUX &middot; This is an automated message, please do not reply directly to this email.';

const templates = {
  'verification.html': shell({
    preheader: 'Confirm your email address to finish setting up your account.',
    heading: 'Confirm your email address',
    bodyHtml: `                <p style="margin:0 0 ${space(4)} 0;">Hi {{recipientName}},</p>
                <p style="margin:0 0 ${space(4)} 0;">Confirm this email address to finish setting up your INOVIXUX account. This link expires in {{expiryHours}} hours.</p>
                <p style="margin:0;">If you didn't request this, you can safely ignore this email.</p>`,
    ctaLabel: 'Verify email address',
    ctaUrl: '{{verificationUrl}}',
    footNote: commonFoot,
  }),
  'approval-requested.html': shell({
    preheader: '{{requesterName}} requested your approval on {{itemName}}.',
    heading: 'Approval requested',
    bodyHtml: `                <p style="margin:0 0 ${space(4)} 0;">Hi {{recipientName}},</p>
                <p style="margin:0 0 ${space(4)} 0;"><strong>{{requesterName}}</strong> requested your approval on <strong>{{itemName}}</strong>{{#if dueDate}} by {{dueDate}}{{/if}}.</p>
                <p style="margin:0;">{{summary}}</p>`,
    ctaLabel: 'Review request',
    ctaUrl: '{{reviewUrl}}',
    footNote: commonFoot,
  }),
  'report-ready.html': shell({
    preheader: 'Your report "{{reportName}}" is ready to view.',
    heading: 'Your report is ready',
    bodyHtml: `                <p style="margin:0 0 ${space(4)} 0;">Hi {{recipientName}},</p>
                <p style="margin:0 0 ${space(4)} 0;"><strong>{{reportName}}</strong> finished generating and is ready to view.</p>
                <p style="margin:0;">This report will be available until {{expiryDate}}.</p>`,
    ctaLabel: 'View report',
    ctaUrl: '{{reportUrl}}',
    footNote: commonFoot,
  }),
  'password-reset.html': shell({
    preheader: 'Reset your INOVIXUX account password.',
    heading: 'Reset your password',
    bodyHtml: `                <p style="margin:0 0 ${space(4)} 0;">Hi {{recipientName}},</p>
                <p style="margin:0 0 ${space(4)} 0;">We received a request to reset the password for this account. This link expires in {{expiryHours}} hours.</p>
                <p style="margin:0;">If you didn't request this, no action is needed — your password will not change.</p>`,
    ctaLabel: 'Reset password',
    ctaUrl: '{{resetUrl}}',
    footNote: commonFoot,
  }),
};

// ---------------------------------------------------------------------------
// 3. Signature block — a standalone inline-styled fragment (not a full HTML
//    document) meant to be pasted into a mail client's signature setting.
//    Table layout again, no external image dependency (logo is a text
//    wordmark, matching the header treatment above, so it survives clients
//    that block remote images by default).
// ---------------------------------------------------------------------------
const signature = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:${fontDisplay}; font-size:13px; line-height:1.5; color:${L['on-surface']};">
  <tr>
    <td style="padding:0 ${space(4)} 0 0; border-right:2px solid ${L.accent};">
      <span style="font-weight:700; font-size:15px; letter-spacing:0.02em;">{{fullName}}</span><br />
      <span style="color:${L['on-surface-muted']};">{{jobTitle}}</span>
    </td>
    <td style="padding:0 0 0 ${space(4)};">
      <span style="font-weight:700; letter-spacing:0.02em;">INOVIXUX</span><br />
      <a href="mailto:{{email}}" style="color:${L['accent-text-safe']}; text-decoration:none;">{{email}}</a>
      {{#if phone}}&nbsp;&middot;&nbsp;<span style="color:${L['on-surface-muted']};">{{phone}}</span>{{/if}}<br />
      <a href="{{websiteUrl}}" style="color:${L['accent-text-safe']}; text-decoration:none;">{{websiteDisplay}}</a>
    </td>
  </tr>
</table>
`;

for (const [name, html] of Object.entries(templates)) writeFileSync(new URL(name, outDir), html);
writeFileSync(new URL('signature.html', outDir), signature);

console.log(`Generated ${Object.keys(templates).length + 1} email files in docs/brand/07-collateral/email/templates/`);
