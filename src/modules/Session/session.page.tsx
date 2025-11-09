import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw } from "lucide-react";

import { sessionService } from "./data/session.service";
import type { Session, SessionData, TestItem } from "./session.interface";
import { patientService } from "@/modules/Patient/data/patient.service";
import type { Patient } from "@/modules/Patient/patient.interface";

// Recharts para progreso de tests
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuthStore } from "@/auth/useAuth";

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

// ===== Helpers para CSV =====

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PatientSessionPage() {
  const params = useParams<{ id: string }>();

  const { user } = useAuthStore();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tests, setTests] = useState<TestItem[]>([]);

  let patientId: string | undefined;
  const loadAll = async () => {
    let patientData: Patient | undefined;
    if (user?.id && user?.type == "patient")
      patientData = await patientService.findUser(user?.id);
    patientId = id ?? patientData?.id;
    if (!patientId) return;
    setError(null);
    setLoading(true);
    try {
      const [p, ses, t] = await Promise.all([
        patientService.findOne(patientId).catch(() => null),
        sessionService.findAllByPatient(patientId),
        sessionService.listTests(patientId),
      ]);
      setPatient(p);
      setSessions(ses ?? []);
      setTests(t ?? []);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar la información del paciente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleReload = async () => {
    setReloading(true);
    await loadAll();
    setReloading(false);
  };

  // ===== KPIs derivados =====
  const totalRecords = useMemo(
    () => sessions.reduce((acc, s) => acc + (s.records?.length ?? 0), 0),
    [sessions],
  );
  const lastSession = useMemo(
    () => (sessions.length ? sessions[0] : null),
    [sessions],
  );

  const avgBpm = useMemo(() => {
    const all: number[] = [];
    sessions.forEach((s) =>
      s.records?.forEach((r) => typeof r.bpm === "number" && all.push(r.bpm)),
    );
    if (!all.length) return null;
    return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
  }, [sessions]);

  const avgSpO2 = useMemo(() => {
    const all: number[] = [];
    sessions.forEach((s) =>
      s.records?.forEach((r) => typeof r.spo2 === "number" && all.push(r.spo2)),
    );
    if (!all.length) return null;
    return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
  }, [sessions]);

  const testsChartData = useMemo(
    () =>
      [...tests]
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        .map((t) => ({
          date: new Date(t.createdAt).toLocaleDateString(),
          score: t.score,
        })),
    [tests],
  );

  // ===== Exportar CSV =====

  const handleExportCsv = () => {
    const patientName = patient?.user?.fullname || patient?.id || "paciente";

    const lines: string[] = [];

    // Encabezado
    lines.push("Reporte de paciente");
    lines.push(["Paciente", csvEscape(patientName)].join(","));
    lines.push(["ID paciente", csvEscape(patient?.id ?? "")].join(","));
    lines.push(["Total sesiones", csvEscape(sessions.length)].join(","));
    lines.push(["Total registros", csvEscape(totalRecords)].join(","));
    lines.push(
      ["Promedio BPM", csvEscape(avgBpm !== null ? avgBpm : "")].join(","),
    );
    lines.push(
      ["Promedio SpO2", csvEscape(avgSpO2 !== null ? avgSpO2 : "")].join(","),
    );
    lines.push("");

    // Tests
    lines.push("Tests");
    lines.push("Test ID,Fecha,Score,Comentario IA");
    tests.forEach((t) => {
      lines.push(
        [
          csvEscape(t.id),
          csvEscape(fmtDate(t.createdAt)),
          csvEscape(t.score),
          csvEscape(t.aiComment),
        ].join(","),
      );
    });
    if (!tests.length) {
      lines.push("Sin tests registrados,,,");
    }
    lines.push("");

    // Sesiones (nivel sesión)
    lines.push("Sesiones");
    lines.push("Sesion ID,Paciente ID,Dispositivo,Inicio,Fin,Registros");
    sessions.forEach((s) => {
      lines.push(
        [
          csvEscape(s.id),
          csvEscape(s.patient?.id),
          csvEscape(s.device?.serialNumber ?? ""),
          csvEscape(fmtDate(s.startedAt)),
          csvEscape(fmtDate(s.endedAt)),
          csvEscape(s.records?.length ?? 0),
        ].join(","),
      );
    });
    if (!sessions.length) {
      lines.push("Sin sesiones,,,");
    }
    lines.push("");

    // Registros detallados
    lines.push("Registros por sesión");
    lines.push("Sesion ID,Registro ID,Fecha,Voltaje (V),BPM,SpO2 (%)");
    sessions.forEach((s) => {
      (s.records ?? []).forEach((r: SessionData) => {
        lines.push(
          [
            csvEscape(s.id),
            csvEscape(r.id),
            csvEscape(fmtDate(r.recordedAt)),
            csvEscape(r.pressureVolt ?? ""),
            csvEscape(r.bpm ?? ""),
            csvEscape(r.spo2 ?? ""),
          ].join(","),
        );
      });
    });
    if (!sessions.some((s) => s.records?.length)) {
      lines.push("Sin registros,,,");
    }

    const content = lines.join("\n");
    const filename = `reporte_paciente_${patientName
      .replace(/\s+/g, "_")
      .toLowerCase()}.csv`;

    downloadCsv(filename, content);
  };

  // ===== Render =====

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-5xl flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-red-600">{error}</p>
              <Button onClick={handleReload} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              Sesiones & Tests —{" "}
              {patient?.user?.fullname
                ? `${patient.user.fullname}`.trim()
                : (patient?.id ?? "Paciente")}
            </h1>
            <p className="text-xs text-muted-foreground">
              Progreso del paciente, registros fisiológicos y resultados de
              evaluación
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportCsv}
              variant="secondary"
              size="sm"
              disabled={loading}
            >
              Exportar CSV
            </Button>
            <Button
              onClick={handleReload}
              variant="outline"
              size="sm"
              disabled={reloading}
            >
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
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Sesiones</div>
              <div className="text-2xl font-semibold">{sessions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Registros</div>
              <div className="text-2xl font-semibold">{totalRecords}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Última sesión</div>
              <div className="text-sm">
                {fmtDate(lastSession?.startedAt ?? null)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">
                HR / SpO₂ (prom.)
              </div>
              <div className="text-sm">
                {avgBpm !== null ? `${avgBpm} bpm` : "—"} /{" "}
                {avgSpO2 !== null ? `${avgSpO2}%` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progreso de Tests */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Progreso de Tests</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {tests.length} test(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-56 w-full">
              {testsChartData.length ? (
                <ResponsiveContainer>
                  <LineChart
                    data={testsChartData}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      domain={["dataMin - 1", "dataMax + 1"]}
                    />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Aún no hay tests registrados.
                </div>
              )}
            </div>

            {/* Listado compacto */}
            <div className="space-y-3">
              {tests.map((t) => (
                <div key={t.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Score: {t.score}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(t.createdAt)}
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {t.aiComment}
                  </p>
                </div>
              ))}
              {!tests.length && (
                <p className="text-xs text-muted-foreground">
                  Cuando generes una evaluación desde el módulo de práctica,
                  aparecerá aquí.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sesiones y Registros */}
        <Card className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sesiones del paciente</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {sessions.length} sesión(es)
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {sessions.map((s) => (
              <div key={s.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    Sesión #{s.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Inicio: {fmtDate(s.startedAt)} · Fin: {fmtDate(s.endedAt)}
                  </div>
                  <div className="text-xs">
                    Dispositivo:{" "}
                    <Badge variant="outline">
                      {s.device?.serialNumber ?? "—"}
                    </Badge>
                  </div>
                  <div className="text-xs">
                    Registros: {s.records?.length ?? 0}
                  </div>
                </div>

                {/* Tabla simple de registros */}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr className="text-left">
                        <th className="py-2 pr-2">Fecha</th>
                        <th className="py-2 px-2">Voltaje (V)</th>
                        <th className="py-2 px-2">BPM</th>
                        <th className="py-2 px-2">SpO₂ (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(s.records ?? []).map((r: SessionData) => (
                        <tr key={r.id} className="border-t">
                          <td className="py-2 pr-2 whitespace-nowrap">
                            {fmtDate(r.recordedAt)}
                          </td>
                          <td className="py-2 px-2">{r.pressureVolt ?? "—"}</td>
                          <td className="py-2 px-2">{r.bpm ?? "—"}</td>
                          <td className="py-2 px-2">{r.spo2 ?? "—"}</td>
                        </tr>
                      ))}
                      {!s.records?.length && (
                        <tr>
                          <td
                            className="py-2 text-muted-foreground"
                            colSpan={4}
                          >
                            Sin registros en esta sesión.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            {!sessions.length && (
              <p className="text-xs text-muted-foreground">
                No hay sesiones registradas para este paciente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
