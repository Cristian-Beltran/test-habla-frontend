import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Activity, Wind, Heart } from "lucide-react";

/** Fases posibles del ciclo respiratorio */
type Phase = "inhale" | "hold" | "exhale" | "holdEmpty";

/** Patrón de respiración: todos los campos son opcionales para permitir variantes */
interface BreathingPattern {
  inhale?: number;
  hold?: number;
  exhale?: number;
  holdEmpty?: number;
}

/** Estructura del ejercicio */
interface Exercise {
  id: number;
  title: string;
  duration: string;
  difficulty: string;
  description: string;
  pattern: BreathingPattern;
  icon: React.ComponentType<{ className?: string }>;
}

const exercises: Exercise[] = [
  {
    id: 1,
    title: "Respiración 4-7-8",
    duration: "5 min",
    difficulty: "Principiante",
    description:
      "Técnica calmante: 4s inhalar (nariz) · 7s sostener · 8s exhalar (boca). Útil para reducir ansiedad y bajar la tensión laríngea antes del habla.",
    pattern: { inhale: 4, hold: 7, exhale: 8 },
    icon: Wind,
  },
  {
    id: 2,
    title: "Respiración Cuadrada",
    duration: "8 min",
    difficulty: "Intermedio",
    description:
      "Control rítmico 4-4-4-4: estabiliza la coordinación respiración–fonación y mejora la prosodia.",
    pattern: { inhale: 4, hold: 4, exhale: 4, holdEmpty: 4 },
    icon: Activity,
  },
  {
    id: 3,
    title: "Respiración Diafragmática",
    duration: "10 min",
    difficulty: "Avanzado",
    description:
      "Enfoque abdominal: menor esfuerzo laríngeo, voz más estable y menos empuje glótico.",
    pattern: { inhale: 6, hold: 2, exhale: 6 },
    icon: Heart,
  },
];

export default function BreathingPractice() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise>(
    exercises[0],
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>("inhale");
  const [timer, setTimer] = useState<number>(
    selectedExercise.pattern.inhale ?? 4,
  );

  // Animación controlada (1.0 → 1.5)
  const [scale, setScale] = useState<number>(1.0);
  const [transitionMs, setTransitionMs] = useState<number>(0);

  // Orden dinámico de fases según el patrón
  const phaseOrder = useMemo<Phase[]>(() => {
    const p: Phase[] = [];
    const pat = selectedExercise.pattern;
    if (pat.inhale && pat.inhale > 0) p.push("inhale");
    if (pat.hold && pat.hold > 0) p.push("hold");
    if (pat.exhale && pat.exhale > 0) p.push("exhale");
    if (pat.holdEmpty && pat.holdEmpty > 0) p.push("holdEmpty");
    return p.length ? p : ["inhale", "exhale"];
  }, [selectedExercise]);

  const getPhaseDuration = (phase: Phase): number => {
    return selectedExercise.pattern[phase] ?? 0;
  };

  const nextPhase = (phase: Phase): Phase => {
    const idx = phaseOrder.indexOf(phase);
    const nextIdx = (idx + 1) % phaseOrder.length;
    return phaseOrder[nextIdx];
  };

  // Reset limpio al cambiar ejercicio
  useEffect(() => {
    const first = phaseOrder[0];
    setIsPlaying(false);
    setCurrentPhase(first);
    setTimer(getPhaseDuration(first) || 1);
    setScale(1.0);
    setTransitionMs(0);
  }, [selectedExercise, phaseOrder]);

  // Temporizador por segundo solo cuando está reproduciendo
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setTimer((t) => {
        if (t > 1) return t - 1;
        const np = nextPhase(currentPhase);
        setCurrentPhase(np);
        return getPhaseDuration(np) || 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentPhase, phaseOrder]);

  // Animación: se actualiza al cambiar fase o al pasar a play/pausa
  useEffect(() => {
    if (!isPlaying) {
      setTransitionMs(0);
      return;
    }
    const dur = getPhaseDuration(currentPhase) * 1000;
    if (currentPhase === "inhale") {
      setTransitionMs(dur);
      setScale(1.5);
    } else if (currentPhase === "exhale") {
      setTransitionMs(dur);
      setScale(1.0);
    } else {
      // hold / holdEmpty → sin animación (mantiene escala)
      setTransitionMs(0);
    }
  }, [isPlaying, currentPhase]);

  const handlePlayPause = (): void => setIsPlaying((v) => !v);

  const handleReset = (): void => {
    const first = phaseOrder[0];
    setIsPlaying(false);
    setCurrentPhase(first);
    setTimer(getPhaseDuration(first) || 1);
    setScale(1.0);
    setTransitionMs(0);
  };

  const getPhaseText = (): string => {
    switch (currentPhase) {
      case "inhale":
        return "Inhalar";
      case "hold":
        return "Sostener";
      case "exhale":
        return "Exhalar";
      case "holdEmpty":
        return "Pausa";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1
            className="text-2xl font-semibold tracking-tight"
            data-testid="text-page-title"
          >
            Ejercicios de Respiración
          </h1>
          <p className="text-sm text-muted-foreground">
            Entrena un patrón respiratorio estable para coordinar
            respiración–fonación y mejorar la precisión articulatoria.
          </p>
        </div>

        {/* Selector de ejercicios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exercises.map((exercise) => {
            const Icon = exercise.icon;
            const active = selectedExercise.id === exercise.id;
            return (
              <Card
                key={exercise.id}
                className={`p-6 cursor-pointer transition-all ${active ? "ring-2 ring-primary shadow-sm" : "hover:shadow-sm"}`}
                onClick={() => setSelectedExercise(exercise)}
                data-testid={`card-exercise-${exercise.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3
                        className="text-base font-semibold"
                        data-testid={`text-exercise-title-${exercise.id}`}
                      >
                        {exercise.title}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        data-testid={`badge-difficulty-${exercise.id}`}
                      >
                        {exercise.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {exercise.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="rounded border px-1.5 py-0.5"
                        data-testid={`text-duration-${exercise.id}`}
                      >
                        Duración: {exercise.duration}
                      </span>
                      <span className="rounded border px-1.5 py-0.5">
                        {Object.entries(exercise.pattern)
                          .map(([k, v]) => `${k}:${v}s`)
                          .join(" · ")}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Panel principal */}
        <Card className="p-8">
          <div className="flex flex-col items-center space-y-8">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <div
                className="absolute w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/40"
                style={{
                  transform: `scale(${scale})`,
                  transitionProperty: "transform",
                  transitionTimingFunction: "linear",
                  transitionDuration: `${transitionMs}ms`,
                }}
                data-testid="animation-breathing-circle"
              />
              <div className="relative z-10 text-center">
                <p
                  className="text-sm text-muted-foreground mb-2"
                  data-testid="text-phase"
                >
                  {getPhaseText()}
                </p>
                <p className="text-5xl font-bold" data-testid="text-timer">
                  {timer}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                size="lg"
                onClick={handlePlayPause}
                data-testid="button-play-pause"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Iniciar
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar
              </Button>
            </div>

            <Card className="w-full p-6 bg-muted/50">
              <h3 className="text-base font-semibold mb-4">
                Cómo respirar (guía breve)
              </h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    1
                  </div>
                  <p className="flex-1">
                    Postura neutra: espalda recta, hombros sueltos. Mano en
                    abdomen para sentir expansión; evita elevar hombros.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    2
                  </div>
                  <p className="flex-1">
                    <strong>Inhalar</strong> por la nariz de forma silenciosa.
                    El círculo crece; tu abdomen también.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    3
                  </div>
                  <p className="flex-1">
                    <strong>Sostener</strong> (si aplica) sin tensión de cuello.
                    Mantén la glotis relajada; no empujes aire.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    4
                  </div>
                  <p className="flex-1">
                    <strong>Exhalar</strong> por la boca con labios
                    entreabiertos. El círculo disminuye; piensa “soplo largo”
                    estable.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    5
                  </div>
                  <p className="flex-1">
                    Beneficios: menor tensión laríngea, mejor coordinación
                    respiración–voz, prosodia más estable, reducción de
                    bloqueos/tartamudeo.
                  </p>
                </div>
                <p className="text-xs">
                  Si notas mareo, detente y respira con normalidad. Ajusta el
                  ritmo a tu comodidad clínica.
                </p>
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
}
