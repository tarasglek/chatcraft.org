import OpenAI from "openai";
import { getSettings } from "./settings";

// We prefer to use webm, but Safari on iOS has to use mp4
const supportedAudioMimeTypes = ["audio/webm", "audio/mp4"];

// Set up an audio stream, which may mean dealing with permissions from the user
async function getMediaStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    return stream;
  } catch (e: any) {
    if (e.name === "NotAllowedError") {
      throw new Error("SpeechRecognition error: audio recording permission denied.");
    }
    throw e;
  }
}

// Create an audio MediaRecorder using a supported file type
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

  throw new Error("SpeechRecognition error: no supported mime-type found");
}

export class SpeechRecognition {
  private _recordingPromise: Promise<File> | null = null;
  private _mediaRecorder: MediaRecorder | null = null;
  private _mediaStream: MediaStream | null = null;
  private _mimeType: string | null = null;
  private _sttModel: string;

  constructor(sttModel: string) {
    this._sttModel = sttModel;
  }

  // Initialize, creating an audio stream, media recorder, deal with permissions, etc.
  async init() {
    const stream = await getMediaStream();
    const { mediaRecorder, mimeType } = getCompatibleMediaRecorder(stream);

    this._mediaRecorder = mediaRecorder;
    this._mediaStream = stream;
    this._mimeType = mimeType;
  }

  get isInitialized() {
    return !!this._mediaRecorder && !!this._mediaStream && !!this._mimeType;
  }

  get isRecording() {
    return this.isInitialized && this._recordingPromise !== null;
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error("SpeechRecognition error: start() called before init()");
    }

    if (this.isRecording) {
      throw new Error("SpeechRecognition error: start() called while already recording");
    }

    this._recordingPromise = new Promise<File>((resolve, reject) => {
      const recordedChunks: BlobPart[] = [];

      if (!this._mediaRecorder) {
        reject(
          new Error(
            `SpeechRecognition error: no supported mimeType found in: ${supportedAudioMimeTypes}`
          )
        );
        return;
      }

      this._mediaRecorder.ondataavailable = ({ data }) => {
        if (!this.isRecording) {
          // Recording must have been cancelled, clean up and quit
          this._cleanup();
          return;
        }

        if (data.size > 0) {
          recordedChunks.push(data);
        }
      };

      this._mediaRecorder.onstop = () => {
        if (!this.isRecording) {
          this._cleanup();
          return;
        }

        const mimeType = this._mimeType;
        if (!mimeType) {
          throw new Error("SpeechRecognition error: start() called with no mime type available");
        }
        const fname = mimeType.split(";")[0].replace("/", ".");
        const file = new File(recordedChunks, fname, { type: mimeType });
        resolve(file);
      };
    });

    // XXX: for iOS, prefer 1 second blobs, see https://webkit.org/blog/11353/mediarecorder-api/
    if (!this._mediaRecorder) {
      throw new Error("SpeechRecognition error: start() called with no MediaRecorder available");
    }
    this._mediaRecorder.start(1_000);
  }

  private _stopRecording() {
    // Safely stop the media recorder if it exists and is recording
    const mediaRecorder = this._mediaRecorder;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  }

  async transcribe(audio: File) {
    const { currentProvider } = getSettings();
    if (!currentProvider.apiKey) {
      throw new Error("Missing OpenAI API Key");
    }

    const { openai } = currentProvider.createClient(currentProvider.apiKey);
    const transcriptions = new OpenAI.Audio.Transcriptions(openai);
    const transcription = await transcriptions.create({
      file: audio,
      model: this._sttModel,
    });
    return transcription.text;
  }

  async stop() {
    if (!this._recordingPromise) {
      throw new Error("SpeechRecognition error: stop() called while no recording in progress");
    }

    this._stopRecording();
    const file = await this._recordingPromise;
    this._recordingPromise = null;
    this._cleanup();

    // Turn audio into text via OpenAI and Whisper. If we don't have enough audio
    // for the file to contain any data, return null.
    return file.size > 0 ? this.transcribe(file) : null;
  }

  cancel() {
    this._cleanup();
  }

  private _cleanup() {
    this._stopRecording();
    this._mediaRecorder = null;
    this._mediaStream?.getTracks().forEach((track) => track.stop());
    this._mediaStream = null;
    this._mimeType = null;
  }
}
