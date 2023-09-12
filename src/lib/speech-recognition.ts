import { transcribe, usingOfficialOpenAI } from "./ai";

// Audio Recording and Transcribing depends on a bunch of technologies
export function isTranscriptionSupported() {
  return (
    usingOfficialOpenAI() &&
    !!navigator.permissions &&
    !!navigator.mediaDevices &&
    !!window.MediaRecorder
  );
}

// See if the user has already granted permission to use the mic or not
export async function checkMicrophonePermission() {
  const getState = async () => {
    // XXX: TypeScript doesn't have proper types here due to browser differences, see
    // https://github.com/microsoft/TypeScript/issues/33923. For example, Firefox
    // refuses to implement this https://bugzilla.mozilla.org/show_bug.cgi?id=1449783.
    // If this throws, send through `granted` and let the page try it every time.
    try {
      const permissionName = "microphone" as PermissionName;
      const { state } = await navigator.permissions.query({ name: permissionName });
      return state;
    } catch (err: any) {
      console.warn(
        `unable to query for microphone permission, will try to acquire instead: ${err.message}`
      );
      return "granted";
    }
  };

  try {
    // Permission may have previously been granted/denied
    const currentState = await getState();
    if (currentState !== "prompt") {
      return currentState === "granted";
    }

    // If not, try prompting the user for permission now
    const stream = await getMediaStream();
    stream.getTracks().forEach((track) => {
      track.stop();
    });

    // Recheck the permission based on what they did.
    return (await getState()) === "granted";
  } catch (err: any) {
    console.warn(`error checking audio recording permissions: ${err.message}`);
    return false;
  }
}

// We prefer to use webm, but Safari on iOS has to use mp4
const supportedAudioMimeTypes = ["audio/webm", "audio/mp4"];

// Set up a stream, dealing with permissions from the user
async function getMediaStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return stream;
  } catch (e: any) {
    if (e.name === "NotAllowedError") {
      throw new Error(
        "Audio recording permission denied. Please allow microphone access in your browser."
      );
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

    if (!isTranscriptionSupported()) {
      return new Error("Audio transcription not supported");
    }

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
