# Daily data update

Instructions for the scheduled Claude job that keeps `data.json` current.
The page (`index.html`) reads `data.json`; nothing else in the repo changes during an update.

## Rules

- Edit **only** `data.json`, then run `node scripts/sync-seed.mjs` (it copies the data into `index.html`). Never edit code, styles or these instructions.
- Never invent a number. If a value can't be read from its source, keep the old value.
- If a whole source can't be read, keep all its old values and set that source's `status` to `"stale"` (leave its `date` at the last successful read).
- When a source is read successfully, set its `status` to `"ok"` and its `date` to the date the source itself shows (its "last updated" date), or today if it shows none.
- Always set `checked` to today. Set `updated` to today only if any number, model or access entry changed.
- Commit to `main` and push. Message: `data: YYYY-MM-DD` plus one line per notable change. If only `checked` changed, the message is `data: YYYY-MM-DD kontrol, değişiklik yok`.

## data.json shape

- `families[]`: one entry per model that at least one of the user's subscriptions can reach (plus Gemini 4 Carbon as a reference with `access: []`).
  - `maker`: `anthropic`, `openai`, `google`, `deepseek`, or `other` (everything else, e.g. OpenCode Go models).
  - `access[]`: `{ "s": subscription, "t": minimum tier, "note"?: short Turkish note }`.
    Subscriptions and tiers: `claude` (0 Pro, 1 Max), `chatgpt` (0 Free/Go, 1 Plus, 2 Pro), `gemini` (0 free, 1 AI Pro/Ultra), `deepseek` (0 free app), `opencode` (0 Go $10).
    A `note` marks limited or unverified access (e.g. `"Plus: Work/Codex"`, `"doğrulanmadı"`).
  - `go`: requests per month on the OpenCode Go $10 plan, or `"unlimited"`. Only for models on OpenCode Go.
  - `v[]`: `[effort, intelligence, costPerTaskUSD, minutesPerTask]` per reasoning level. `effort` is one of `""` (model has no levels), `non-reasoning`, `low`, `medium`, `high`, `xhigh`, `max`. Use `null` for a value the source doesn't report.
- `ext{}`: keyed by family name, independent sources. Leave a key out when the source doesn't list the model.
  - `lb`: `[LiveBench overall, cost per successful task USD]`
  - `ar`: LMArena text score (integer). `arNote`: short Turkish note such as `"ön sonuç"` (preliminary) or `"eski sürüm"` (arena lists an older snapshot than AA).
  - `vals`: `[Vals Index accuracy %, cost per test USD or null]`
- `accessNotes`, `caveats`: one Turkish paragraph each, shown on the page. Update them when the facts they state change.

## Sources and how to read them

Try `WebFetch` first. If a page comes back without the numbers (it draws them with JavaScript), install Playwright once and use the renderer:

```bash
npm i --no-save playwright@1.49.1 && npx playwright install chromium
node scripts/render.mjs https://livebench.ai/
```

If neither works, mark the source stale and move on.

| Key | Source | What to take |
|---|---|---|
| `aa` | https://artificialanalysis.ai/leaderboards/models | For every reasoning level of every family: Intelligence Index, cost per task, time per task (minutes). AA names levels like "Claude Opus 5.5 (high with fallback)"; ignore "with fallback". |
| `lb` | https://livebench.ai/ | Overall score and "cost per successful task" per model. |
| `ar` | https://arena.ai/leaderboard/text | Score per model. If several levels are listed, take the family's highest. Mark `(Prelim.)` entries with `arNote: "ön sonuç"`. |
| `vals` | https://www.vals.ai/benchmarks/vals_index | Accuracy and cost per test from the leaderboard table. |
| `opencode` | https://opencode.ai/zen/go/v1/models and https://opencode.ai/v2/docs/console/go | Which models are on Go, and the Go plan's monthly request estimate per model (`go`). |
| `plans` | OpenAI help center (GPT-6 and other models, ChatGPT model selector), Claude support (plans and usage), Google AI plans / Gemini app help | Which plan reaches which model. Change `access` only when a source clearly says so; otherwise leave it. |

## Adding or removing models

- Add a family when a new model becomes reachable through one of the subscriptions above and AA has scored it. Match its name to how AA writes it.
- When a model leaves every subscription, set its `access` to `[]` instead of deleting it, unless AA has dropped it too.
- A newer version that replaces an older one in a subscription (e.g. a new Sonnet) is a new family; set the old one's `access` to `[]`.

## Before you commit

```bash
git show HEAD:data.json > /tmp/prev.json
node scripts/validate.mjs /tmp/prev.json
node scripts/sync-seed.mjs
```

`validate.mjs` must print `data.json OK`. Fix every `ERROR`. For each `WARN` (large jumps), re-read that value from the source once; keep it if the source really says so, and mention it in the commit message.

End the run with a short summary: which sources were read, which were stale, and what changed.
