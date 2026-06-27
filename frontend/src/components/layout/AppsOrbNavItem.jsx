import { Link } from "react-router-dom";
import { Link2, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavActiveIndicator } from "./NavActiveIndicator";

const NERVE_ANGLES = [0, 72, 144, 216, 288];

export default function AppsOrbNavItem({ active, to = "/links", label = "Links" }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "apps-orb-nav-link relative z-10 flex min-w-0 flex-1 flex-col items-center justify-end gap-2 pb-1 transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {active && <NavActiveIndicator />}

      <span
        className={cn(
          "apps-orb-nav relative z-10 -mt-6 h-12 w-12 shrink-0 pointer-events-none",
          active && "apps-orb-nav--active"
        )}
        aria-hidden
      >
        <span className="apps-orb-nav__pulse" />
        <span className="apps-orb-nav__pulse apps-orb-nav__pulse--delayed" />

        <span className="apps-orb-nav__nerve">
          <span className="apps-orb-nav__nerve-track" />
          <span className="apps-orb-nav__nerve-impulse" />
          {NERVE_ANGLES.map((angle, index) => (
            <span
              key={angle}
              className="apps-orb-nav__nerve-node"
              style={{
                "--nerve-angle": `${angle}deg`,
                "--nerve-delay": `${index * 0.4}s`,
              }}
            />
          ))}
        </span>

        <span className="apps-orb-nav__core">
          <span className="apps-orb-nav__icon apps-orb-nav__icon--monitor">
            <Link2 className="h-6 w-6 text-primary-foreground" strokeWidth={2.25} />
          </span>
          <span className="apps-orb-nav__icon apps-orb-nav__icon--brain">
            <MousePointerClick className="h-6 w-6 text-primary-foreground" strokeWidth={2.25} />
          </span>
        </span>
      </span>

      <span className="text-[10px] font-semibold leading-none mt-0.5">{label}</span>
    </Link>
  );
}
