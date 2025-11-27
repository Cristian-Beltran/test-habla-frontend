// Tipos para sesiones, registros y tests (frontend)

export interface SessionData {
  id: string;
  pressureVolt: number | null;
  bpm: number | null;
  spo2: number | null;
  recordedAt: string; // ISO
}

export interface SessionDevice {
  id: string;
  serialNumber: string;
}

export interface SessionPatientRef {
  id: string;
}

export interface Session {
  id: string;
  patient: SessionPatientRef; // { id }
  device: SessionDevice; // { id, serialNumber }
  startedAt: string; // ISO
  endedAt: string | null; // ISO | null
  records?: SessionData[]; // opcional según endpoint
}

/** Payload para ingesta desde el ESP32 */
export interface IngestSessionInput {
  serialNumber: string;
  ts?: number; // epoch ms (opcional)
  pressureVolt?: number;
  bpm?: number;
  spo2?: number;
  recordedAt?: string; // ISO (prioritario sobre ts)
}

/** Respuesta de /sessions/ingest */
export interface IngestSessionResponse {
  session: {
    id: string;
    patient: { id: string };
    device: { id: string; serialNumber: string };
    startedAt: string;
    endedAt: string | null;
  };
  record: SessionData;
}

/** Test independiente (por paciente) */
export interface TestItem {
  id: string;
  patient: { id: string };
  score: number; // 0..10 (permite decimales)
  aiComment: string; // comentario de IA
  userText: string;
  inputText: string;
  createdAt: string; // ISO
}

export interface CreateTest {
  score: number; // 0..10
  aiComment: string;
  userText: string;
  inputText: string;
}

// session.interface.ts
export interface SpeechProgressResult {
  previousScore: number;
  currentScore: number;
  delta: number;
  improved: boolean;
  comment: string;
}
