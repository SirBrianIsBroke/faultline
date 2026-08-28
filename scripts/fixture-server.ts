import http, { type Server } from 'node:http';

type Variant = 'baseline' | 'candidate';

const styles = `
  :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f4f1e8; color: #191b1d; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: linear-gradient(135deg, #f7f4eb 0%, #e7e4db 100%); }
  button, a { font: inherit; }
  .shell { width: min(1180px, calc(100% - 48px)); margin: 0 auto; padding-bottom: 72px; }
  header { height: 78px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #c8c4b9; }
  .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; letter-spacing: -.03em; }
  .brand-mark { width: 30px; height: 30px; display: grid; place-items: center; color: #f8f6ed; background: #1f2628; border-radius: 9px; }
  nav { display: flex; gap: 24px; }
  nav a { color: #5c605f; text-decoration: none; font-size: 14px; font-weight: 650; }
  .environment { padding: 7px 11px; border: 1px solid #bbb8ad; border-radius: 100px; color: #656965; font: 700 11px ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
  main { padding-top: 64px; }
  .eyebrow { margin: 0 0 16px; color: #ad3d22; font: 800 12px ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
  h1 { max-width: 760px; margin: 0; font-size: clamp(52px, 7vw, 88px); line-height: .96; letter-spacing: -.065em; }
  .lead { max-width: 620px; margin: 26px 0 0; color: #5b5f5d; font-size: 18px; line-height: 1.65; }
  .release-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 18px; margin-top: 48px; }
  .panel { padding: 26px; background: rgba(255,255,255,.7); border: 1px solid #cbc7bc; border-radius: 18px; box-shadow: 0 14px 40px rgba(43,41,34,.06); }
  .panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
  .panel-label { margin: 0 0 12px; color: #777b77; font: 700 11px ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; }
  h2 { margin: 0; font-size: 28px; letter-spacing: -.035em; }
  .status { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 100px; color: #176b4b; background: #d8ede1; font: 750 12px ui-monospace, monospace; white-space: nowrap; }
  .status::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .status.warning { color: #914329; background: #f2dacf; }
  .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 30px 0; }
  .fact { padding: 15px; border: 1px solid #d5d1c7; border-radius: 12px; }
  .fact span { display: block; color: #7b7f7b; font: 650 10px ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
  .fact strong { display: block; margin-top: 9px; font-size: 15px; }
  .actions { display: flex; gap: 10px; }
  .button { min-height: 44px; padding: 0 18px; border: 1px solid #252a2b; border-radius: 11px; background: transparent; color: #252a2b; cursor: pointer; font-weight: 750; }
  .button.primary { background: #252a2b; color: #fff; }
  .button:hover { transform: translateY(-1px); box-shadow: 0 5px 0 #c8c4b9; }
  .signal-list { display: grid; gap: 22px; margin-top: 26px; }
  .signal { display: grid; grid-template-columns: 1fr auto; gap: 7px; }
  .signal span { color: #6c706d; font-size: 13px; }
  .signal strong { font: 750 13px ui-monospace, monospace; }
  .track { grid-column: 1 / -1; height: 5px; overflow: hidden; background: #dedbd2; border-radius: 10px; }
  .track i { display: block; height: 100%; background: #31705b; border-radius: inherit; }
  .drawer { margin-top: 18px; padding: 20px; border-left: 3px solid #d75332; background: #f8e8de; border-radius: 0 12px 12px 0; }
  .drawer p { margin: 7px 0 0; color: #6a534b; font-size: 14px; line-height: 1.5; }
  .page-card { max-width: 820px; }
  .page-card h1 { font-size: clamp(48px, 6vw, 76px); }
  .rollback-box { display: flex; align-items: center; justify-content: space-between; margin-top: 42px; padding: 28px; border: 1px solid #c9c5bb; background: rgba(255,255,255,.67); border-radius: 17px; }
  .rollback-box strong { font-size: 22px; }
  .rollback-box p { margin: 8px 0 0; color: #6b6f6c; }
  table { width: 100%; margin-top: 40px; border-collapse: collapse; background: rgba(255,255,255,.65); border: 1px solid #cac6bb; }
  th, td { padding: 17px; border-bottom: 1px solid #d6d2c8; text-align: left; }
  th { color: #6f736f; font: 700 11px ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
  td { font-size: 14px; }
  @media (max-width: 720px) {
    .shell { width: min(100% - 28px, 1180px); }
    nav { display: none; }
    main { padding-top: 44px; }
    .release-grid { grid-template-columns: 1fr; }
    .facts { grid-template-columns: 1fr; }
    .rollback-box { align-items: flex-start; flex-direction: column; gap: 20px; }
  }
`;

function layout(content: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Northstar Release Console</title><style>${styles}</style></head><body><div class="shell"><header><div class="brand"><span class="brand-mark">N</span>Northstar</div><nav><a href="/">Release</a><a href="/rollback">Rollback</a><a href="/audit">Audit log</a></nav><span class="environment">production</span></header>${content}</div></body></html>`;
}

function releasePage(variant: Variant): string {
  const candidate = variant === 'candidate';
  return layout(`<main><p class="eyebrow">Release operations · rc-1047</p><h1>Ship with context, not crossed fingers.</h1><p class="lead">One operational view for approvals, change risk, system health, and the rollback plan behind every production release.</p><section class="release-grid"><article class="panel"><div class="panel-head"><div><p class="panel-label">Candidate</p><h2>Console v2.8.0</h2></div><span class="status ${candidate ? 'warning' : ''}">${candidate ? 'Approval pending' : 'Ready to ship'}</span></div><div class="facts"><div class="fact"><span>Commit</span><strong>a9c2e71</strong></div><div class="fact"><span>Owner</span><strong>${candidate ? 'Unassigned' : 'Maya Chen'}</strong></div><div class="fact"><span>Risk</span><strong>${candidate ? 'Elevated' : 'Low'}</strong></div></div><div class="actions"><button class="button primary" data-testid="approval-action">${candidate ? 'Request approval' : 'Approve release'}</button><button class="button" data-testid="inspect-release" aria-expanded="false">Inspect changes</button></div><div class="drawer" data-testid="release-drawer" hidden><strong>${candidate ? '3 unresolved signals' : 'Change set verified'}</strong><p>${candidate ? 'Ownership, rollback coverage, and response validation need attention.' : 'All required checks completed with a documented rollback path.'}</p></div></article><aside class="panel"><p class="panel-label">Live signals</p><h2>System posture</h2><div class="signal-list"><div class="signal"><span>API health</span><strong>99.99%</strong><div class="track"><i style="width:99%"></i></div></div><div class="signal"><span>Test coverage</span><strong>${candidate ? '71%' : '92%'}</strong><div class="track"><i style="width:${candidate ? '71%' : '92%'}"></i></div></div><div class="signal"><span>Rollback coverage</span><strong>${candidate ? '0%' : '100%'}</strong><div class="track"><i style="width:${candidate ? '0%' : '100%'}"></i></div></div></div></aside></section></main><script>document.querySelector('[data-testid="inspect-release"]').addEventListener('click', event => { const drawer = document.querySelector('[data-testid="release-drawer"]'); drawer.hidden = false; event.currentTarget.setAttribute('aria-expanded', 'true'); });</script>`);
}

function rollbackPage(variant: Variant): string {
  const candidate = variant === 'candidate';
  return layout(`<main class="page-card"><p class="eyebrow">Recovery control</p><h1>Know the way back before moving forward.</h1><p class="lead">Faultline verifies that release teams can restore service quickly when a candidate behaves differently in production.</p><div class="rollback-box"><div><strong data-testid="rollback-status">${candidate ? 'Rollback unavailable' : 'Rollback ready'}</strong><p>${candidate ? 'No verified restore point is attached to rc-1047.' : 'Restore point prod-2026-08-27.3 verified 4 minutes ago.'}</p></div><button class="button primary">${candidate ? 'Create plan' : 'Review plan'}</button></div></main>`);
}

function auditPage(): string {
  return layout(`<main class="page-card"><p class="eyebrow">Immutable history</p><h1>Every release leaves a trail.</h1><p class="lead">A compact audit record answers who changed what, what evidence they reviewed, and how the release concluded.</p><table data-testid="audit-table"><thead><tr><th>Release</th><th>Operator</th><th>Decision</th><th>Timestamp</th></tr></thead><tbody><tr><td>v2.7.4</td><td>Maya Chen</td><td>Shipped</td><td>Aug 27 · 09:42</td></tr><tr><td>v2.7.3</td><td>Andre Silva</td><td>Held</td><td>Aug 26 · 16:18</td></tr><tr><td>v2.7.2</td><td>Priya Raman</td><td>Shipped</td><td>Aug 25 · 11:03</td></tr></tbody></table></main>`);
}

function sendJson(response: http.ServerResponse, payload: unknown): void {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(payload));
}

export async function startFixtureServer(port: number, variant: Variant): Promise<Server> {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    if (url.pathname === '/api/releases/latest') {
      await new Promise((resolve) => setTimeout(resolve, variant === 'candidate' ? 64 : 8));
      sendJson(response, variant === 'baseline'
        ? { id: 'rel_1047', version: '2.8.0', approvalStatus: 'approved', rollbackReady: true, owner: { id: 'usr_31', name: 'Maya Chen' } }
        : { id: 'rel_1047', version: '2.8.0', approvalStatus: 'pending', rollbackReady: false, owner: { name: 'Maya Chen' } });
      return;
    }

    if (url.pathname === '/api/health') {
      await new Promise((resolve) => setTimeout(resolve, 10));
      sendJson(response, { status: 'healthy', region: 'us-east-1', checkedAt: new Date().toISOString() });
      return;
    }

    const html = url.pathname === '/rollback'
      ? rollbackPage(variant)
      : url.pathname === '/audit'
        ? auditPage()
        : releasePage(variant);
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(html);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

export async function stopFixtureServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
