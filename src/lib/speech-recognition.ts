import { transcribe } from "./ai";

type RecordingInProgress = () => Promise<File>;
/**
 * Openai supports: m4a mp3 webm mp4 mpga wav mpeg
 * of these audio/webm is supported by chrome, firefox
 * and audio/mp3 is supported by safari
 */
async function startRecording(): Promise<RecordingInProgress> {
  const recordedChunks: BlobPart[] = [];
  let stopRecordingResolve: (value: File) => void;
  const audioDataPromise = new Promise<File>((resolve) => {
    stopRecordingResolve = resolve;
  });

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: any) {
    if (e.name === "NotAllowedError") {
      throw new Error("Recording permission denied");
    }
    throw e;
  }

  let mimeType = "audio/webm";
  let mediaRecorder: MediaRecorder;
  // Handle Safari not supporting webm
  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
  } catch (e: any) {
    if (e.name === "NotSupportedError") {
      mimeType = "audio/mp3";
      mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
    } else {
      throw e;
    }
  }

  mediaRecorder.ondataavailable = function (e) {
    if (e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = function () {
    const file = new File(recordedChunks, mimeType.replace("/", "."), {
      type: mimeType,
    });
    stopRecordingResolve(file);
  };

  mediaRecorder.start();

  return () => {
    mediaRecorder.stop();
    return audioDataPromise;
  };
}

export class SpeechRecognition {
  private _isCancelled: boolean;
  private _recording = null as RecordingInProgress | null;

  constructor() {
    this._isCancelled = false;
  }

  get isRecording() {
    return this._recording !== null;
  }

  get isCancelled() {
    return this._isCancelled;
  }

  async start() {
    if (this.isRecording) {
      throw new Error("Recording already started");
    }

    if (this._isCancelled) {
      throw new Error("Recording cancelled");
    }

    console.log("Recording started...");
    this._recording = await startRecording();
  }

  async stop(): Promise<string | null> {
    if (this._isCancelled) {
      // Recording already stopped via `.cancel()`
      console.warn("Recording cancelled");
      return null;
    }

    const stopFunc = this._recording;
    if (!stopFunc) {
      throw new Error("No recording in progress");
    }

    const filePromise = stopFunc();
    this._recording = null;

    const file = await filePromise;
    // log stats
    console.log(`Recording stopped. File size: ${file.size} bytes. File type: ${file.type}`);
    const transcription = await transcribe(file);

    return transcription;
  }

  async cancel() {
    const stopFunc = this._recording;
    if (!stopFunc) {
      throw new Error("No recording in progress");
    }
    stopFunc();
    this._recording = null;
    console.log("Recording cancelled.");
    this._isCancelled = true;
  }
}
