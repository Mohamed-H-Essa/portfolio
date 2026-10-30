// The Misr El Kheir demo (components/demo/OfflineQueue.astro): a family-member
// request made offline waits in the phone's queue; when the connection returns the
// sync service sends the queue in order and the phone marks each entry synced.
type S = Record<string, string> & { people: string[] };

export function initOfflineQueue(root: HTMLElement) {
  const T = JSON.parse(root.dataset.oq!) as S;
  const $ = <E extends HTMLElement>(sel: string) => root.querySelector<E>(sel)!;
  const net = $<HTMLButtonElement>('[data-net]');
  const add = $<HTMLButtonElement>('[data-add]');
  const play = $<HTMLButtonElement>('[data-play]');
  const phone = $('[data-phone]'), queue = $('[data-queue]'), server = $('[data-server]');
  const empty = $('[data-empty]'), count = $('[data-count]'), toast = $('[data-toast]');
  const wire = $('[data-wire]'), wire2 = $('[data-wire2]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  $('[data-js]').hidden = false;

  let online = true, next = 0, received = 0, sending = false, playing = false;
  const items: { name: string; pill: HTMLElement; li: HTMLElement }[] = [];
  const pending: { i: number; card: HTMLElement }[] = [];

  const pill = (ok: boolean) => {
    const p = document.createElement('span');
    p.className = `demo-pill ${ok ? 'demo-pill--ok' : 'demo-pill--warn'}`;
    p.textContent = ok ? T.synced : T.queued;
    return p;
  };
  const row = (name: string, p: HTMLElement) => {
    const li = document.createElement('li');
    const s = document.createElement('span');
    s.textContent = name;
    li.append(s, p);
    return li;
  };
  const arrive = (name: string) => {
    const ok = document.createElement('span');
    ok.className = 'demo-pill demo-pill--ok';
    ok.textContent = '201';
    server.append(row(name, ok));
    count.textContent = String(++received);
  };
  const paint = () => {
    net.setAttribute('aria-pressed', String(online));
    net.textContent = online ? T.online : T.offline;
    wire.classList.toggle('is-cut', !online);
    wire2.classList.toggle('is-cut', !online);
    empty.hidden = pending.length > 0;
  };

  const drain = async () => {
    if (sending) return;
    sending = true;
    wire.classList.add('is-flow');
    wire2.classList.add('is-flow');
    while (online && pending.length) {
      const job = pending[0];
      await wait(650);
      if (!online) break;
      pending.shift();
      job.card.classList.add('is-out');
      await wait(380);
      job.card.remove();
      const it = items[job.i];
      it.pill.replaceWith((it.pill = pill(true)));
      arrive(it.name);
      paint();
    }
    wire.classList.remove('is-flow');
    wire2.classList.remove('is-flow');
    sending = false;
  };

  const addOne = async () => {
    const name = T.people[next++ % T.people.length];
    const p = pill(false);
    const li = row(name, p);
    phone.append(li);
    items.push({ name, pill: p, li });
    const card = document.createElement('li');
    card.textContent = `POST /family-members · ${name}`;
    queue.append(card);
    pending.push({ i: items.length - 1, card });
    paint();
    if (online) await drain();
  };

  const setOnline = async (on: boolean) => {
    online = on;
    toast.textContent = on ? (pending.length ? T.back : '') : T.lost;
    paint();
    if (on) await drain();
  };

  const reset = () => {
    phone.replaceChildren(); queue.replaceChildren(); server.replaceChildren();
    items.length = 0; pending.length = 0; next = 0; received = 0;
    count.textContent = '0';
    online = true; toast.textContent = '';
    paint();
  };

  net.addEventListener('click', () => { if (!playing) setOnline(!online); });
  add.addEventListener('click', () => { if (!playing) addOne(); });
  play.addEventListener('click', async () => {
    if (playing) return;
    playing = true;
    play.disabled = add.disabled = net.disabled = true;
    reset();
    await wait(400);
    await setOnline(false);
    for (let k = 0; k < 3; k++) { await wait(700); await addOne(); }
    await wait(1100);
    await setOnline(true);
    playing = false;
    play.disabled = add.disabled = net.disabled = false;
  });

  reset();
  // start the show the first time the demo comes into view
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); play.click(); }
  }, { threshold: 0.4 });
  io.observe(root);
}
