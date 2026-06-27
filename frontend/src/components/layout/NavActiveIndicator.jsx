/** Active tab pill — pinned to the top edge of the dock cell (not the icon). */
export function NavActiveIndicator() {
  return (
    <span
      className="pointer-events-none absolute top-0 left-1/2 z-10 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
      aria-hidden
    />
  );
}
