/** A single link rendered inside a mega menu panel column. */
export interface InoMegaMenuLink {
  label: string;
  /** Decorative glyph/icon token rendered before the label (`aria-hidden`). */
  icon?: string;
  /** One-line supporting text rendered under the label — the "grouped links" row's secondary copy. */
  description?: string;
  href?: string;
  command?: (link: InoMegaMenuLink) => void;
  disabled?: boolean;
}

/** One labelled column inside an open panel — the "grouped links" structure. */
export interface InoMegaMenuColumn {
  /** Column heading. Omit for an unlabelled column (still a `role="group"`, just unnamed). */
  heading?: string;
  items: InoMegaMenuLink[];
}

/** A top-level menubar entry. `columns` present ⇒ it is a panel trigger; otherwise it behaves
 * like a plain top-level link/command, same as a leaf in `InoMegaMenuLink`. */
export interface InoMegaMenuItem {
  label: string;
  icon?: string;
  href?: string;
  command?: (item: InoMegaMenuItem) => void;
  disabled?: boolean;
  columns?: InoMegaMenuColumn[];
}
