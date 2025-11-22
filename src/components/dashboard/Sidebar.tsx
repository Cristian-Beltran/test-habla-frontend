import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AudioLines,
  ClipboardCheck,
  Cpu,
  LayoutDashboard,
  Stethoscope,
  Users,
  ChevronLeft,
  ChevronRight,
  User,
  UsersRound,
  Wifi,
} from "lucide-react";
import { useAuthStore } from "@/auth/useAuth";

interface SidebarProProps {
  isOpen: boolean; // overlay en mobile
  onClose: () => void;
}

const doctorMenu = [
  { label: "Inicio", to: "/", icon: LayoutDashboard },
  { label: "Doctores", to: "/doctor", icon: Stethoscope },
  { label: "Familiares", to: "/family", icon: Users },
  { label: "Pacientes", to: "/patients", icon: Users },
  { label: "Prácticas", to: "/practice", icon: ClipboardCheck },
  { label: "Evaluaciones", to: "/evaluation", icon: AudioLines },
  { label: "Dispositivos", to: "/devices", icon: Cpu },
  { label: "Monitoreo", to: "/monitoring", icon: Wifi },
];

const patientMenu = [
  { label: "Mis datos", to: "/me", icon: User },
  { label: "Prácticas", to: "/practice", icon: ClipboardCheck },
  { label: "Evaluaciones", to: "/evaluation", icon: AudioLines },
];

const familyMenu = [
  { label: "Familiares", to: "/family/patients", icon: UsersRound },
  { label: "Prácticas", to: "/practice", icon: ClipboardCheck },
];

const EXPANDED_W = "18rem"; // 72
const RAIL_W = "5rem"; // 20

const SidebarPro: React.FC<SidebarProProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [expanded, setExpanded] = useState(true); // rail colapsable
  const { user } = useAuthStore();

  // 🔧 PUBLICA el ancho a una CSS var para que el layout lo use
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sbw",
      expanded ? EXPANDED_W : RAIL_W,
    );
    return () => {
      // opcional: limpiar si desmonta
      document.documentElement.style.removeProperty("--sbw");
    };
  }, [expanded]);

  if (!(user && user.type)) return;
  const navigationItems =
    user?.type === "doctor"
      ? doctorMenu
      : user?.type === "patient"
        ? patientMenu
        : familyMenu;

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r",
          // Glass sutil
          "bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60",
          // Transiciones suaves
          "transition-[transform,width] duration-300 ease-out",
          // Comportamiento responsive
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          expanded ? "w-72" : "w-20",
          // Sombra discreta para separación del contenido
          "shadow-sm",
        )}
        aria-label="Barra lateral de navegación"
      >
        {/* Encabezado */}
        <div className="flex h-16 items-center gap-2 px-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/20">
            <AudioLines className="h-5 w-5 text-primary" />
          </div>
          {expanded && (
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">
                TheraSpeech
              </p>
              <p className="text-xs text-muted-foreground">
                Speech Therapy Suite
              </p>
            </div>
          )}
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Colapsar" : "Expandir"}
              className="hover:bg-muted/70"
            >
              {expanded ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        <Separator className="bg-border/70" />

        {/* Navegación */}
        <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
          {navigationItems.map(({ label, to, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium outline-none",
                  "transition-colors duration-150",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40",
                )}
                title={label}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    active ? "" : "opacity-90 group-hover:opacity-100",
                  )}
                />
                {expanded && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        <Separator className="bg-border/70" />

        {/* Footer */}
        <div className="px-3 py-3 text-xs text-muted-foreground">
          {expanded ? (
            <p>
              Sugerencia: usa la tecla{" "}
              <span className="rounded-md border px-1 py-0.5 text-foreground bg-background/70">
                /
              </span>{" "}
              para buscar.
            </p>
          ) : (
            <p className="text-center">/ buscar</p>
          )}
        </div>
      </aside>
    </>
  );
};

export default SidebarPro;
