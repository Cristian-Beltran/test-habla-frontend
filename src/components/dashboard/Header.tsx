import * as React from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/auth/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AudioLines, ChevronRight, LogOut, Moon, Sun } from "lucide-react";

interface HeaderProProps {
  onMenuClick?: () => void; // abre sidebar en mobile
  breadcrumb?: { label: string; to?: string }[];
}

const HeaderPro: React.FC<HeaderProProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initials = useMemo(() => {
    const n = user?.fullname || "Usuario";
    const parts = n.trim().split(" ");
    const first = parts[0]?.[0] || "U";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  }, [user?.fullname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      {/* Borde degradado inferior */}
      <div className="relative">
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
      </div>

      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
        {/* Botón menú (mobile) */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="Abrir menú"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Marca compacta */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border px-2 py-1.5 bg-card/70 shadow-sm">
          <AudioLines className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">
            TheraSpeech
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Acciones derechas */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="hover:bg-muted/70"
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          <div className="ml-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
              {initials}
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-medium">
                {user?.fullname || "Usuario"}
              </p>
            </div>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 hover:bg-muted/70"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderPro;
