# Walter Mwesigye: Portfolio

Personal portfolio for Walter Mwesigye, a journalist at NTV Uganda covering science, health and the environment, and a documentary producer, videographer and photographer.

A static site with no build step:

```
index.html          page shell
content/site.json   all text, images, sections and pages
js/render.js        builds the page from site.json
js/main.js          loading, menu, filters, lightbox, booking form
css/styles.css      styles
admin/              the site editor (/admin)
api/                sign-in and saving (Vercel server functions)
assets/images/      original photos
assets/uploads/     photos and videos added in the editor
assets/favicon.svg  browser tab icon
```

## Preview locally

Serve the folder (opening `index.html` directly won't load the content):

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Editing the website

Walter edits everything (text, photos, videos, sections and pages) in the site editor at **/admin** on the live site.

- **Sign in** with the editor password. He stays signed in on that device for 30 days.
- **Edit:** pick a section on the left, change it in the middle, and see it update in the preview on the right. Click any section in the preview to jump to it. Use the Computer/Phone switch, or **Full preview** to open it in a new tab.
- **Photos and videos:** drag in or choose a file. Large photos are resized automatically. Uploaded videos can be up to 3 MB; for anything longer, upload to YouTube and paste the link.
- **Sections:** add, reorder (drag or arrows), duplicate, hide or delete. Types: Hero, Statement, Numbers, Services, Work, Photo + text, Text, Gallery, Video, Contact & booking.
- **Pages:** **+ New page** creates a page (for example Documentaries) and can add it to the top menu.
- **Publish:** nothing goes live until he presses **Publish**. Unpublished changes are kept on the device, so closing the tab loses nothing. Vercel redeploys and the site updates in about a minute.
- **Practice mode:** "Look around without signing in" lets anyone try the editor without changing the site.

### One-time setup in Vercel

The editor's sign-in and saving run as small Vercel server functions (`api/`). They need two environment variables, set in **Vercel > Project > Settings > Environment Variables** (Production), followed by a redeploy:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the password Walter types to sign in |
| `GITHUB_TOKEN` | a fine-grained GitHub token for this repository only, with **Contents: Read and write** |

Create the token at https://github.com/settings/personal-access-tokens/new: choose **Only select repositories** and pick this repository, then under **Repository permissions** set **Contents** to **Read and write**. Note its expiry date: when it expires, publishing stops working until a new token is pasted into Vercel.

Optional: `GITHUB_REPO` (default `neville03/waltermwesigye`) and `GITHUB_BRANCH` (default `main`). The branch must be Vercel's production branch.

The password and token are never in the code or sent to the browser. To change the password, edit `ADMIN_PASSWORD` in Vercel and redeploy; that also signs out every device.

### How it works

All content lives in `content/site.json`. `js/render.js` turns it into the page, both on the live site and in the editor preview. Uploaded files go to `assets/uploads/`. The editor (`admin/`) sends changes to the server functions in `api/`, which check the sign-in and commit them to GitHub as one commit, so no database or paid service is needed. The server functions only allow saving `content/site.json` and files in `assets/uploads/`.

### Booking form

Set the email address in the Contact & booking section. By default, submitting opens the visitor's email app with the request filled in. To receive requests without that step, create a free form at a service such as Formspree and paste its link into the section's **More options > Form service link**.

## Deploy

The site is hosted on **Vercel**, which redeploys automatically whenever the repository changes, including every time Walter presses Publish in the editor.

- In Vercel, **Settings > Git > Production Branch** must be `main`, the same branch the editor saves to (`admin/config.js`).
- No build step: Framework Preset **Other**, no build command, output directory = repository root.
- `vercel.json` redirects `/admin` to `/admin/` so the editor loads correctly, and stops the content file being cached.
- Set the environment variables above for the editor to work.

The public site also works on any static host, but the editor's sign-in and saving need Vercel's server functions.
