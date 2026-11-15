// Builds the "Ask your question" and "Leave a response" forms and shows approved responses.
// Pages hold only <div data-bq="question"> or <div data-bq="response">. Everything is added as plain text.
(() => {
  const SITE_KEY = '0x4AAAAAAGBsma_qnymVFnVW';
  const CATEGORIES = ['Salvation', 'Marriage and Family', 'Creation and Origins', 'Hard Texts', 'Kingdom of Heaven', 'Other'];
  const hosts = document.querySelectorAll('[data-bq]');
  if (!hosts.length) return;

  const slug = location.pathname.replace(/\/+$/, '').split('/').pop().replace(/\.html$/, '');

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    n.append(...kids);
    return n;
  };
  const field = (id, label, control, hint) =>
    el('div', { class: 'bq-field' }, el('label', { for: id }, label), control, ...(hint ? [el('small', {}, hint)] : []));

  let tsReady;
  const loadTurnstile = () =>
    (tsReady ||= new Promise((resolve, reject) => {
      window.bqTsLoaded = () => resolve(window.turnstile);
      const s = el('script', { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=bqTsLoaded', async: '', defer: '' });
      s.onerror = reject;
      document.head.append(s);
    }));

  const niceDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  function buildForm(host, kind) {
    const isQ = kind === 'question';
    const p = 'bq-' + kind + '-';
    const category = el('select', { id: p + 'cat', name: 'category', required: '' }, ...CATEGORIES.map((c) => el('option', { value: c }, c)));
    const text = el('textarea', { id: p + 'text', name: 'content', rows: '6', maxlength: isQ ? '2000' : '1500', required: '' });
    const name = el('input', { id: p + 'name', name: 'name', type: 'text', maxlength: '80', autocomplete: 'name' });
    const email = el('input', { id: p + 'email', name: 'email', type: 'email', maxlength: '254', autocomplete: 'email' });
    const consent = el('input', { id: p + 'consent', type: 'checkbox' });
    const status = el('p', { class: 'bq-status', role: 'status' });
    const widget = el('div', { class: 'bq-turnstile' });
    const btn = el('button', { type: 'submit', class: 'bq-btn' }, isQ ? 'Send question' : 'Send response');
    const say = (m) => (status.textContent = m);

    const form = el(
      'form',
      { class: 'bq-form' },
      ...(isQ ? [field(p + 'cat', 'Topic', category)] : []),
      field(p + 'text', isQ ? 'Your question' : 'Your response', text),
      field(p + 'name', 'Your name (optional)', name),
      field(p + 'email', 'Your email (optional)', email, 'Only used to reply to you. Never shown.'),
      ...(isQ ? [] : [el('label', { class: 'bq-check', for: p + 'consent' }, consent, ' Show the name I entered next to my response.')]),
      el('p', { class: 'bq-note' }, 'Please do not include personal details such as your address or phone number. Everything is read before anything appears on this site. ', el('a', { href: '/privacy.html' }, 'How we handle your information')),
      widget,
      btn,
      status
    );
    host.replaceChildren(form);

    let widgetId;
    loadTurnstile()
      .then((t) => (widgetId = t.render(widget, { sitekey: SITE_KEY, theme: 'light' })))
      .catch(() => say('The spam check could not load. Please try again later.'));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = widgetId !== undefined && window.turnstile.getResponse(widgetId);
      if (!token) return say('Please complete the check above the button, then send again.');
      btn.disabled = true;
      say('Sending…');
      const data = { name: name.value, email: email.value, content: text.value, turnstileToken: token };
      if (isQ) data.category = category.value;
      else Object.assign(data, { articleSlug: slug, showName: consent.checked });
      try {
        const r = await fetch('/api/' + kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
        if (r.ok) {
          host.replaceChildren(el('p', { class: 'bq-done', role: 'status' }, isQ ? 'Thank you. Your question has been received and will be read before anything is published.' : 'Thank you. Your response has been received and will be read before it appears.'));
          return;
        }
        say(r.status === 400 ? 'Please check the form. A message is needed and your email must look right.' : r.status === 403 ? 'The check did not pass. Please try again.' : 'Something went wrong. Please try again later.');
      } catch {
        say('Could not send. Check your connection and try again.');
      }
      window.turnstile.reset(widgetId);
      btn.disabled = false;
    });
  }

  async function showResponses(host) {
    try {
      const r = await fetch('/api/responses?slug=' + encodeURIComponent(slug));
      const { responses } = await r.json();
      if (!r.ok || !responses || !responses.length) return;
      host.prepend(
        el(
          'div',
          { class: 'bq-list' },
          el('h3', {}, 'Responses'),
          ...responses.map((x) => el('div', { class: 'bq-item' }, el('p', {}, x.content), el('small', {}, (x.name || 'A reader') + ' · ' + niceDate(x.date))))
        )
      );
    } catch {
      // The form still works without the list
    }
  }

  hosts.forEach((host) => {
    const kind = host.dataset.bq === 'response' ? 'response' : 'question';
    buildForm(host, kind);
    if (kind === 'response') showResponses(host);
  });
})();
