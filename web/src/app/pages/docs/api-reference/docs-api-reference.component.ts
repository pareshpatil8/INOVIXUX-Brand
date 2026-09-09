import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-docs-api-reference',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docs-api-reference.component.html',
  styleUrl: './docs-api-reference.component.scss',
})
export class DocsApiReferenceComponent {
  // Illustrative response shape only — no live endpoint exists (KYB integration paused).
  // Kept as a plain TS string and bound via {{ }} rather than typed inline, so the JSON's own
  // curly braces don't need Angular interpolation-escaping in the template.
  protected readonly sampleTrace = `{
  "case_id": "VENDOR-4471",
  "status": "review",       // "verified" | "review" | "escalate"
  "trace": [
    { "rail": "GSTIN", "checked_at": "…", "result": "mismatch" },
    { "rail": "UPI", "checked_at": "…", "result": "match" }
  ],
  "resolved_by": null        // set only once a human reviewer closes the case
}`;
}
