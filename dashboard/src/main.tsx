import { StrictMode, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import type { CheckResult, CheckStatus, FaultlineReport } from '../../src/types';
import './styles.css';

type Filter = 'all' | CheckStatus;
type ArtifactView = 'baseline' | 'candidate' | 'diff';

function formatDuration(durationMs: number): string {
  return durationMs >= 1_000 ? `${(durationMs / 1_000).toFixed(1)}s` : `${durationMs}ms`;
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'passed') {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10.4 3.4 3.4L16 5.7" /></svg>;
  }
  if (status === 'flaky') {
    return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v8m0 4.5v.1" /></svg>;
  }
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" /></svg>;
}

function CheckCard({ check, selected, onSelect }: { check: CheckResult; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`check-card ${selected ? 'selected' : ''}`} onClick={onSelect} aria-pressed={selected}>
      <span className={`status-icon ${check.status}`}><StatusIcon status={check.status} /></span>
      <span className="check-copy">
        <span className="check-kicker">{check.kind} · {check.severity}</span>
        <strong>{check.title}</strong>
        <span>{check.summary}</span>
      </span>
      <span className="check-duration">{formatDuration(check.durationMs)}</span>
      <span className="card-arrow"><ArrowIcon /></span>
    </button>
  );
}

function DetailPanel({ check }: { check: CheckResult }) {
  const [artifactView, setArtifactView] = useState<ArtifactView>('diff');
  const availableArtifacts = (['baseline', 'candidate', 'diff'] as const).filter((key) => check.artifacts?.[key]);
  const selectedView = availableArtifacts.includes(artifactView) ? artifactView : availableArtifacts[0];
  const failures = [...new Set(check.attempts.flatMap((attempt) => attempt.failures))];

  return (
    <section className="detail-panel" aria-label={`${check.title} details`}>
      <div className="detail-head">
        <div>
          <div className="detail-meta">
            <span className={`status-pill ${check.status}`}>{check.status}</span>
            <span>{check.kind} check</span>
            <span>{check.severity} severity</span>
          </div>
          <h2>{check.title}</h2>
          <p>{check.description}</p>
        </div>
        <div className="attempt-score" aria-label={`${check.attempts.filter((attempt) => attempt.status === 'passed').length} of ${check.attempts.length} attempts passed`}>
          <strong>{check.attempts.filter((attempt) => attempt.status === 'passed').length}/{check.attempts.length}</strong>
          <span>stable runs</span>
        </div>
      </div>

      <div className="evidence-grid">
        {check.evidence.map((item) => (
          <div className={`evidence ${item.tone ?? 'neutral'}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {availableArtifacts.length > 0 && selectedView && (
        <div className="artifact-block">
          <div className="artifact-toolbar">
            <div>
              <span className="section-label">Visual evidence</span>
              <strong>Baseline against candidate</strong>
            </div>
            <div className="segmented" aria-label="Artifact view">
              {availableArtifacts.map((view) => (
                <button key={view} className={selectedView === view ? 'active' : ''} onClick={() => setArtifactView(view)}>{view}</button>
              ))}
            </div>
          </div>
          <div className={`artifact-frame ${selectedView === 'diff' ? 'diff' : ''}`}>
            <img src={`/${check.artifacts?.[selectedView]}`} alt={`${check.title} ${selectedView} capture`} />
            <span>{selectedView}</span>
          </div>
        </div>
      )}

      <div className="findings">
        <span className="section-label">What Faultline found</span>
        {failures.length ? (
          <ul>{failures.map((failure) => <li key={failure}>{failure}</li>)}</ul>
        ) : (
          <div className="clear-finding"><StatusIcon status="passed" /> No contract, behavior, or visual regression was detected.</div>
        )}
      </div>
    </section>
  );
}

function App() {
  const [report, setReport] = useState<FaultlineReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    fetch('/sample-report.json')
      .then((response) => {
        if (!response.ok) throw new Error('Run npm run demo before opening the report.');
        return response.json() as Promise<FaultlineReport>;
      })
      .then((data) => {
        setReport(data);
        setSelectedId(data.checks.find((check) => check.status === 'failed')?.id ?? data.checks[0]?.id ?? '');
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load the report.'));
  }, []);

  const filteredChecks = useMemo(() => report?.checks.filter((check) => filter === 'all' || check.status === filter) ?? [], [report, filter]);
  const selectedCheck = report?.checks.find((check) => check.id === selectedId) ?? filteredChecks[0];

  if (error) return <main className="state-message"><strong>Report unavailable.</strong><span>{error}</span></main>;
  if (!report) return <main className="state-message"><span className="loader" /><strong>Reading the fault line…</strong></main>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="logo" href="#top" aria-label="Faultline home">
          <span className="logo-mark"><i /><i /><i /></span>
          <span>FAULTLINE</span>
        </a>
        <div className="run-context">
          <span>{report.branch}</span>
          <strong>{report.commit}</strong>
          <span className="live-dot">run complete</span>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Release confidence report · {new Date(report.createdAt).toLocaleString()}</p>
            <h1>{report.project}</h1>
            <p>Browser journeys, visual state, and API contracts measured against the version already trusted in production.</p>
          </div>
          <div className={`verdict ${report.verdict}`}>
            <span>Release verdict</span>
            <strong>{report.verdict}</strong>
            <p>{report.verdict === 'ship' ? 'The candidate is inside every defined safety budget.' : 'Regressions need an owner before this candidate moves forward.'}</p>
          </div>
        </section>

        <section className="summary-grid" aria-label="Run summary">
          <div className="risk-card">
            <div className="risk-ring" style={{ '--risk': `${report.summary.riskScore * 3.6}deg` } as CSSProperties}>
              <span><strong>{report.summary.riskScore}</strong><small>/ 100</small></span>
            </div>
            <div><span className="section-label">Composite risk</span><strong>{report.summary.riskScore >= 60 ? 'Release exposed' : report.summary.riskScore >= 30 ? 'Review required' : 'Inside budget'}</strong></div>
          </div>
          {([
            ['Passed', report.summary.passed, 'passed'],
            ['Failed', report.summary.failed, 'failed'],
            ['Flaky', report.summary.flaky, 'flaky'],
            ['Runtime', formatDuration(report.summary.durationMs), 'runtime'],
          ] as const).map(([label, value, tone]) => (
            <div className={`metric-card ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>
          ))}
        </section>

        <section className="workspace">
          <aside className="checks-panel">
            <div className="section-heading">
              <div><span className="section-label">Checks</span><strong>{report.summary.total} release signals</strong></div>
              <div className="filters">
                {(['all', 'failed', 'passed', 'flaky'] as Filter[]).map((item) => (
                  <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>
                ))}
              </div>
            </div>
            <div className="check-list">
              {filteredChecks.map((check) => <CheckCard key={check.id} check={check} selected={selectedCheck?.id === check.id} onSelect={() => setSelectedId(check.id)} />)}
              {!filteredChecks.length && <p className="empty-filter">No checks match this filter.</p>}
            </div>
          </aside>
          {selectedCheck && <DetailPanel check={selectedCheck} />}
        </section>
      </main>

      <footer><span>Faultline report schema v{report.schemaVersion}</span><span>Evidence over vibes.</span></footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
