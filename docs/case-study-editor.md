# Case-study editor

The editor lives at `/admin`. It uses GitHub login, reads the latest case-study JSON from `jruttan1/portfolio-site`, and publishes a commit to `main`. Vercel's existing Git integration then rebuilds the site. Public pages remain static; the editor and API routes run as Vercel functions. There is no database or separate CMS subscription.

## One-time production setup

1. Create a [GitHub OAuth app](https://github.com/settings/applications/new) under Jack's account:
   - Application name: `Jack's portfolio editor`
   - Homepage URL: `https://jackruttan.com`
   - Authorization callback URL: `https://jackruttan.com/api/admin/auth/callback`
2. Generate a client secret in that app. In the existing Vercel project's **Settings → Environment Variables**, add these to **Production**:
   - `GITHUB_CLIENT_ID`: the OAuth app's client ID
   - `GITHUB_CLIENT_SECRET`: its client secret
   - `ADMIN_SESSION_SECRET`: a random secret, generated locally with `openssl rand -base64 48`
   - `ADMIN_SITE_URL`: `https://jackruttan.com`
3. Deploy these code changes to the existing Vercel project. Confirm its production branch is `main` and Git deployments are enabled. Redeploy after adding or changing environment variables. Keep Vercel's Node version set to a version supported by Astro 5 (Node 22 is supported).
4. Open `https://jackruttan.com/admin` and sign in as `jruttan1`. Publish one small edit, check the commit and Vercel deployment, then confirm it on the public case study.

Do not paste secrets into chat or put them in source code. The editor only accepts GitHub account ID `187563495`, even if another account authorizes the OAuth app. The OAuth scope is `public_repo` because this repository is public. GitHub OAuth apps grant this scope across an account's public repositories, but these endpoints are fixed to this portfolio repository and four case-study paths. Branch protection that blocks direct commits will also block editor publishing.

Use the canonical domain above for the editor. Preview domains do not share the production login callback or session. Production credentials should not be exposed to preview deployments.

## Editing

- Select Primate, Whim, Optimate, or Doppels.
- Click a section to edit it, drag sections to reorder them, or add a text section, screenshot, video group, contribution list, or bullet list.
- Select the page/root to edit the introduction, demo, project details, or external link.
- Drafts stay in the current browser. **Publish** saves to GitHub, and the public site changes when Vercel finishes deploying. Publishing can take longer than saving a local draft.
- **Download draft** saves a recovery copy. **Load latest** asks before discarding the local draft. If the GitHub file changed since a draft was created, download your draft and load the current file before reapplying your edits. The API checks the GitHub file SHA to prevent overwriting another edit.
- Draft downloads are a backup JSON format. The editor does not currently offer a JSON import button.
- This editor changes case-study content. Homepage card copy and site-wide layouts remain in code.

## Media

Choose an existing image/video, paste an HTTPS URL, or upload a PNG, JPEG, WebP, GIF, or MP4 up to 25 MB. Larger videos should be compressed first or hosted elsewhere with a direct HTTPS media URL. MOV files need to be converted to MP4 first; the uploader does not transcode video.

Uploads go into `public/uploads/` with content-based filenames. They are committed immediately, before the case study is published, and become public. Their previews become available after the upload's Vercel deployment. Deleting a block or discarding a draft does not delete its uploaded media.

Uploads are split into 2 MB chunks to stay under Vercel's function request limit. The server stores temporary Git blobs, verifies signed chunk receipts, checks the complete file's size and type, and commits the resulting asset. There is no separate object-storage service.

## Local development

Create a separate GitHub OAuth app with homepage `http://localhost:4321` and callback `http://localhost:4321/api/admin/auth/callback`. Copy `.env.example` to `.env`, set that app's credentials, a separate session secret, and `ADMIN_SITE_URL=http://localhost:4321`. Run `npm run dev` and open `/admin`.

Local publishing still commits to the real repository's `main` branch. There is no fake-auth mode. Use the mocked API tests when checking publish behavior without modifying GitHub.

## Validation and maintenance

- `npm run build`
- `npm run test:admin`
- `node --test scripts/test-music-player.mjs scripts/test-dj-motion.mjs`

Content schema: `src/lib/admin/content.ts`. Documents: `src/content/case-studies/*.json`. Editor configuration: `src/components/admin/config.tsx`. Server credentials are only accessed by server routes. Sessions use encrypted, HTTP-only cookies with an eight-hour limit, OAuth state and PKCE, owner checks, and origin/CSRF checks on writes. Admin responses are not cached or indexed.

To revoke access, revoke the OAuth app in GitHub and rotate `ADMIN_SESSION_SECRET` in Vercel, then redeploy. A failed deployment does not undo the GitHub commit; fix or revert the commit in GitHub and redeploy.
