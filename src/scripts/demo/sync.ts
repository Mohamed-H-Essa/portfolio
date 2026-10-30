// The German Sync demo (components/demo/SyncDemo.astro). Each device keeps its own
// state and a queue of writes made offline. Online, a write goes to the server at
// once: it gets the next sequence number and is merged per key by kind (lessons:
// done stays done; cards: the higher level wins). Devices that are online pull the
// merged state after every change, so they always agree with the server.
type T = Record<string, string>;
type State = { l5: boolean; l6: boolean; hund: number };
type Write = { key: 'l6' | 'hund'; value: boolean | number };

export function initSync(root: HTMLElement) {
  const t = JSON.parse(root.dataset.sync!) as T;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  root.querySelectorAll<HTMLElement>('[data-js]').forEach((e) => (e.hidden = false));
  const log = root.querySelector<HTMLElement>('[data-log]')!;
  const seqEl = root.querySelector<HTMLElement>('[data-seq]')!;
  const play = root.querySelector<HTMLButtonElement>('[data-play]')!;

  let seq = 41;
  let server: State = { l5: true, l6: false, hund: 2 };
  const devs = ['phone', 'laptop'].map((id) => ({
    id,
    el: root.querySelector<HTMLElement>(`[data-dev="${id}"]`)!,
    online: true,
    state: { ...server } as State,
    queue: [] as Write[],
  }));
  type Dev = (typeof devs)[number];

  const pill = (cls: string, text: string) => `<span class="demo-pill ${cls}">${text}</span>`;
  const paint = (d: Dev, changed: (keyof State)[] = []) => {
    const s = d.state;
    const rows: [keyof State, string][] = [
      ['l5', `${t.lesson} 5 ${s.l5 ? pill('demo-pill--ok', t.done) : pill('', t.open)}`],
      ['l6', `${t.lesson} 6 ${s.l6 ? pill('demo-pill--ok', t.done) : pill('', t.open)}`],
      ['hund', `${t.card} der Hund ${pill('', `${t.level} ${s.hund}`)}`],
    ];
    const ul = d.el.querySelector<HTMLElement>('[data-state]')!;
    ul.innerHTML = rows.map(([k, h]) => `<li class="${changed.includes(k) ? 'is-changed' : ''}">${h}</li>`).join('');
    const net = d.el.querySelector<HTMLButtonElement>('[data-net]')!;
    net.setAttribute('aria-pressed', String(d.online));
    net.textContent = d.online ? t.online : t.offline;
    d.el.classList.toggle('is-offline', !d.online);
    d.el.querySelector<HTMLElement>('[data-wait]')!.textContent = d.queue.length ? `${d.queue.length} × ${t.pending}` : d.online ? `✓ ${t.insync}` : '';
  };
  const say = (html: string) => {
    const li = document.createElement('li');
    li.innerHTML = html;
    log.prepend(li);
    while (log.children.length > 7) log.lastElementChild!.remove();
  };

  // the server's merge: per key, by kind
  const push = (d: Dev, w: Write) => {
    seq++;
    seqEl.textContent = `${t.seq} ${seq}`;
    if (w.key === 'l6') {
      const before = server.l6;
      server.l6 = server.l6 || (w.value as boolean);
      say(`<b>${t.seq} ${seq}</b> ${t[d.id]} · ${t.lesson} 6 = ${t.done}${before ? ` · ${t.monotonic}` : ''}`);
    } else {
      const v = w.value as number;
      const kept = v < server.hund;
      server.hund = Math.max(server.hund, v);
      say(`<b>${t.seq} ${seq}</b> ${t[d.id]} · der Hund ${v}${kept ? ` → ${t.kept} ${server.hund} · ${t.max}` : ''}`);
    }
  };
  const pullAll = () => devs.filter((d) => d.online && !d.queue.length).forEach((d) => {
    const changed = (Object.keys(server) as (keyof State)[]).filter((k) => d.state[k] !== server[k]);
    d.state = { ...server };
    paint(d, changed);
  });
  const flush = async (d: Dev) => {
    while (d.online && d.queue.length) {
      await wait(500);
      push(d, d.queue.shift()!);
      paint(d);
    }
    pullAll();
  };

  const act = async (d: Dev, kind: string) => {
    const w: Write = kind === 'finish' ? { key: 'l6', value: true } : { key: 'hund', value: d.state.hund + 1 };
    if (w.key === 'l6') d.state.l6 = true; else d.state.hund = w.value as number;
    d.queue.push(w);
    paint(d, [w.key]);
    if (d.online) await flush(d);
  };
  const setOnline = async (d: Dev, on: boolean) => {
    d.online = on;
    paint(d);
    if (on) await flush(d);
  };

  let busy = false;
  for (const d of devs) {
    d.el.querySelector('[data-net]')!.addEventListener('click', () => { if (!busy) setOnline(d, !d.online); });
    d.el.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => b.addEventListener('click', () => { if (!busy) act(d, b.dataset.act!); }));
  }

  const reset = () => {
    seq = 41;
    seqEl.textContent = `${t.seq} ${seq}`;
    server = { l5: true, l6: false, hund: 2 };
    log.replaceChildren();
    for (const d of devs) { d.online = true; d.queue = []; d.state = { ...server }; paint(d); }
  };
  const [phone, laptop] = devs;
  play.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    play.disabled = true;
    reset();
    await wait(500);
    await setOnline(phone, false); await setOnline(laptop, false);
    await wait(600); await act(phone, 'finish');
    await wait(600); await act(phone, 'review');           // phone: der Hund 3
    await wait(600); await act(laptop, 'review');          // laptop: 3
    await wait(600); await act(laptop, 'review');          // laptop: 4
    await wait(900); await setOnline(laptop, true);        // laptop first: 3, 4
    await wait(700); await setOnline(phone, true);         // phone: lesson 6 done, 3 → kept 4
    busy = false;
    play.disabled = false;
  });

  reset();
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); play.click(); }
  }, { threshold: 0.4 });
  io.observe(root);
}
