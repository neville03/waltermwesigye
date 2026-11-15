// Where the editor saves changes.
// `branch` must match GITHUB_BRANCH in Vercel (default main) and Vercel's production branch.
export default {
  branch: 'main',
  contentPath: 'content/site.json',
  uploadDir: 'assets/uploads',
  maxImageSide: 2200,          // larger photos are resized before upload
  maxUploadMB: 3,              // Vercel accepts up to ~4.5 MB per request (files grow a third when sent)
  maxVideoMB: 3                // longer videos should go on YouTube instead
};
