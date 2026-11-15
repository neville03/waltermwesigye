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

Walter edits everything (text, photos, videos, sections and pages) in the site editor at **/admin**, for example `https://neville03.github.io/waltermwesigye/admin/`.

- **Sign in:** the first time, paste a GitHub access key (instructions are on the sign-in screen). It needs access to this repository only, with **Contents: Read and write**. The key is remembered on that device.
- **Edit:** pick a section on the left, change it in the middle, and see it update in the preview on the right. Click any section in the preview to jump to it. Use the Computer/Phone switch, or **Full preview** to open it in a new tab.
- **Photos and videos:** drag in or choose a file. Large photos are resized automatically. Videos over 25 MB should go on YouTube; paste the YouTube link instead.
- **Sections:** add, reorder (drag or arrows), duplicate, hide or delete. Types: Hero, Statement, Numbers, Services, Work, Photo + text, Text, Gallery, Video, Contact & booking.
- **Pages:** **+ New page** creates a page (for example Documentaries) and can add it to the top menu.
- **Publish:** nothing goes live until you press **Publish**. Unpublished changes are kept on the device, so closing the tab loses nothing. The live site updates about a minute after publishing.
- **Practice mode:** "Look around without signing in" lets anyone try the editor without changing the site.

The editor saves to the branch set in `admin/config.js` (`main` by default), which must be the branch GitHub Pages publishes.

### How it works

All content lives in `content/site.json`. `js/render.js` turns it into the page, both on the live site and in the editor preview. Uploaded files go to `assets/uploads/`. The editor (`admin/`) commits changes straight to GitHub using the access key, so no server or paid service is needed.

### Booking form

Set the email address in the Contact & booking section. By default, submitting opens the visitor's email app with the request filled in. To receive requests without that step, create a free form at a service such as Formspree and paste its link into the section's **More options > Form service link**.

## Deploy

**GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / root.

Vercel and Netlify also work with no configuration.
