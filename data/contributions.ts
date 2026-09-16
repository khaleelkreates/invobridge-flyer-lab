export interface Contribution {
  id: string;
  title: string;
  file: string;
}

export const contributions: Contribution[] = [
  { id: "01", title: "Contribution 01", file: "/presentations/contribution_01.pdf" },
  { id: "02", title: "Contribution 02", file: "/presentations/contribution_02.pdf" },
  { id: "03", title: "Contribution 03", file: "/presentations/contribution_03.pdf" },
  { id: "04", title: "Contribution 04", file: "/presentations/contribution_04.pdf" },
  { id: "05", title: "Contribution 05", file: "/presentations/contribution_05.pdf" },
  { id: "06", title: "Contribution 06", file: "/presentations/contribution_06.pdf" },
  { id: "07", title: "Contribution 07", file: "/presentations/contribution_07.pdf" },
  { id: "08", title: "Contribution 08", file: "/presentations/contribution_08.pdf" },
  { id: "09", title: "Contribution 09", file: "/presentations/contribution_09.pdf" },
  { id: "10", title: "Contribution 10", file: "/presentations/contribution_10.pdf" },
  { id: "11", title: "Contribution 11", file: "/presentations/contribution_11.pdf" },
  { id: "12", title: "Contribution 12", file: "/presentations/contribution_12.pdf" },
  { id: "13", title: "Contribution 13", file: "/presentations/contribution_13.pdf" },
  { id: "14", title: "Contribution 14", file: "/presentations/contribution_14.pdf" },
  { id: "15", title: "Contribution 15", file: "/presentations/contribution_15.pdf" },
  { id: "16", title: "Contribution 16", file: "/presentations/contribution_16.pdf" },
];

export const baseline = {
  id: "original",
  title: "Current InvoBridge Presentation",
  file: "/presentations/Original_presentation.pdf",
  description:
    "The existing InvoBridge presentation that these 16 submissions propose to replace or improve.",
};

export const SLIDE_ROLES = [
  "Opening",
  "Product",
  "Benefits",
  "NRS",
  "CTA",
  "Other",
] as const;

export type SlideRole = (typeof SLIDE_ROLES)[number];