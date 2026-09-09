import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * `/legal/disclosures` — the INO-14 non-commercial hold, as a real page, not just a deck slide.
 * Contract: `docs/brand/12-branding-completeness-checklist.md` §3 — "any collateral or copy that
 * could be read as a commercial claim, live pricing, or 'available now' must carry the INO-14
 * disclaimer... copy that pattern, don't soften it." The `.ino-disclaimer` block below is the
 * same hard-coded text as `docs/brand/07-collateral/pitch-deck-template.html`'s disclaimer
 * slide — do not remove or soften it when editing this page.
 */
@Component({
  selector: 'app-legal-disclosures',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal-disclosures.component.html',
  styleUrl: './legal-disclosures.component.scss',
})
export class LegalDisclosuresComponent {}
