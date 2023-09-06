export class SpeechRecognition {
  private _isRecording: boolean;
  private _isCancelled: boolean;

  constructor() {
    this._isRecording = false;
    this._isCancelled = false;
  }

  get isRecording() {
    return this._isRecording;
  }

  get isCancelled() {
    return this._isCancelled;
  }

  async start() {
    if (this._isRecording) {
      throw new Error("Recording already started");
    }

    if (this._isCancelled) {
      throw new Error("Recording cancelled");
    }

    console.log("Recording started...");
    this._isRecording = true;
  }

  async stop() {
    if (this._isCancelled) {
      // Recording already stopped via `.cancel()`, ignore this.
      return;
    }

    if (!this._isRecording) {
      throw new Error("No recording in progress");
    }

    console.log("Recording stopped");
    this._isRecording = false;
  }

  async cancel() {
    if (!this._isRecording) {
      throw new Error("No recording in progress");
    }

    console.log("Recording cancelled.");
    this._isCancelled = true;
    this._isRecording = false;
  }
}
