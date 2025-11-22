import { useEffect, useMemo, useRef, useState } from "react";
import type { MqttClient } from "mqtt";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { getMqttClient, closeMqttClient } from "@/lib/mqtt";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Activity, HeartPulse } from "lucide-react";

type TelemetryPayload = {
  bpm?: number;
  spo2?: number;
  pressureVolt?: number;
};

type PressurePoint = {
  ts: string; // ISO
  pressureVolt: number;
};

export default function TelemetryMonitoringPage() {
  const [isLive, setIsLive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [bpm, setBpm] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [pressureHistory, setPressureHistory] = useState<PressurePoint[]>([]);

  const clientRef = useRef<MqttClient | null>(null);

  // Manejo de conexión MQTT
  useEffect(() => {
    // Si no queremos monitoreo, cortar todo
    if (!isLive) {
      try {
        clientRef.current?.unsubscribe("telemetry");
      } catch {
        // no-op
      }
      try {
        clientRef.current?.removeAllListeners?.();
      } catch {
        // no-op
      }
      closeMqttClient();
      clientRef.current = null;
      setIsConnected(false);
      return;
    }

    const client = getMqttClient();
    clientRef.current = client;

    const onConnect = () => {
      setIsConnected(true);
      client.subscribe("telemetry", { qos: 0 });
    };

    const onReconnect = () => {
      setIsConnected(false);
    };

    const onClose = () => {
      setIsConnected(false);
    };

    const onError = () => {
      setIsConnected(false);
    };

    const onMessage = (_topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString()) as TelemetryPayload;

        if (typeof data.bpm === "number") {
          setBpm(data.bpm);
        }
        if (typeof data.spo2 === "number") {
          setSpo2(data.spo2);
        }
        if (typeof data.pressureVolt === "number") {
          const now = new Date().toISOString();
          setPressureHistory((prev) => {
            const next = [
              ...prev,
              { ts: now, pressureVolt: data.pressureVolt! },
            ];
            // limitar buffer, p.e. últimos 200 puntos
            if (next.length > 200) next.shift();
            return next;
          });
        }
      } catch (err) {
        console.error("MQTT payload inválido:", err);
      }
    };

    client.on("connect", onConnect);
    client.on("reconnect", onReconnect);
    client.on("close", onClose);
    client.on("error", onError);
    client.on("message", onMessage);

    return () => {
      try {
        client.off("connect", onConnect);
        client.off("reconnect", onReconnect);
        client.off("close", onClose);
        client.off("error", onError);
        client.off("message", onMessage);
        client.unsubscribe("telemetry");
      } catch {
        // no-op
      }
    };
  }, [isLive]);

  const chartData = useMemo(
    () =>
      pressureHistory.map((p) => ({
        time: new Date(p.ts).toLocaleTimeString("es-ES", {
          minute: "2-digit",
          second: "2-digit",
        }),
        pressureVolt: p.pressureVolt,
      })),
    [pressureHistory],
  );

  const toggleLive = () => {
    setIsLive((prev) => !prev);
  };

  return (
    <div className="space-y-6">
      {/* Header + control conexión */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Telemetría en Tiempo Real
          </h2>
          <p className="text-muted-foreground">
            Stream directo desde el dispositivo ESP32 vía MQTT.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <Badge className="bg-green-100 text-green-800">Conectado</Badge>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-gray-400" />
                <Badge variant="secondary">Desconectado</Badge>
              </>
            )}
          </div>

          <Button
            onClick={toggleLive}
            variant={isLive ? "destructive" : "default"}
          >
            {isLive ? "Detener monitoreo" : "Iniciar monitoreo"}
          </Button>
        </div>
      </div>

      {/* KPIs: BPM / SpO2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Frecuencia Cardíaca
            </CardTitle>
            <HeartPulse className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {bpm !== null ? `${bpm} bpm` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Último valor recibido por MQTT.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SpO₂</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {spo2 !== null ? `${spo2.toFixed(1)} %` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Saturación de oxígeno estimada.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de pressureVolt */}
      <Card>
        <CardHeader>
          <CardTitle>Presión – Evolución en el tiempo</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              {isLive
                ? "Esperando datos de telemetría..."
                : "Inicia el monitoreo para ver el gráfico en tiempo real."}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="pressureVolt"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
