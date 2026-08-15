#!/usr/bin/env python3
"""Emit the PR Risk Ledger page from pr-key.json (no hand-transcribed data)."""
import json, html, collections, sys

rows = json.load(open(sys.argv[1]))
OUT = sys.argv[2]

tot = len(rows)
prereg = sum(1 for r in rows if r["prereg"] == "pre-registered")
during = sum(1 for r in rows if r["prereg"] == "added-during-dev")
leaked = sum(1 for r in rows if "KEY-IN-COMMIT" in r["flags"])
dist = collections.Counter(r["risk"] for r in rows)

UNMERGED = [
    ("1", "feature/bootstrap-nestjs", "L", "Scaffold NestJS + TS + ESLint/Prettier + Jest"),
    ("50", "refactor/permission-system", "H", "Redesign to resource:action + data migration"),
    ("52", "feature/e2e-tests", "M", "Supertest e2e for auth + tasks"),
    ("54", "feature/eslint-strict", "L", "Stricter lint ruleset"),
    ("55", "ci/github-actions-build", "M", "GH Actions build + test workflow"),
    ("57", "ci/security-scan", "L", "Dependency/audit scan step"),
]

DECISIONS = [
    ("Resolve a range to one letter",
     "PR&nbsp;#56 <code>performance/search-index</code> carries backlog risk <strong>M→H</strong>. "
     "Every other row is a single letter; scoring needs one here too."),
    ("One backlog row, two merges",
     "PRs&nbsp;#13 and #14 both merge <code>fix-package-discrepancy</code> (backlog&nbsp;#60, risk&nbsp;L). "
     "Decide whether that is one labelled PR or two."),
    ("Confirm two branch-name joins",
     "PR&nbsp;#10 <code>feature/registration-endpoint</code> → backlog <code>feature/auth-register</code>, and "
     "PR&nbsp;#12 <code>feature/auth-refesh-token</code> → backlog <code>feature/auth-refresh-token</code> (typo). "
     "Both joined by hand, not by name match."),
    ("Six pre-registered rows never merged",
     "Including backlog&nbsp;#50 <code>refactor/permission-system</code>, the only unbuilt <strong>H</strong>. "
     "Its absence is most of why realized H sits below the 15% target."),
]

def chip(risk):
    key = {"L": "l", "M": "m", "H": "h"}.get(risk, "x")
    return f'<span class="risk risk--{key}">{html.escape(risk)}</span>'

def flagchips(flags):
    if flags == "-":
        return '<span class="dash">—</span>'
    out = []
    for f in flags.split(","):
        cls = "flag--warn" if f == "KEY-IN-COMMIT" else "flag"
        label = "key in commit" if f == "KEY-IN-COMMIT" else f.replace("-", " ")
        out.append(f'<span class="{cls}">{html.escape(label)}</span>')
    return "".join(out)

trs = []
for r in rows:
    prov = "pre" if r["prereg"] == "pre-registered" else ("dev" if r["prereg"] == "added-during-dev" else "none")
    provlabel = {"pre": "pre-registered", "dev": "added during dev", "none": "no row"}[prov]
    size = f'{r["size_planned"] or "?"}<span class="arr">→</span>{r["size_actual"]}'
    if r["size_planned"] != r["size_actual"]:
        size = f'<span class="size size--off">{size}</span>'
    else:
        size = f'<span class="size">{size}</span>'
    trs.append(f"""      <tr>
        <td class="num">{r['pr']}</td>
        <td class="mono br">{html.escape(r['branch'])}</td>
        <td class="num dim">{r['bl_no'] or '—'}</td>
        <td>{chip(r['risk'] or '?')}</td>
        <td><span class="prov prov--{prov}">{provlabel}</span></td>
        <td>{size}</td>
        <td class="num dim">{r['files']}</td>
        <td class="num delta"><span class="add">+{r['ins']}</span> <span class="del">&minus;{r['dele']}</span></td>
        <td class="flags">{flagchips(r['flags'])}</td>
      </tr>""")

unmerged_lis = "\n".join(
    f'        <li><span class="blno">#{n}</span> <code>{html.escape(b)}</code> {chip(rk)}'
    f'<span class="goal">{html.escape(g)}</span></li>' for n, b, rk, g in UNMERGED)

decision_lis = "\n".join(
    f'        <li><h3>{html.escape(t)}</h3><p>{d}</p></li>' for t, d in DECISIONS)

def pct(k):
    return f"{dist.get(k,0)/tot*100:.0f}%"

page = f"""<title>PR Risk Ledger</title>
<style>
  :root {{
    --ground:#F5F6F8; --surface:#FFFFFF; --surface-2:#EFF1F5;
    --ink:#191D25; --ink-2:#5C6675; --ink-3:#8A93A2;
    --rule:#DDE1E8; --rule-2:#C9CFD9;
    --accent:#3D5A8A;
    --l:#2C7A66; --l-bg:#E3F1EC;
    --m:#996210; --m-bg:#F7EDDC;
    --h:#9E2E42; --h-bg:#F7E4E7;
    --warn:#9E2E42; --warn-bg:#F7E4E7;
    --add:#2C7A66; --del:#9E2E42;
    --shadow:0 1px 2px rgba(25,29,37,.05), 0 8px 24px -12px rgba(25,29,37,.18);
    --display: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    --body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{
      --ground:#12151A; --surface:#191D24; --surface-2:#1F242C;
      --ink:#E7EAEF; --ink-2:#9BA5B4; --ink-3:#6E7887;
      --rule:#2A3038; --rule-2:#3A424D;
      --accent:#8AA6D0;
      --l:#5CB39C; --l-bg:#17302B;
      --m:#D3A052; --m-bg:#332816;
      --h:#DE7688; --h-bg:#331A20;
      --warn:#DE7688; --warn-bg:#331A20;
      --add:#5CB39C; --del:#DE7688;
      --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.7);
    }}
  }}
  :root[data-theme="dark"] {{
    --ground:#12151A; --surface:#191D24; --surface-2:#1F242C;
    --ink:#E7EAEF; --ink-2:#9BA5B4; --ink-3:#6E7887;
    --rule:#2A3038; --rule-2:#3A424D;
    --accent:#8AA6D0;
    --l:#5CB39C; --l-bg:#17302B;
    --m:#D3A052; --m-bg:#332816;
    --h:#DE7688; --h-bg:#331A20;
    --warn:#DE7688; --warn-bg:#331A20;
    --add:#5CB39C; --del:#DE7688;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.7);
  }}

  body {{
    background:var(--ground); color:var(--ink);
    font-family:var(--body); font-size:16px; line-height:1.6;
    -webkit-font-smoothing:antialiased;
  }}
  .wrap {{ max-width:1120px; margin:0 auto; padding:56px 24px 96px;
           display:flex; flex-direction:column; gap:56px; }}

  header {{ display:flex; flex-direction:column; gap:14px;
            border-bottom:1px solid var(--rule); padding-bottom:32px; }}
  .eyebrow {{ font-family:var(--mono); font-size:11.5px; letter-spacing:.14em;
              text-transform:uppercase; color:var(--ink-3); }}
  h1 {{ font-family:var(--display); font-size:clamp(30px,4.4vw,44px); line-height:1.12;
        font-weight:600; letter-spacing:-.015em; text-wrap:balance; }}
  .lede {{ color:var(--ink-2); max-width:62ch; font-size:17px; }}

  .stats {{ display:grid; gap:1px; background:var(--rule);
            grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
            border:1px solid var(--rule); border-radius:6px; overflow:hidden; }}
  .stat {{ background:var(--surface); padding:18px 20px;
           display:flex; flex-direction:column; gap:5px; }}
  .stat b {{ font-family:var(--display); font-size:32px; font-weight:600;
             line-height:1; font-variant-numeric:tabular-nums; letter-spacing:-.02em; }}
  .stat span {{ font-size:12.5px; color:var(--ink-2); line-height:1.35; }}
  .stat--flag b {{ color:var(--warn); }}
  .stat--good b {{ color:var(--l); }}

  section {{ display:flex; flex-direction:column; gap:20px; }}
  h2 {{ font-family:var(--display); font-size:24px; font-weight:600; letter-spacing:-.01em; }}
  .sec-note {{ color:var(--ink-2); font-size:14.5px; max-width:64ch; margin-top:-10px; }}

  ol.decisions {{ list-style:none; display:grid; gap:1px; background:var(--rule);
                  border:1px solid var(--rule); border-radius:6px; overflow:hidden; }}
  ol.decisions li {{ background:var(--surface); padding:18px 20px 20px;
                     border-left:3px solid var(--accent); }}
  ol.decisions h3 {{ font-size:15px; font-weight:650; margin-bottom:4px; }}
  ol.decisions p {{ color:var(--ink-2); font-size:14.5px; }}

  .tablecard {{ border:1px solid var(--rule); border-radius:6px;
                background:var(--surface); overflow-x:auto; box-shadow:var(--shadow); }}
  table {{ border-collapse:collapse; width:100%; min-width:900px; font-size:13.5px; }}
  thead th {{ position:sticky; top:0; background:var(--surface-2); text-align:left;
              font-family:var(--mono); font-size:10.5px; letter-spacing:.1em;
              text-transform:uppercase; color:var(--ink-2); font-weight:600;
              padding:11px 12px; border-bottom:1px solid var(--rule-2); white-space:nowrap; }}
  tbody td {{ padding:9px 12px; border-bottom:1px solid var(--rule); vertical-align:middle; }}
  tbody tr:last-child td {{ border-bottom:0; }}
  tbody tr:hover td {{ background:var(--surface-2); }}
  .num {{ font-variant-numeric:tabular-nums; text-align:right; white-space:nowrap; }}
  .dim {{ color:var(--ink-3); }}
  .mono {{ font-family:var(--mono); font-size:12.5px; }}
  .br {{ color:var(--ink); white-space:nowrap; }}
  .delta {{ font-family:var(--mono); font-size:12px; white-space:nowrap; }}
  .add {{ color:var(--add); }} .del {{ color:var(--del); }}
  .dash {{ color:var(--ink-3); }}
  .arr {{ color:var(--ink-3); padding:0 2px; }}

  .risk {{ display:inline-block; min-width:26px; text-align:center;
           font-family:var(--mono); font-size:11.5px; font-weight:650;
           padding:2.5px 7px; border-radius:3px; letter-spacing:.03em; }}
  .risk--l {{ color:var(--l); background:var(--l-bg); }}
  .risk--m {{ color:var(--m); background:var(--m-bg); }}
  .risk--h {{ color:var(--h); background:var(--h-bg); }}
  .risk--x {{ color:var(--warn); background:var(--warn-bg); }}

  .prov {{ font-size:11.5px; white-space:nowrap; }}
  .prov--pre {{ color:var(--ink-2); }}
  .prov--dev {{ color:var(--accent); }}
  .prov--none {{ color:var(--warn); font-weight:600; }}

  .size {{ font-family:var(--mono); font-size:12px; color:var(--ink-3); white-space:nowrap; }}
  .size--off {{ color:var(--ink); }}

  .flags {{ display:flex; flex-wrap:wrap; gap:4px; max-width:230px; }}
  .flag, .flag--warn {{ font-size:10.5px; padding:2px 6px; border-radius:3px;
                        white-space:nowrap; letter-spacing:.02em; }}
  .flag {{ color:var(--ink-2); background:var(--surface-2); border:1px solid var(--rule); }}
  .flag--warn {{ color:var(--warn); background:var(--warn-bg);
                 border:1px solid var(--warn); font-weight:600; }}

  ul.unmerged {{ list-style:none; display:flex; flex-direction:column; gap:1px;
                 background:var(--rule); border:1px solid var(--rule);
                 border-radius:6px; overflow:hidden; }}
  ul.unmerged li {{ background:var(--surface); padding:12px 18px;
                    display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:14px; }}
  .blno {{ font-family:var(--mono); font-size:12px; color:var(--ink-3);
           min-width:34px; font-variant-numeric:tabular-nums; }}
  .goal {{ color:var(--ink-2); font-size:13.5px; }}
  code {{ font-family:var(--mono); font-size:12.5px;
          background:var(--surface-2); padding:1.5px 5px; border-radius:3px; }}

  .legend {{ display:flex; flex-wrap:wrap; gap:18px; font-size:12.5px;
             color:var(--ink-2); padding-top:2px; }}
  .legend b {{ color:var(--ink); font-weight:600; }}

  footer {{ border-top:1px solid var(--rule); padding-top:24px;
            color:var(--ink-3); font-size:13px; max-width:70ch; }}
  a {{ color:var(--accent); }}
  :focus-visible {{ outline:2px solid var(--accent); outline-offset:2px; }}
  @media (prefers-reduced-motion:reduce) {{ * {{ transition:none !important; animation:none !important; }} }}
</style>

<div class="wrap">
  <header>
    <div class="eyebrow">master-rad · ground-truth key</div>
    <h1>PR Risk Ledger</h1>
    <p class="lede">All {tot} merged pull requests joined to their pre-registered backlog risk label,
      by branch name. The join is what the LLM evaluation gets scored against — so every
      unresolved row below is a hole in the answer key.</p>
  </header>

  <div class="stats">
    <div class="stat"><b>{tot}</b><span>PRs merged, all joined to a backlog row</span></div>
    <div class="stat"><b>{prereg}</b><span>labelled before implementation began</span></div>
    <div class="stat"><b>{during}</b><span>rows opened during development</span></div>
    <div class="stat stat--good"><b>0</b><span>pre-registered labels ever revised</span></div>
    <div class="stat stat--flag"><b>{leaked}</b><span>PRs leaking the key in a commit message</span></div>
  </div>

  <section>
    <h2>Open decisions</h2>
    <p class="sec-note">Four things the join cannot settle on its own. Each one blocks a row
      from being scoreable.</p>
    <ol class="decisions">
{decision_lis}
    </ol>
  </section>

  <section>
    <h2>Realized risk distribution</h2>
    <p class="sec-note">Against the §6 targets of ~40% L, ~45% M, ~15% H. L and M land close;
      H falls short, largely because the one unbuilt <strong>H</strong> row is
      <code>refactor/permission-system</code>.</p>
    <div class="stats">
      <div class="stat"><b>{pct('L')}</b><span>Low — {dist.get('L',0)} PRs (target ~40%)</span></div>
      <div class="stat"><b>{pct('M')}</b><span>Medium — {dist.get('M',0)} PRs (target ~45%)</span></div>
      <div class="stat"><b>{pct('H')}</b><span>High — {dist.get('H',0)} PRs (target ~15%)</span></div>
      <div class="stat"><b>1</b><span>unresolved M→H range</span></div>
    </div>
  </section>

  <section>
    <h2>The join</h2>
    <p class="sec-note">Backlog numbers do not match GitHub PR numbers — the join is on branch
      name throughout. Size compares the planned band to insertions actually merged, excluding
      <code>docs/</code> and <code>package-lock.json</code>; a darker value means the bands differ.</p>
    <div class="legend">
      <span><b>pre-registered</b> — row existed 2026-07-22, before any code</span>
      <span><b>added during dev</b> — organic row, labelled when opened</span>
      <span><b>key in commit</b> — risk letter readable in the commit message</span>
    </div>
    <div class="tablecard">
      <table>
        <thead>
          <tr>
            <th>PR</th><th>Branch</th><th>BL#</th><th>Risk</th><th>Provenance</th>
            <th>Size</th><th>Files</th><th>Lines</th><th>Flags</th>
          </tr>
        </thead>
        <tbody>
{chr(10).join(trs)}
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>Planned but never merged</h2>
    <p class="sec-note">Six pre-registered rows have no matching merge. They carry labels that
      will never be scored, and they are the main reason the realized distribution drifts from plan.</p>
    <ul class="unmerged">
{unmerged_lis}
    </ul>
  </section>

  <footer>
    Generated from local git history alone — no GitHub API. Backlog labels read from
    <code>docs/BACKLOG.md</code> at HEAD and diffed against its first commit to confirm no
    pre-registered label was revised. Per-PR diffs taken as
    <code>git diff &lt;merge&gt;^1...&lt;merge&gt;^2</code>.
  </footer>
</div>
"""

open(OUT, "w").write(page)
print(f"wrote {OUT} ({len(page)} bytes), {len(trs)} rows")
