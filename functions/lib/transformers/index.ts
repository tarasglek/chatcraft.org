import { GitHubTransformer } from "./github-transformer";
import { YouTubeTransformer } from "./youtube-transformer";

// Add any transformers we should apply by default to the list
export const transformers = [new GitHubTransformer(), new YouTubeTransformer()];
