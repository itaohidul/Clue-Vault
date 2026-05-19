import { NavLink } from "react-router-dom";
import { Home, ClipboardList, Shield, Users, Warehouse } from "lucide-react";
import { cn } from "../../lib/utils";
import { useGame } from "../../App";

const navItems = [
  { icon: Home, label: "Home", path: "/app/home" },
  { icon: ClipboardList, label: "Missions", path: "/app/missions" },
  { icon: Shield, label: "Vault", path: "/app/vault" },
  { icon: Users, label: "Crew", path: "/app/crew" },
  { icon: Warehouse, label: "Base", path: "/app/base" },
];

export default function AppNavbar() {
  const { triggerHaptic } = useGame();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/5 px-4 pb-6 pt-2 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => triggerHaptic("light")}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all duration-300 px-3 py-1 rounded-xl relative",
                isActive 
                  ? "text-amber-500 scale-110" 
                  : "text-white/40 hover:text-white/60"
              )
            }
          >
            <item.icon size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-medium tracking-tight uppercase">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
