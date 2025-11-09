"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Activity,
  Droplets,
  Users,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/auth/useAuth";
import { sessionService } from "@/modules/Session/data/session.service";
import type { Session, SessionData } from "@/modules/Session/session.interface";
import { patientService } from "@/modules/Patient/data/patient.service";
import type { Patient } from "@/modules/Patient/patient.interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigate } from "react-router-dom";

// =====================
// Utilidades locales
// =====================
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function isToday(iso?: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

type VitalStatus = "normal" | "warning" | "critical";
type Trend = "up" | "down" | "stable";

type VitalItem = {
  label: string;
  value: number | string;
  unit: string;
  status: VitalStatus;
  trend: Trend;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type RecentPatientItem = {
  id: string;
  name: string;
  last: string;
  status: "Estable" | "Atención";
};

// =====================
// Página
// =====================
export default function DashboardPage() {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [reloading, setReloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const redirectTo =
    user?.type === "patient"
      ? "/me"
      : user?.type === "family"
        ? "/family/patients"
        : null;

  // ------------ Carga ------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ps, ses] = await Promise.all([
          patientService.findAll(),
          sessionService.findAll(),
        ]);
        setPatients(ps ?? []);
        setSessions(ses ?? []);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar el dashboard.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleReload = async (): Promise<void> => {
    setReloading(true);
    try {
      const ses = await sessionService.findAll();
      setSessions(ses ?? []);
    } catch (e) {
      console.error(e);
      setError("Error al refrescar datos.");
    } finally {
      setReloading(false);
    }
  };

  // ------------ Derivados ------------
  // Último registro global (para la card de signos)
  const lastRecordInfo = useMemo(() => {
    let latest: { session: Session; record: SessionData } | null = null;
    for (const s of sessions) {
      for (const r of s.records ?? []) {
        if (!latest) {
          latest = { session: s, record: r };
          continue;
        }
        if (
          new Date(r.recordedAt).getTime() >
          new Date(latest.record.recordedAt).getTime()
        ) {
          latest = { session: s, record: r };
        }
      }
    }
    return latest;
  }, [sessions]);

  const lastPatientName = useMemo(() => {
    const pid = lastRecordInfo?.session?.patient?.id;
    if (!pid) return "—";
    const p = patients.find((x) => x.id === pid);
    return p?.user?.fullname ? `${p.user.fullname}`.trim() : (p?.id ?? "—");
  }, [lastRecordInfo, patients]);

  const lastUpdateLabel = useMemo(
    () =>
      lastRecordInfo?.record?.recordedAt
        ? `Actualizado: ${fmtDate(lastRecordInfo.record.recordedAt)}`
        : "—",
    [lastRecordInfo],
  );

  const vitalsForCard = useMemo<VitalItem[]>(() => {
    const r = lastRecordInfo?.record;
    const bpmVal = typeof r?.bpm === "number" ? r.bpm : NaN;
    const spo2Val = typeof r?.spo2 === "number" ? r.spo2 : NaN;
    const voltVal = typeof r?.pressureVolt === "number" ? r.pressureVolt : NaN;

    const hrStatus: VitalStatus =
      Number.isFinite(bpmVal) && (bpmVal < 50 || bpmVal > 110)
        ? "warning"
        : "normal";

    const spStatus: VitalStatus = Number.isFinite(spo2Val)
      ? spo2Val < 92
        ? "critical"
        : spo2Val < 95
          ? "warning"
          : "normal"
      : "normal";

    const prStatus: VitalStatus =
      Number.isFinite(voltVal) && (voltVal < 0.5 || voltVal > 3.0)
        ? "warning"
        : "normal";

    return [
      {
        label: "Frecuencia Cardíaca",
        value: Number.isFinite(bpmVal) ? bpmVal : "—",
        unit: "bpm",
        status: hrStatus,
        trend: "stable",
        icon: Heart,
      },
      {
        label: "Saturación O₂",
        value: Number.isFinite(spo2Val) ? spo2Val : "—",
        unit: "%",
        status: spStatus,
        trend: "stable",
        icon: Droplets,
      },
      {
        label: "Presión Respiratoria",
        value: Number.isFinite(voltVal) ? voltVal.toFixed(2) : "—",
        unit: "V",
        status: prStatus,
        trend: "stable",
        icon: Activity,
      },
    ];
  }, [lastRecordInfo]);

  // KPI
  const patientsActive = useMemo(() => {
    const setIds = new Set<string>();
    sessions.forEach((s) => {
      if (s.records?.length) setIds.add(s.patient?.id);
    });
    return setIds.size;
  }, [sessions]);

  const sessionsToday = useMemo(
    () => sessions.filter((s) => isToday(s.startedAt)).length,
    [sessions],
  );

  const criticalAlerts = useMemo(() => {
    let count = 0;
    sessions.forEach((s) =>
      s.records?.forEach((r) => {
        if (typeof r.spo2 === "number" && r.spo2 < 92) count += 1;
      }),
    );
    return count;
  }, [sessions]);

  const stablePatients = useMemo(
    () => Math.max(0, patientsActive - criticalAlerts),
    [patientsActive, criticalAlerts],
  );

  // Sesión más reciente (para la tarjeta derecha)
  const recentSession = useMemo(() => {
    if (!sessions.length)
      return null as {
        id: string;
        patientId: string;
        sessionDate: string;
        notes: string;
        createdAt: string;
      } | null;
    const sorted = [...sessions].sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
    const s = sorted[0];
    const p = patients.find((x) => x.id === s.patient?.id);
    const lastRec = (s.records ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
      )[0];
    return {
      id: s.id,
      patientId: s.patient?.id,
      sessionDate: s.startedAt.split("T")[0],
      notes: `${
        p?.user?.fullname ? `${p.user.fullname}`.trim() : "Paciente"
      } · Última lectura: ${fmtDate(lastRec?.recordedAt)}`,
      createdAt: s.startedAt,
    };
  }, [sessions, patients]);

  // Pacientes recientes (top 3 por última lectura)
  const recentPatients = useMemo<RecentPatientItem[]>(() => {
    const rows: RecentPatientItem[] = [];
    sessions.forEach((s) => {
      const last = (s.records ?? [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
        )[0];
      if (!last) return;
      const p = patients.find((x) => x.id === s.patient?.id);
      const name = p?.user?.fullname
        ? `${p.user.fullname}`.trim()
        : (p?.id ?? s.patient?.id ?? "Paciente");
      const status =
        typeof last.spo2 === "number" && last.spo2 < 92
          ? "Atención"
          : "Estable";
      rows.push({
        id: s.patient?.id ?? "",
        name,
        last: fmtDate(last.recordedAt),
        status,
      });
    });

    // Únicos y top 3
    const map = new Map<string, RecentPatientItem>();
    rows
      .sort((a, b) => new Date(b.last).getTime() - new Date(a.last).getTime())
      .forEach((x) => {
        if (!map.has(x.id) && x.id) map.set(x.id, x);
      });

    return Array.from(map.values()).slice(0, 3);
  }, [sessions, patients]);

  if (redirectTo) return <Navigate to={redirectTo} replace />;
  // ------------ Render ------------
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mx-auto max-w-5xl flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando dashboard…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground">
              No se pudo cargar la información.
            </p>
          </div>
          <Button variant="outline" onClick={handleReload} disabled={reloading}>
            {reloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reintentar
          </Button>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Bienvenido, {user?.fullname ?? "Doctor/a"}
          </h2>
          <p className="text-muted-foreground">
            Gestiona el monitoreo de tus pacientes
          </p>
        </div>
        <Button variant="outline" onClick={handleReload} disabled={reloading}>
          {reloading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Actualizando…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </>
          )}
        </Button>
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Pacientes Activos
              </span>
              <Users className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{patientsActive}</div>
            <p className="text-xs text-muted-foreground">
              Con registros recientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Sesiones Hoy
              </span>
              <Activity className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{sessionsToday}</div>
            <p className="text-xs text-muted-foreground">Iniciadas en el día</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Alertas Críticas
              </span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">SpO₂ &lt; 92%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Pacientes Estables
              </span>
              <CheckCircle className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{stablePatients}</div>
            <p className="text-xs text-muted-foreground">Sin alertas activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal (2 columnas) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Signos vitales (última lectura) */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Signos Vitales</h3>
                <p className="text-xs text-muted-foreground">
                  {lastPatientName} · {lastUpdateLabel}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {vitalsForCard.map((v) => {
                const Icon = v.icon;
                const badgeClass =
                  v.status === "critical"
                    ? "bg-red-100 text-red-800"
                    : v.status === "warning"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800";
                return (
                  <div key={v.label} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {v.label}
                      </span>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="mt-2 text-xl font-semibold">
                      {v.value}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {v.unit}
                      </span>
                    </div>
                    <div className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium {badgeClass}">
                      <span
                        className={[
                          "px-2 py-0.5 rounded-full",
                          badgeClass,
                        ].join(" ")}
                      >
                        {v.status === "critical"
                          ? "Crítico"
                          : v.status === "warning"
                            ? "Atención"
                            : "Normal"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sesión reciente */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Sesión Reciente</h3>
              <span className="text-xs text-muted-foreground">
                {recentSession ? fmtDate(recentSession.createdAt) : "—"}
              </span>
            </div>
            <div className="rounded border p-3">
              <div className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {recentSession ? `#${recentSession.id.slice(0, 8)}` : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {recentSession ? recentSession.sessionDate : "—"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recentSession?.notes ?? "Sin sesiones registradas"}
                </p>
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  disabled={!recentSession?.patientId}
                  onClick={() => {
                    if (recentSession?.patientId) {
                      window.location.href = `/patients/${recentSession.patientId}/session`;
                    }
                  }}
                >
                  Ver reporte
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pacientes recientes */}
      <Card className="border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Pacientes Recientes</h3>
            <span className="text-xs text-muted-foreground">
              {recentPatients.length} de {patients.length}
            </span>
          </div>

          <div className="space-y-3">
            {recentPatients.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded border bg-muted cursor-pointer"
                onClick={() =>
                  (window.location.href = `/patients/${p.id}/session`)
                }
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.last}</p>
                </div>
                <span
                  className={[
                    "px-2 py-1 rounded-full text-[10px] font-medium",
                    p.status === "Estable"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800",
                  ].join(" ")}
                >
                  {p.status}
                </span>
              </div>
            ))}
            {!recentPatients.length && (
              <p className="text-sm text-muted-foreground">
                No hay actividad reciente.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
