# Walter Mwesigye: Portfolio

Personal portfolio for Walter Mwesigye, a journalist at NTV Uganda covering science, health and the environment, and a documentary producer, videographer and photographer.

A static site with no build step:

```
index.html          page content
css/styles.css      styles
js/main.js          mobile menu, work filters, scroll animations
assets/images/      photos
assets/favicon.svg  browser tab icon
```

## Preview locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Updating content

- **Work:** in `index.html`, find `ADD WORK HERE` and copy one `<a class="item">` block per piece. Set `data-type` to `video`, `documentary` or `photo` so the filters work, set `href` to the YouTube, article or Instagram link, and add a thumbnail with `style="background-image:url(assets/images/your-file.jpg)"` on the `.thumb` div.
- **Contact:** replace the placeholder email, WhatsApp number and social links (marked `TODO`).
- **Booking form:** set `data-email` on the `<form id="booking">` to Walter's address. By default, submitting opens the visitor's email app with the request filled in. To receive requests without that step, create a free form at a service such as Formspree and put its URL in `data-endpoint`.
- **Award:** confirm the award name and year in the Recognition section.
- **Photos:** replace the files in `assets/images/` with higher-resolution versions, keeping the same names.

## Deploy

**GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / root.

Vercel and Netlify also work with no configuration.
