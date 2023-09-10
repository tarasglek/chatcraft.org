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
  const mimeType = "audio/webm";
  const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

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
