export interface EvaluationResult {
  score: number; // 0..100 (o 0..10, como devuelva tu backend)
  comment: string; // feedback IA
}

export interface EvaluateParams {
  text: string;
  audio: Blob; // audio/webm;codecs=opus (u otro según browser)
  lang?: string; // opcional, si tu backend acepta idioma
}
