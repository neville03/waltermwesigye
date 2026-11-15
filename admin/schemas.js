// What can be edited in each kind of section.
// Field types: text, textarea, richtext, heading, link, select, toggle, media, image, list

const HEADING_HINT = 'Put *asterisks* around words to make them blue.';
const RICH_HINT = 'Leave a blank line for a new paragraph. **Bold**, and [link text](https://…) for links.';

const buttonsField = {
  key: 'buttons', label: 'Buttons', type: 'list', itemLabel: 'button', titleKey: 'label',
  fields: [
    { key: 'label', label: 'Button text', type: 'text' },
    { key: 'link', label: 'Goes to', type: 'link' },
    { key: 'style', label: 'Style', type: 'select', options: [['primary', 'Blue'], ['secondary', 'Grey']] }
  ],
  newItem: () => ({ label: 'New button', link: '#contact', style: 'primary' })
};

const anchorField = {
  key: 'anchor', label: 'Section link name', type: 'text', advanced: true,
  hint: 'Lets buttons and menu links jump here, e.g. “work” makes the link #work.'
};

export const ICON_OPTIONS = [
  ['screen', 'TV / screen'], ['camera-video', 'Video camera'], ['play', 'Play'], ['camera', 'Camera'],
  ['mic', 'Microphone'], ['pen', 'Pen'], ['globe', 'Globe'], ['heart', 'Health'], ['leaf', 'Environment'],
  ['flask', 'Science'], ['users', 'People'], ['star', 'Star']
];

export const SECTION_TYPES = {
  hero: {
    label: 'Hero', icon: '◆', description: 'Big headline at the top with a photo or video.',
    fields: [
      { key: 'eyebrow', label: 'Small label above the headline', type: 'text' },
      { key: 'heading', label: 'Headline', type: 'heading', hint: HEADING_HINT },
      { key: 'text', label: 'Text under the headline', type: 'textarea' },
      { key: 'media', label: 'Photo or video', type: 'media' },
      { key: 'mediaAlt', label: 'Describe the photo', type: 'text', hint: 'Read aloud to blind visitors and used by Google.' },
      buttonsField,
      anchorField
    ],
    create: () => ({ type: 'hero', eyebrow: '', heading: 'A new *headline*.', text: '', media: '', mediaAlt: '', buttons: [] })
  },
  statement: {
    label: 'Statement', icon: '❝', description: 'One large sentence, like the About line.',
    fields: [
      { key: 'text', label: 'Main sentence (dark)', type: 'textarea' },
      { key: 'muted', label: 'Follow-on text (grey)', type: 'textarea' },
      anchorField
    ],
    create: () => ({ type: 'statement', text: 'Write a bold statement here.', muted: '' })
  },
  stats: {
    label: 'Numbers', icon: '#', description: 'A row of key facts, like “15+ years”.',
    fields: [
      { key: 'items', label: 'Facts', type: 'list', itemLabel: 'fact', titleKey: 'value',
        fields: [{ key: 'value', label: 'Number or short fact', type: 'text' }, { key: 'label', label: 'What it means', type: 'text' }],
        newItem: () => ({ value: '10', label: 'Something worth counting' }) },
      anchorField
    ],
    create: () => ({ type: 'stats', items: [{ value: '10+', label: 'Something worth counting' }] })
  },
  services: {
    label: 'Services', icon: '▦', description: 'Cards describing what Walter offers.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'heading', hint: HEADING_HINT },
      { key: 'intro', label: 'Intro text', type: 'textarea' },
      { key: 'items', label: 'Cards', type: 'list', itemLabel: 'card', titleKey: 'title',
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Description', type: 'textarea' },
          { key: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS },
          { key: 'image', label: 'Photo instead of icon (optional)', type: 'image' },
          { key: 'tags', label: 'Tags', type: 'text', hint: 'Separate with commas, e.g. Science, Health' },
          { key: 'size', label: 'Card width', type: 'select', options: [['narrow', 'Narrow'], ['half', 'Half'], ['wide', 'Wide'], ['full', 'Full width']] },
          { key: 'highlight', label: 'Blue card', type: 'toggle' }
        ],
        newItem: () => ({ icon: 'star', title: 'New service', text: '', tags: '', size: 'half', highlight: false }) },
      anchorField
    ],
    create: () => ({ type: 'services', heading: 'What he does.', intro: '', items: [{ icon: 'star', title: 'New service', text: 'Describe it here.', tags: '', size: 'half', highlight: false }] })
  },
  work: {
    label: 'Work', icon: '▶', description: 'Stories, videos and documentaries as cards.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'heading', hint: HEADING_HINT },
      { key: 'filters', label: 'Show filter buttons (All, Video, Photo…)', type: 'toggle' },
      { key: 'items', label: 'Pieces of work', type: 'list', itemLabel: 'piece', titleKey: 'title', newFirst: true,
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'type', label: 'Kind', type: 'select', options: [['video', 'Video'], ['documentary', 'Documentary'], ['photo', 'Photo'], ['article', 'Article']] },
          { key: 'meta', label: 'Small line above the title', type: 'text', hint: 'e.g. NTV Uganda · Health' },
          { key: 'text', label: 'Summary', type: 'textarea' },
          { key: 'video', label: 'Video', type: 'media', accept: 'video', hint: 'Paste a YouTube link or upload a short video. It plays on the page.' },
          { key: 'image', label: 'Thumbnail photo', type: 'image', hint: 'Optional for YouTube videos, which use their own thumbnail.' },
          { key: 'link', label: 'Link (if there is no video)', type: 'link', hint: 'An article, Instagram post or other page.' }
        ],
        newItem: () => ({ type: 'video', title: 'New story', meta: '', text: '', image: '', video: '', link: '' }) },
      anchorField
    ],
    create: () => ({ type: 'work', heading: 'Selected work.', filters: true, items: [] })
  },
  feature: {
    label: 'Photo + text', icon: '◧', description: 'A photo or video beside a heading and text.',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'heading', hint: HEADING_HINT },
      { key: 'text', label: 'Text', type: 'richtext', hint: RICH_HINT },
      { key: 'media', label: 'Photo or video', type: 'media' },
      { key: 'mediaAlt', label: 'Describe the photo', type: 'text' },
      { key: 'flip', label: 'Photo on the right', type: 'toggle' },
      { key: 'linkLabel', label: 'Link text (optional)', type: 'text' },
      { key: 'link', label: 'Link goes to', type: 'link' },
      anchorField
    ],
    create: () => ({ type: 'feature', eyebrow: '', heading: 'A new heading.', text: 'Write something here.', media: '', mediaAlt: '', flip: false, linkLabel: '', link: '' })
  },
  text: {
    label: 'Text', icon: '¶', description: 'A heading with paragraphs, for stories or a bio.',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'heading', hint: HEADING_HINT },
      { key: 'body', label: 'Text', type: 'richtext', hint: RICH_HINT, rows: 10 },
      { key: 'align', label: 'Alignment', type: 'select', options: [['left', 'Left'], ['center', 'Centre']] },
      buttonsField,
      anchorField
    ],
    create: () => ({ type: 'text', eyebrow: '', heading: 'New section.', body: 'Start writing here.', align: 'left', buttons: [] })
  },
  gallery: {
    label: 'Gallery', icon: '▤', description: 'A grid of photos and videos that open full screen.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'heading', hint: HEADING_HINT },
      { key: 'intro', label: 'Intro text', type: 'textarea' },
      { key: 'columns', label: 'Columns on a computer', type: 'select', options: [['2', '2'], ['3', '3'], ['4', '4']] },
      { key: 'items', label: 'Photos and videos', type: 'list', itemLabel: 'photo or video', titleKey: 'caption', multiUpload: 'media',
        fields: [{ key: 'media', label: 'Photo or video', type: 'media' }, { key: 'caption', label: 'Caption', type: 'text' }],
        newItem: () => ({ media: '', caption: '' }) },
      anchorField
    ],
    create: () => ({ type: 'gallery', heading: 'Gallery.', intro: '', columns: '3', items: [] })
  },
  video: {
    label: 'Video', icon: '▷', description: 'One large video, from YouTube or uploaded.',
    fields: [
      { key: 'heading', label: 'Heading', type: 'heading', hint: HEADING_HINT },
      { key: 'intro', label: 'Text', type: 'textarea' },
      { key: 'url', label: 'Video', type: 'media', accept: 'video' },
      anchorField
    ],
    create: () => ({ type: 'video', heading: 'Watch.', intro: '', url: '' })
  },
  contact: {
    label: 'Contact & booking', icon: '✉', description: 'Contact details and the booking form.',
    fields: [
      { key: 'eyebrow', label: 'Small label', type: 'text' },
      { key: 'heading', label: 'Heading', type: 'heading', hint: HEADING_HINT },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'showForm', label: 'Show booking form', type: 'toggle' },
      { key: 'services', label: 'Options in “What do you need?”', type: 'textarea', hint: 'One per line.' },
      { key: 'email', label: 'Email address', type: 'text', hint: 'Booking requests and the Email button go here.' },
      { key: 'whatsapp', label: 'WhatsApp number', type: 'text', hint: 'With country code, e.g. 256712345678. Leave empty to hide.' },
      { key: 'formEndpoint', label: 'Form service link (optional)', type: 'text', advanced: true, hint: 'A Formspree or similar link, so requests arrive without opening an email app.' },
      { key: 'socials', label: 'Social links', type: 'list', itemLabel: 'link', titleKey: 'label',
        fields: [{ key: 'label', label: 'Name', type: 'text' }, { key: 'link', label: 'Link', type: 'link' }],
        newItem: () => ({ label: 'Instagram', link: '' }) },
      anchorField
    ],
    create: () => ({ type: 'contact', eyebrow: 'Contact', heading: "Let's tell the *story.*", text: '', showForm: true, services: 'Story tip\nDocumentary\nVideography\nPhotography\nOther', email: '', whatsapp: '', formEndpoint: '', socials: [] })
  }
};

export const SITE_FIELDS = [
  { key: 'name', label: 'Name in the top bar', type: 'text' },
  { key: 'title', label: 'Browser tab and Google title', type: 'text' },
  { key: 'description', label: 'Google description', type: 'textarea' },
  { key: 'nav', label: 'Menu links', type: 'list', itemLabel: 'menu link', titleKey: 'label',
    fields: [{ key: 'label', label: 'Text', type: 'text' }, { key: 'link', label: 'Goes to', type: 'link' }],
    newItem: () => ({ label: 'New link', link: '#' }) },
  { key: 'navButton', label: 'Blue menu button', type: 'group',
    fields: [{ key: 'label', label: 'Text (leave empty to hide)', type: 'text' }, { key: 'link', label: 'Goes to', type: 'link' }] },
  { key: 'footerLeft', label: 'Footer, left', type: 'text', hint: '{year} becomes the current year.' },
  { key: 'footerRight', label: 'Footer, right', type: 'text' }
];

export const PAGE_FIELDS = [
  { key: 'title', label: 'Page title', type: 'text' },
  { key: 'description', label: 'Google description', type: 'textarea' }
];

export function sectionTitle(s) {
  const t = SECTION_TYPES[s.type];
  const text = String(s.heading || s.text || s.eyebrow || '').replace(/\*/g, '').trim();
  return text ? text.slice(0, 40) + (text.length > 40 ? '…' : '') : (t ? t.label : s.type);
}
