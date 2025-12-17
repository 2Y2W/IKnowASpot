export const TAGS = ["food", "scenic", "hangout", "nature"] as const;

export type Tag = (typeof TAGS)[number];

export const TAG_COLORS: Record<Tag, string> = {
  food: "#F97316", // orange
  scenic: "#22C55E", // green
  hangout: "#3B82F6", // blue
  nature: "#16A34A", // dark green
};
