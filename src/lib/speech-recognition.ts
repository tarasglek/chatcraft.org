import { an } from "vitest/dist/types-198fd1d9";
import { transcribe } from "./ai";

export class SpeechRecognition {
  private _recordingPromise: Promise<File> | null = null;
  private _mediaRecorder: MediaRecorder | null = null;

  get isRecording() {
    return this._recordingPromise !== null;
  }

  async start(): Promise<void> {
    console.log("start");
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
        console.log(`navigator.mediaDevices: ${navigator.mediaDevices}`);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e: any) {
        if (e.name === "NotAllowedError") {
          throw new Error("Recording permission denied");
        }
        throw e;
      }

      const mimeTypeList = ["audio/webm", "audio/mp4"];
      let mimeType = mimeTypeList[0];
      for (const mimeTypeCandidate of mimeTypeList) {
        mimeType = mimeTypeCandidate;
        // Handle Safari not supporting webm
        try {
          this._mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
          console.log(`Using mimeType: ${mimeType}`);
        } catch (e: any) {
          if (e.name === "NotSupportedError") {
            console.log(`${e}: ${mimeType} not supported`);
            continue;
          }
          throw e;
        }
      }
      if (!this._mediaRecorder) {
        throw new Error(`No supported mimeType found in: ${mimeTypeList}`);
      }

      this._mediaRecorder.ondataavailable = function (e) {
        console.log(
          `ondataavailable() e.data.size: ${e.data.size} isRecording: ${self.isRecording}`
        );
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
        console.log(
          `onstop() isRecording: ${self.isRecording} recordedChunks.length: ${recordedChunks.length}`
        );
        if (!self.isRecording) {
          return;
        }

        const fname = mimeType.split(";")[0].replace("/", ".");
        console.log(`fname: ${fname} for mimeType: ${mimeType}`);
        const file = new File(recordedChunks, fname, {
          type: mimeType,
        });
        recordingPromiseResolve(file);
      };

      if (this.isRecording) {
        this._mediaRecorder.start();
      } else {
        console.log(
          `Recording cancelled, prior to cancellation mediaRecorder is: ${this._mediaRecorder.state}`
        );
        this._mediaRecorder = null;
      }
    })();
    this._recordingPromise = initPromise.then(() => audioDataPromise);
    await initPromise;
  }

  async stop(): Promise<string | null> {
    console.log("stop");
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
    console.log(`file: ${file} file.name: ${file.name} file.size: ${file.size}`);
    (window as any).audio = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
    };
    const transcription = await transcribe(file);
    return transcription;
  }

  async cancel() {
    console.log("cancel");
    if (!this.isRecording) {
      throw new Error("No recording in progress");
    }
    this._recordingPromise = null;
    this.stop();
  }
}
