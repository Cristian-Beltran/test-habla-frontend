import axios from "@/lib/axios";
import type {
  CreateTest,
  IngestSessionInput,
  IngestSessionResponse,
  Session,
  SpeechProgressResult,
  TestItem,
} from "../session.interface";

const BASE = "/sessions";

export const sessionService = {
  /** Ingesta de una muestra desde el ESP32 (crea/continúa la sesión del día) */
  ingest: async (data: IngestSessionInput): Promise<IngestSessionResponse> => {
    const res = await axios.post(`${BASE}/ingest`, data);
    return res.data as IngestSessionResponse;
  },

  /** Lista todas las sesiones del sistema (con relaciones básicas) */
  findAll: async (): Promise<Session[]> => {
    const res = await axios.get(`${BASE}`);
    return res.data as Session[];
  },

  /** Lista todas las sesiones de un paciente (incluye records) */
  findAllByPatient: async (patientId: string): Promise<Session[]> => {
    const res = await axios.get(`${BASE}/patient/${patientId}`);
    return res.data as Session[];
  },

  // ======================
  //         TESTS
  // ======================

  /** Crea un test (independiente de sesión) para un paciente */
  createTest: async (
    patientId: string,
    data: CreateTest,
  ): Promise<TestItem> => {
    const res = await axios.post(`${BASE}/patient/${patientId}/tests`, data);
    return res.data as TestItem;
  },

  /** Lista todos los tests de un paciente */
  listTests: async (patientId: string): Promise<TestItem[]> => {
    const res = await axios.get(`${BASE}/patient/${patientId}/tests`);
    return res.data as TestItem[];
  },

  /** Obtiene un test específico de un paciente */
  getTest: async (patientId: string, testId: string): Promise<TestItem> => {
    const res = await axios.get(`${BASE}/patient/${patientId}/tests/${testId}`);
    return res.data as TestItem;
  },

  compareTestsTexts: async (
    previousText: string,
    currentText: string,
  ): Promise<SpeechProgressResult> => {
    const res = await axios.post(`/ia/compare`, {
      previousText,
      currentText,
    });
    return res.data as SpeechProgressResult;
  },
};
