/**
 * Accessible, consistent color palette for timetable time slots / chromatic colors.
 */

export interface SlotColorTheme {
  slot: number;
  name: string;
  hex: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
}

export const SLOT_PALETTE: Omit<SlotColorTheme, "slot">[] = [
  {
    name: "Amber",
    hex: "#F5A64A",
    borderClass: "border-[#F5A64A]/70",
    bgClass: "bg-[#F5A64A]/10",
    textClass: "text-[#F5A64A]",
    badgeClass: "bg-[#F5A64A]/20 text-[#F5A64A] border-[#F5A64A]/40",
  },
  {
    name: "Teal",
    hex: "#69C9B1",
    borderClass: "border-[#69C9B1]/70",
    bgClass: "bg-[#69C9B1]/10",
    textClass: "text-[#69C9B1]",
    badgeClass: "bg-[#69C9B1]/20 text-[#69C9B1] border-[#69C9B1]/40",
  },
  {
    name: "Indigo",
    hex: "#818CF8",
    borderClass: "border-[#818CF8]/70",
    bgClass: "bg-[#818CF8]/10",
    textClass: "text-[#818CF8]",
    badgeClass: "bg-[#818CF8]/20 text-[#818CF8] border-[#818CF8]/40",
  },
  {
    name: "Emerald",
    hex: "#34D399",
    borderClass: "border-[#34D399]/70",
    bgClass: "bg-[#34D399]/10",
    textClass: "text-[#34D399]",
    badgeClass: "bg-[#34D399]/20 text-[#34D399] border-[#34D399]/40",
  },
  {
    name: "Rose",
    hex: "#FB7185",
    borderClass: "border-[#FB7185]/70",
    bgClass: "bg-[#FB7185]/10",
    textClass: "text-[#FB7185]",
    badgeClass: "bg-[#FB7185]/20 text-[#FB7185] border-[#FB7185]/40",
  },
  {
    name: "Sky",
    hex: "#38BDF8",
    borderClass: "border-[#38BDF8]/70",
    bgClass: "bg-[#38BDF8]/10",
    textClass: "text-[#38BDF8]",
    badgeClass: "bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/40",
  },
  {
    name: "Purple",
    hex: "#C084FC",
    borderClass: "border-[#C084FC]/70",
    bgClass: "bg-[#C084FC]/10",
    textClass: "text-[#C084FC]",
    badgeClass: "bg-[#C084FC]/20 text-[#C084FC] border-[#C084FC]/40",
  },
  {
    name: "Orange",
    hex: "#FB923C",
    borderClass: "border-[#FB923C]/70",
    bgClass: "bg-[#FB923C]/10",
    textClass: "text-[#FB923C]",
    badgeClass: "bg-[#FB923C]/20 text-[#FB923C] border-[#FB923C]/40",
  },
  {
    name: "Lime",
    hex: "#A3E635",
    borderClass: "border-[#A3E635]/70",
    bgClass: "bg-[#A3E635]/10",
    textClass: "text-[#A3E635]",
    badgeClass: "bg-[#A3E635]/20 text-[#A3E635] border-[#A3E635]/40",
  },
  {
    name: "Pink",
    hex: "#F472B6",
    borderClass: "border-[#F472B6]/70",
    bgClass: "bg-[#F472B6]/10",
    textClass: "text-[#F472B6]",
    badgeClass: "bg-[#F472B6]/20 text-[#F472B6] border-[#F472B6]/40",
  },
];

/**
 * Returns a deterministic styling theme for an exam slot index (1-indexed).
 */
export function getSlotTheme(slot: number): SlotColorTheme {
  const index = Math.max(0, (slot - 1) % SLOT_PALETTE.length);
  return {
    slot,
    ...SLOT_PALETTE[index],
  };
}
