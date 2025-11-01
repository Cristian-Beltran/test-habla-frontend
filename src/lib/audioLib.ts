import { useCallback, useEffect, useRef, useState } from "react";

export interface UseNativeRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  constraints?: MediaStreamConstraints;
  sliceMs?: number | null;
}

export interface UseNativeRecorder {
  isRecording: boolean;
  isReady: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  dispose: () => void;
}

export function useNativeRecorder(
  options?: UseNativeRecorderOptions,
): UseNativeRecorder {
  const {
    mimeType = "audio/webm;codecs=opus",
    audioBitsPerSecond,
    constraints,
    sliceMs = null,
  } = options ?? {};

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestStream = useCallback(async (): Promise<MediaStream> => {
    if (mediaStreamRef.current) return mediaStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        constraints ?? {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
          video: false,
        },
      );
      mediaStreamRef.current = stream;
      setIsReady(true);
      return stream;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudo acceder al micrófono.";
      setError(msg);
      setIsReady(false);
      throw e;
    }
  }, [constraints]);

  const resolveMime = useCallback((): string => {
    const candidates = [
      mimeType,
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const mt of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported?.(mt)
      ) {
        return mt;
      }
    }
    return "audio/webm";
  }, [mimeType]);

  const start = useCallback(async () => {
    setError(null);
    const stream = await requestStream();

    chunksRef.current = [];

    const mt = resolveMime();
    const mr = new MediaRecorder(stream, {
      mimeType: mt,
      ...(audioBitsPerSecond ? { audioBitsPerSecond } : {}),
    });

    mediaRecorderRef.current = mr;

    mr.ondataavailable = (evt: BlobEvent) => {
      if (evt.data && evt.data.size > 0) chunksRef.current.push(evt.data);
    };
    mr.onstart = () => setIsRecording(true);
    mr.onerror = (ev: Event) => {
      // @ts-expect-error algunos navegadores exponen error.message
      const msg = (ev?.error?.message as string) ?? "Error de grabación";
      setError(msg);
    };

    if (sliceMs && sliceMs > 0) {
      mr.start(sliceMs);
    } else {
      mr.start();
    }
  }, [audioBitsPerSecond, requestStream, resolveMime, sliceMs]);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) {
        setIsRecording(false);
        resolve(new Blob());
        return;
      }
      const handleStop = () => {
        setIsRecording(false);
        const type = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        mr.removeEventListener("stop", handleStop);
        resolve(blob);
      };
      mr.addEventListener("stop", handleStop);
      try {
        if (mr.state !== "inactive") mr.stop();
        else handleStop();
      } catch {
        handleStop();
      }
    });
  }, []);

  const dispose = useCallback(() => {
    try {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") mr.stop();
    } catch {
      console.error("Error");
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  useEffect(() => () => dispose(), [dispose]);

  return { isRecording, isReady, error, start, stop, dispose };
}
