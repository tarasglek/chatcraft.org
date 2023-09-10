import { transcribe } from "./ai";

export class SpeechRecognition {
  private _recordingPromise: Promise<File> | null = null;
  private _mediaRecorder: MediaRecorder | null = null;

  get isRecording() {
    return this._recordingPromise !== null;
  }

  async start(): Promise<void> {
    if (this.isRecording) {
      throw new Error("Recording already started");
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    let recordingPromiseResolve: (value: File) => void;
    const audioDataPromise = new Promise<File>((resolve) => {
      recordingPromiseResolve = resolve;
    });

    // wrap this up into a promise that runs after we return callback so we can cancel while accepting/rejecting permissions
    const initPromise = (async () => {
      const recordedChunks: BlobPart[] = [];

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
      // Handle Safari not supporting webm
      try {
        this._mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
      } catch (e: any) {
        if (e.name === "NotSupportedError") {
          mimeType = "audio/mp3";
          this._mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
        } else {
          throw e;
        }
      }

      this._mediaRecorder.ondataavailable = function (e) {
        if (!self.isRecording) {
          // Recording cancelled
          if (self._mediaRecorder) {
            self._mediaRecorder.stop();
          }
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      this._mediaRecorder.onstop = function () {
        if (!self.isRecording) {
          return;
        }
        const fname = mimeType.replace("/", ".");
        const file = new File(recordedChunks, fname, {
          type: mimeType,
        });
        recordingPromiseResolve(file);
      };

      if (this.isRecording) {
        this._mediaRecorder.start();
      } else {
        this._mediaRecorder = null;
      }
    })();
    this._recordingPromise = initPromise.then(() => audioDataPromise);
    await initPromise;
  }

  async stop(): Promise<string | null> {
    const recordingPromise = this._recordingPromise;
    const mediaRecorder = this._mediaRecorder;
    if (!mediaRecorder && recordingPromise) {
      // If we have a recording promise but no mediaRecorder, means we got prompted for permissions and had to abort recording to accept/reject
      this._recordingPromise = null;
      return null;
    } else if (mediaRecorder) {
      mediaRecorder.stop();
      this._mediaRecorder = null;
    }
    if (!recordingPromise) {
      return null;
    }
    const file = await recordingPromise;
    this._recordingPromise = null;
    // log stats
    const transcription = await transcribe(file);
    return transcription;
  }

  async cancel() {
    if (!this.isRecording) {
      throw new Error("No recording in progress");
    }
    this._recordingPromise = null;
    this.stop();
  }
}
