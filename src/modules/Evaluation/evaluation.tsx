import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, Loader2, RefreshCw, Send, Save } from "lucide-react";

import { useNativeRecorder } from "@/lib/audioLib"; // tu hook
import { iaService } from "./evaluation.service"; // ya existente en tu app
import { sessionService } from "@/modules/Session/data/session.service"; // creado antes
import { patientService } from "@/modules/Patient/data/patient.service"; // tu service de pacientes
import type { Patient } from "@/modules/Patient/patient.interface"; // tu interfaz de paciente
import type { EvaluationResult } from "./evaluation.interface";
import { useAuthStore } from "@/auth/useAuth";

export default function SpeechTherapyApp() {
  const { user } = useAuthStore();
  const isPatientUser = user?.type === "patient"; // <- bandera clave

  const [currentText, setCurrentText] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<string>("");

  const recordStartRef = useRef<number | null>(null);
  const [durationMs, setDurationMs] = useState(0);

  const {
    isRecording,
    error: recError,
    start,
    stop,
    dispose,
  } = useNativeRecorder({
    mimeType: "audio/webm;codecs=opus",
    audioBitsPerSecond: 128_000,
    constraints: {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    },
  });

  const texts = [
    "La comunicación es una de las habilidades más importantes que desarrollamos a lo largo de la vida. Cada palabra que dices es valiosa y merece ser escuchada con atención.",
    "El progreso personal es un viaje único para cada individuo. No importa la velocidad con la que avances, lo importante es que sigas dando pasos hacia adelante.",
    "La confianza en uno mismo se construye paso a paso. Cada intento de hablar es una oportunidad para crecer y fortalecer tu voz.",
    "Hablar con claridad es un arte que se perfecciona con el tiempo. Cada práctica, por pequeña que parezca, aporta a tu desarrollo.",
    "La perseverancia es la cualidad que distingue a quienes alcanzan sus metas. Aunque el camino tenga obstáculos, cada esfuerzo suma a tu progreso.",
    "Tu voz tiene un valor propio. No se mide por la perfección, sino por la autenticidad con la que expresas lo que piensas y sientes.",
    "Equivocarse al hablar es parte natural del aprendizaje. Lo importante no es no equivocarse, sino seguir intentándolo con valentía.",
    "Cada vez que decides hablar, estás eligiendo confiar en ti mismo. Esa decisión es una victoria, aunque el resultado no sea perfecto.",
    "Respirar profundo antes de hablar te ayuda a encontrar calma. Tu ritmo es tuyo, y no necesitas ajustarlo al de nadie más.",
    "Tu forma de hablar es única, igual que tu historia. No estás compitiendo con nadie; solo estás construyendo la mejor versión de ti mismo.",
  ];

  const generateNewText = () => {
    setCurrentText(texts[Math.floor(Math.random() * texts.length)]);
    setResult(null);
    setBlob(null);
    setDurationMs(0);
    recordStartRef.current = null;
  };

  const loadPatients = async () => {
    // Si el usuario es paciente, no tiene sentido cargar el listado
    if (isPatientUser) return;
    try {
      const data = await patientService.findAll();
      setPatients(data ?? []);
    } catch {
      setPatients([]);
    }
  };

  useEffect(() => {
    generateNewText();
    void loadPatients();

    // Si es un usuario paciente, fijamos automáticamente el patientId
    if (isPatientUser && user?.id) {
      // OJO: si en tu modelo el id del paciente es otro (ej. user.patient.id),
      // cambia aquí.
      setPatientId(user.id);
    }

    return () => {
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPatientUser, user?.id]);

  const durationLabel = useMemo(() => {
    if (!durationMs) return "";
    const s = Math.max(0, Math.round(durationMs / 1000));
    return `${s}s`;
  }, [durationMs]);

  const sizeLabel = useMemo(() => {
    if (!blob) return "";
    const kb = blob.size / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
  }, [blob]);

  const handleStart = async () => {
    setResult(null);
    setBlob(null);
    setDurationMs(0);
    recordStartRef.current = Date.now();
    await start();
  };

  const handleStop = async () => {
    const out = await stop();
    setBlob(out);
    if (recordStartRef.current) {
      setDurationMs(Date.now() - recordStartRef.current);
    }
  };

  const handleEvaluate = async () => {
    if (!blob || !currentText || isProcessing) return;
    if (!patientId) return; // obligatorio asociar a paciente
    if (blob.size < 2048) return;

    setIsProcessing(true);
    try {
      // Tu iaService exige File, no Blob
      const file = new File([blob], `speech-${Date.now()}.webm`, {
        type: blob.type || "audio/webm",
      });

      const data = await iaService.evaluate(currentText, file);
      const evalResult: EvaluationResult = {
        score: Math.round(data.score / 10),
        comment: data.comment || "Evaluación completada.",
      };
      setResult(evalResult);

      // Registrar Test para el paciente (módulo tests)
      await sessionService.createTest(patientId, {
        score: evalResult.score,
        aiComment: evalResult.comment,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!result || !patientId) return;
    try {
      await sessionService.createTest(patientId, {
        score: result.score,
        aiComment: result.comment,
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Práctica de Habla</h1>
            <p className="text-muted-foreground text-xs">
              Lee el texto, graba y evalúa
            </p>
          </div>

          <div className="w-56 flex justify-end">
            {isPatientUser ? (
              // Vista para paciente logueado: sin selector
              <div className="text-right">
                <p className="text-[11px] font-medium">Sesión de paciente</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.fullname ?? user?.email ?? "Mi cuenta"}
                </p>
              </div>
            ) : (
              // Vista normal: selector de paciente
              <Select onValueChange={setPatientId} value={patientId}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Selecciona paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.user.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Texto */}
        <Card className="border">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Texto de práctica</CardTitle>
              <Button
                onClick={generateNewText}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Nuevo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-3 rounded">
              <p className="text-sm">{currentText}</p>
            </div>
          </CardContent>
        </Card>

        {/* Grabación */}
        <Card className="border">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Grabación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? handleStop : handleStart}
                className="h-12 w-12 rounded-full p-0"
                disabled={isProcessing}
                aria-label={isRecording ? "Detener" : "Grabar"}
              >
                {isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </div>

            <div className="text-center min-h-[20px]">
              {recError ? (
                <p className="text-xs text-red-600">
                  {recError || "Error de grabación"}
                </p>
              ) : isRecording ? (
                <p className="text-xs text-destructive">Grabando…</p>
              ) : blob ? (
                <p className="text-xs text-muted-foreground">
                  {durationLabel && <span>Duración: {durationLabel}</span>}
                  {durationLabel && sizeLabel && <span> · </span>}
                  {sizeLabel && <span>Tamaño: {sizeLabel}</span>}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Listo</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleEvaluate}
                className="h-9"
                disabled={!blob || !patientId || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Evaluar
                  </>
                )}
              </Button>

              <Button
                onClick={handleSaveOnly}
                className="h-9"
                variant="outline"
                disabled={!result || !patientId}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {result && (
          <Card className="border border-primary">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {result.score}
                </div>
                <div className="text-xs text-muted-foreground">
                  Calificación
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded">
                <p className="text-sm text-center">{result.comment}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
