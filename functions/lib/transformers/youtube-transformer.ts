import { getSubtitles } from "youtube-captions-scraper";
import getVideoId from "get-video-id";

import { DefaultTransformer } from "./transformer";

type WebVTTCaption = {
  start: string | undefined;
  dur: string | undefined;
  text: string;
};

// Combine the captions into sentences, separated by newlines
function combineCaptions(captions: string[]) {
  return (
    captions
      .join(" ")
      // Any of the punctuation . ? ! ; are assumed to mean end-of-sentence
      .replace(/([.?!;])\s/g, "$1\n\n")
      .trim()
  );
}

export class YouTubeTransformer extends DefaultTransformer {
  async shouldTransform(url: URL) {
    // See if we can parse a YouTube video ID out of the URL
    const videoInfo = getVideoId(url.href);
    return videoInfo.service === "youtube" && !!videoInfo.id;
  }

  async fetchData(url: URL) {
    const videoInfo = getVideoId(url.href);
    if (!videoInfo.id) {
      throw new Error(`Unable to parse YouTube video ID from URL ${url.href}`);
    }

    const videoId = videoInfo.id;
    // TODO: could allow passing lang so we can pass to getSubtitles
    const captions: WebVTTCaption[] = await getSubtitles({ videoID: videoInfo.id, lang: "en" });
    const text = `[![http://www.youtube.com/watch?v=${videoId}](http://img.youtube.com/vi/${videoId}/0.jpg)](http://www.youtube.com/watch?v=${videoId})

${combineCaptions(captions.map(({ text }) => text?.trim() ?? ""))}`;

    return new Response(text, {
      headers: { "Content-Type": "text/markdown; charset=UTF-8" },
    });
  }
}
