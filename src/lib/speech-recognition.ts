import { transcribe } from "./ai";

// We prefer to use webm, but Safari on iOS has to use mp4
const supportedAudioMimeTypes = ["audio/webm", "audio/mp4"];

// Set up a stream, dealing with permissions from the user
async function getMediaStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return stream;
  } catch (e: any) {
    if (e.name === "NotAllowedError") {
      throw new Error("Audio recording permission denied");
    }
    throw e;
  }
}

// Create an audio media recorder using the appropriate file type
function getCompatibleMediaRecorder(stream: MediaStream) {
  // Figure out the correct audio format to use (Safari doesn't support webm)
  let mimeType = supportedAudioMimeTypes[0];

  for (const mimeTypeCandidate of supportedAudioMimeTypes) {
    mimeType = mimeTypeCandidate;
    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      return { mediaRecorder, mimeType };
    } catch (e: any) {
      if (e.name === "NotSupportedError") {
        continue;
      }
      throw e;
    }
  }

  throw new Error("Error creating MediaRecorder: no supported mime-type found");
}

export class SpeechRecognition {
  private _recordingPromise: Promise<File> | null = null;
  private _mediaRecorder: MediaRecorder | null = null;

  get isRecording() {
    return this._recordingPromise !== null;
  }

  async start() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    if (self.isRecording) {
      throw new Error("Recording already started");
    }

    // Set up the audio stream for the user's mic
    const stream = await getMediaStream();
    const { mediaRecorder, mimeType } = getCompatibleMediaRecorder(stream);

    self._mediaRecorder = mediaRecorder;
    this._recordingPromise = new Promise<File>((resolve, reject) => {
      const recordedChunks: BlobPart[] = [];

      if (!self._mediaRecorder) {
        reject(new Error(`No supported mimeType found in: ${supportedAudioMimeTypes}`));
        return;
      }

      self._mediaRecorder.ondataavailable = function ({ data }) {
        if (!self.isRecording) {
          // Recording must have been cancelled, clean up and quit
          self._mediaRecorder?.stop();
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (data.size > 0) {
          recordedChunks.push(data);
        }
      };

      self._mediaRecorder.onstop = function () {
        if (!self.isRecording) {
          return;
        }

        const fname = mimeType.split(";")[0].replace("/", ".");
        const file = new File(recordedChunks, fname, { type: mimeType });
        resolve(file);
      };
    });

    if (!self.isRecording) {
      console.warn(
        `Recording cancelled, prior to cancellation mediaRecorder was in state: ${self._mediaRecorder.state}`
      );
      this._mediaRecorder = null;
      return;
    }

    // XXX: for iOS, prefer 1 second blobs, see https://webkit.org/blog/11353/mediarecorder-api/
    self._mediaRecorder.start(1_000);
  }

  async stop() {
    if (!this._recordingPromise) {
      throw new Error("No recording in progress");
    }

    this._mediaRecorder?.stop();
    this._mediaRecorder = null;
    const file = await this._recordingPromise;
    this._recordingPromise = null;

    // Turn audio into text via OpenAI and Whisper
    return transcribe(file);
  }

  async cancel() {
    if (!this.isRecording) {
      throw new Error("No recording in progress");
    }
    this._recordingPromise = null;
    this._mediaRecorder?.stop();
    this._mediaRecorder = null;

    return null;
  }
}
