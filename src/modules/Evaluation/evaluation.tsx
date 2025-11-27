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
  const [transcript, setTranscript] = useState("");

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
    "La comunicación es una de las habilidades más importantes que desarrollamos a lo largo de la vida, tanto en el ámbito personal como en el profesional. Cada palabra que dices es valiosa y merece ser escuchada con atención, porque detrás de cada idea hay una intención, una emoción y una historia que te representan. A medida que fortaleces tu capacidad de expresarte, también fortaleces tu presencia, tu credibilidad y tu capacidad de influir positivamente en tu entorno. Hablar no es solo transmitir información; es construir puentes, generar confianza y dejar una marca en quienes te escuchan.",

    "El progreso personal es un viaje único para cada individuo, un proceso que no sigue una línea recta ni se mide con el mismo patrón para todos. No importa la velocidad con la que avances, lo fundamental es que mantengas la disciplina y la disposición de seguir dando pasos hacia adelante, incluso cuando enfrentas dudas o resistencia. Crecer implica aceptar tus tiempos, reconocer tus logros —por pequeños que parezcan— y mantener una visión clara de la persona que quieres llegar a ser. Cada avance, por mínimo que parezca hoy, se convierte en un aporte estratégico para tu futuro.",

    "La confianza en uno mismo se construye paso a paso, con constancia y conciencia. Ninguna seguridad sólida nace de un día para otro; se forma a partir de intentos, errores, ajustes y nuevas oportunidades. Cada intento de hablar es una ocasión para crecer y fortalecer tu voz, para validar que tienes algo que aportar y que tu perspectiva merece espacio. Cuando decides expresarte, aunque sientas inseguridad, estás invirtiendo en tu desarrollo personal y profesional. Ese tipo de valentía tiene un impacto directo en tu capacidad de liderar, colaborar y comunicarte con claridad.",

    "Hablar con claridad es un arte que se perfecciona con el tiempo, con práctica consciente y autocrítica constructiva. No se trata únicamente de pronunciar bien, sino de ordenar tus ideas, transmitir intención y conectar con quien te escucha. Cada práctica, por pequeña que parezca, aporta a tu desarrollo y se acumula como experiencia práctica. Lo que hoy puede parecer un desafío, mañana se convierte en una habilidad natural. La claridad en la comunicación no solo mejora tus conversaciones; también eleva tu capacidad para negociar, presentar ideas y desempeñarte en entornos de alto rendimiento.",

    "La perseverancia es la cualidad que distingue a quienes alcanzan sus metas de quienes se quedan a medio camino. Aunque el camino tenga obstáculos, dudas o momentos de frustración, cada esfuerzo suma a tu progreso. Mantenerte firme pese a los contratiempos envía un mensaje claro: estás comprometido con tu desarrollo y dispuesto a invertir el esfuerzo necesario para mejorar. Quien persevera aprende más, se adapta mejor y desarrolla una resiliencia que se convierte en ventaja competitiva en cualquier contexto.",

    "Tu voz tiene un valor propio, independientemente de la comparación con los demás. No se mide por la perfección, sino por la autenticidad con la que expresas lo que piensas y sientes. Cuando hablas desde un lugar genuino, conectas de manera más profunda y proyectas integridad. La autenticidad genera respeto, fortalece relaciones y permite que tus ideas se reciban con mayor apertura. Reconoce el valor de tu voz, porque es un reflejo directo de tu identidad, tu experiencia y tu capacidad de contribuir en cualquier entorno.",

    "Equivocarse al hablar es parte natural del aprendizaje, y lejos de restarte valor, demuestra que estás dispuesto a mejorar. Lo importante no es evitar cada error, sino seguir intentándolo con valentía y determinación. Cada equivocación te ofrece información útil: te ayuda a corregir, ajustar y avanzar. Las personas que crecen no son las que nunca fallan, sino las que entienden que cada intento es un paso necesario para dominar cualquier habilidad. Hablar, equivocarte y volver a intentarlo es un ciclo de mejora continua.",

    "Cada vez que decides hablar, estás eligiendo confiar en ti mismo, y esa elección tiene un impacto significativo en tu crecimiento personal. Esa decisión es una victoria, aunque el resultado no sea perfecto. Tomar la palabra demuestra liderazgo, seguridad y disposición a participar. Aunque sientas dudas o nervios, expresarte te permite construir presencia, ganar experiencia y fortalecer tu cancha comunicacional. Lo importante no es la perfección inmediata, sino la consistencia de atreverte una y otra vez.",

    "Respirar profundo antes de hablar te ayuda a encontrar calma, claridad y control sobre tu mensaje. Tu ritmo es tuyo, y no necesitas ajustarlo al de nadie más. En un mundo acelerado, dominar tu propio tempo te permite comunicarte con mayor precisión y evitar bloqueos innecesarios. Detenerte unos segundos para respirar no solo te estabiliza; también te da espacio mental para ordenar tus ideas y proyectar seguridad. Ese pequeño hábito puede transformar tu forma de comunicarte y mejorar tu capacidad para manejar situaciones de presión.",

    "Tu forma de hablar es única, igual que tu historia. No estás compitiendo con nadie; estás construyendo tu propia versión de excelencia comunicativa. Cada experiencia que has vivido influye en tu manera de expresarte, y esa singularidad es un activo, no una debilidad. Desarrollar tu voz implica aceptar quién eres, potenciar tus fortalezas y trabajar sobre aquello que deseas mejorar. En lugar de compararte, enfócate en construir una comunicación auténtica, clara y alineada con la persona que quieres proyectar.",
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
    try {
      const data = await patientService.findAll();
      setPatients(data ?? []);
    } catch {
      setPatients([]);
    }
  };

  useEffect(() => {
    void loadPatients();
  }, []);

  useEffect(() => {
    generateNewText();
    if (isPatientUser && user?.id) {
      if (patients) {
        setPatientId(
          patients.find((patient) => patient.user.id === user.id)?.id ??
            user.id,
        );
      }
    }
    return () => {
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPatientUser, user?.id, patients]);

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
        inputText: currentText,
        userText: data.transcript,
      });
      setTranscript(data.transcript);
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
        inputText: currentText,
        userText: transcript,
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
