import axios from "@/lib/axios";

export interface SpeechEvalResult {
  transcript: string;
  score: number;
  comment: string;
}

export const iaService = {
  evaluate: async (text: string, audio: File): Promise<SpeechEvalResult> => {
    const formData = new FormData();
    formData.append("text", text);
    formData.append("audio", audio);

    const res = await axios.post<SpeechEvalResult>("/ia/evaluate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },
};
