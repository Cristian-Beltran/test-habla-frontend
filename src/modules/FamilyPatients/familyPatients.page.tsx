// modules/Family/pages/FamilyPatientsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardHeader } from "@/components/headerPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Users,
  Mail,
  Activity,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useAuthStore } from "@/auth/useAuth";
import { FamilyService } from "@/modules/Family/data/family.service";
import type { Family } from "@/modules/Family/family.interface";

function getInitials(name?: string) {
  if (!name) return "—";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

function matchesQuery(text: string, q: string) {
  return text.toLowerCase().includes(q.trim().toLowerCase());
}

function PatientTile({
  id,
  fullname,
  email,
  deviceSerial,
}: {
  id: string;
  fullname: string;
  email: string;
  deviceSerial?: string;
}) {
  const hasDevice = Boolean(deviceSerial);

  return (
    <Card className="group relative flex flex-col overflow-hidden border-l-4 border-emerald-500 bg-gradient-to-br from-background via-emerald-50/40 to-background transition-all hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-emerald-400">
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.15),transparent_55%)]" />
      </div>

      <CardHeader className="relative pb-3">
        <div className="flex items-start gap-4">
          <div
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 md:h-14 md:w-14 md:text-lg"
          >
            {getInitials(fullname)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="truncate text-base md:text-lg">
                {fullname}
              </CardTitle>
              {hasDevice ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 border border-emerald-200 text-[11px] md:text-xs"
                >
                  <Activity className="mr-1 h-3 w-3" />
                  Dispositivo activo
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="shrink-0 text-[11px] md:text-xs"
                >
                  Sin dispositivo
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground md:text-sm">
              <Mail className="h-3 w-3 md:h-4 md:w-4" />
              <span className="truncate">{email}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-1 items-end justify-between gap-4 pt-0">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground md:text-sm">
          {hasDevice && (
            <>
              <span className="font-medium text-foreground/80">
                Serie del dispositivo
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-mono tracking-tight text-emerald-800 md:text-xs">
                {deviceSerial}
              </span>
            </>
          )}
          {!hasDevice && (
            <span className="text-[11px] md:text-xs">
              Este paciente aún no tiene un dispositivo asignado.
            </span>
          )}
        </div>

        <Link to={`/me/${id}`}>
          <Button
            size="sm"
            className="group/button relative z-10 rounded-full px-4 text-xs md:text-sm"
            aria-label={`Ver datos del paciente ${fullname}`}
          >
            Ver ficha
            <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover/button:translate-x-0.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function FamilyPatientsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [query, setQuery] = useState("");

  const reload = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await FamilyService.findOne(user.id); // usa el mismo id del auth
      setFamily(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los pacientes",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [user?.id]);

  const patients = family?.patients ?? [];
  const filtered = patients.filter(
    (p) =>
      matchesQuery(p.user.fullname, query) || matchesQuery(p.user.email, query),
  );

  const totalPatients = patients.length;
  const withDevice = patients.filter((p) => p.device?.serialNumber).length;

  return (
    <div
      className="flex flex-col gap-4 md:gap-6"
      role="main"
      aria-live="polite"
    >
      <DashboardHeader
        title="Mis pacientes"
        description="Panel de pacientes vinculados a mi familia"
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <Input
                placeholder="Buscar por nombre o correo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-[260px]"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={reload}
                    title="Recargar listado de pacientes"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualizar pacientes vinculados</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
      />

      {/* Layout: panel lateral + listado */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-6">
        {/* Panel lateral: métricas + búsqueda mobile */}
        <div className="space-y-4">
          {/* buscador en mobile */}
          <div className="md:hidden">
            <Input
              placeholder="Buscar paciente…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4 text-emerald-600" />
                Resumen de pacientes
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total vinculados</span>
                <span className="font-semibold">{totalPatients}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Con dispositivo activo
                </span>
                <span className="font-semibold text-emerald-700">
                  {withDevice}
                </span>
              </div>
              <div className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Usa el buscador por nombre o correo para localizar rápidamente
                al paciente que necesitas revisar.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal: estados + listado */}
        <div className="space-y-4 md:space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && (
            <div className="space-y-3">
              {loading && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando pacientes vinculados…</span>
                </div>
              )}

              {!loading && totalPatients === 0 && (
                <Card className="border-dashed bg-muted/40">
                  <CardContent className="space-y-2 py-4 text-sm md:text-base text-muted-foreground">
                    <p>No hay pacientes vinculados a este familiar.</p>
                    <p className="text-xs md:text-sm">
                      Si esperabas ver pacientes en este panel, solicita al
                      equipo clínico que confirme y registre correctamente el
                      vínculo familiar.
                    </p>
                  </CardContent>
                </Card>
              )}

              {!loading && totalPatients > 0 && (
                <>
                  {/* listado */}
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {filtered.map((p) => (
                      <PatientTile
                        key={p.id}
                        id={p.id}
                        fullname={p.user.fullname}
                        email={p.user.email}
                        deviceSerial={p.device?.serialNumber}
                      />
                    ))}
                  </div>

                  {/* estado de búsqueda sin resultados */}
                  {filtered.length === 0 && query.trim().length > 0 && (
                    <div className="rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
                      No se encontraron resultados para “{query}”. Ajusta el
                      criterio de búsqueda o verifica el nombre/correo del
                      paciente.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
