import { GitHubRewriter } from "./github-rewriter";
import { YouTubeRewriter } from "./youtube-rewriter";

// Add any rewriters we should apply by default to the list
export const rewriters = [new GitHubRewriter(), new YouTubeRewriter()];
