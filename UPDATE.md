# Daily data update

Instructions for the scheduled Claude job that keeps `data.json` current.
The page (`index.html`) reads `data.json`; nothing else in the repo changes during an update.

## Rules

- Edit **only** `data.json`, then run `node scripts/sync-seed.mjs` (it copies the data into `index.html`). Never edit code, styles or these instructions.
- Read every source on every run, even if an earlier run today already did. A source's status reflects this run only.
- Never invent a number. If a value can't be read from its source, keep the old value.
- `WebFetch` hands the page to a summarizer, which can drop or round numbers and cut long tables. For the numbers you store, read the raw page text yourself (`node scripts/render.mjs <url> > /tmp/page.txt`, then `grep`/read it) and use `WebFetch` only to find where things are.
- If a whole source can't be read, keep all its old values and set that source's `status` to `"stale"` (leave its `date` at the last successful read).
- When a source is read successfully, set its `status` to `"ok"` and its `date` to the date the source itself shows (its "last updated" date), or today if it shows none.
- Always set `checked` to today. Set `updated` to today only if any number, model or access entry changed.
- Commit to `main` and push. Message: `data: YYYY-MM-DD` plus one line per notable change. If only `checked` changed, the message is `data: YYYY-MM-DD kontrol, değişiklik yok`.

## data.json shape

- `families[]`: one entry per model that at least one of the user's subscriptions can reach, plus new flagship models whose access isn't confirmed yet (`access: []`, e.g. Gemini 4 Carbon).
  - `maker`: `anthropic`, `openai`, `google`, `deepseek`, or `other` (everything else, e.g. OpenCode Go models).
  - `access[]`: `{ "s": subscription, "t": minimum tier, "note"?: short Turkish note }`.
    Subscriptions and tiers: `claude` (0 Pro, 1 Max), `chatgpt` (0 Free/Go, 1 Plus, 2 Pro), `gemini` (0 free, 1 AI Pro/Ultra), `deepseek` (0 free app), `opencode` (0 Go $10).
    A `note` marks limited or unverified access (e.g. `"Plus: Work/Codex"`, `"doğrulanmadı"`).
  - `go`: requests per month on the OpenCode Go $10 plan, or `"unlimited"`. Only for models on OpenCode Go.
  - `v[]`: `[effort, intelligence, costPerTaskUSD, minutesPerTask]` per reasoning level. `effort` is one of `""` (model has no levels), `non-reasoning`, `low`, `medium`, `high`, `xhigh`, `max`. Use `null` for a value the source doesn't report. Leave `v` as `[]` when AA hasn't scored the model yet; the page then shows it only in the source comparison table. Fill `v` as soon as AA lists it.
- `ext{}`: keyed by family name, independent sources. Leave a key out when the source doesn't list the model.
  - `lb`: `[LiveBench overall, cost per successful task USD]`
  - `ar`: LMArena text score (integer). `arNote`: short Turkish note such as `"ön sonuç"` (preliminary) or `"eski sürüm"` (arena lists an older snapshot than AA).
  - `vals`: `[Vals Index accuracy %, cost per test USD or null]`
- `accessNotes`, `caveats`: one Turkish paragraph each, shown on the page. Update them when the facts they state change.

## Sources and how to read them

Try `WebFetch` first. If a page comes back without the numbers (it draws them with JavaScript) or with HTTP 403, use the renderer, which opens the page in a real headless browser:

```bash
npm i --no-save playwright@1.49.1
node scripts/render.mjs https://livebench.ai/
```

`render.mjs` uses a Chromium already installed on the machine (it looks in `/opt/pw-browsers` first), so `npx playwright install` is usually not needed. Only if it reports that no browser exists, run `npx playwright install chromium` once and try again. Delete `node_modules` before committing.

If neither works, mark the source stale and move on. In the final summary, name the exact error for each stale source (DNS failure means the domain must be added to the environment's network allowlist).

| Key | Source | What to take |
|---|---|---|
| `aa` | https://artificialanalysis.ai/leaderboards/models | For every reasoning level of every family: Intelligence Index, cost per task, time per task (minutes). AA names levels like "Claude Opus 5.5 (high with fallback)"; ignore "with fallback". |
| `lb` | https://livebench.ai/ (tables are drawn by JavaScript; use `render.mjs`) | Overall score and "cost per successful task" per model. |
| `ar` | https://arena.ai/leaderboard/text (WebFetch gets 403; use `render.mjs`) | Score per model. If several levels are listed, take the family's highest. Mark `(Prelim.)` entries with `arNote: "ön sonuç"`. |
| `vals` | https://www.vals.ai/benchmarks/vals_index | Accuracy and cost per test from the leaderboard table. |
| `opencode` | https://opencode.ai/zen/go/v1/models and https://opencode.ai/v2/docs/console/go | Which models are on Go, and the Go plan's monthly request estimate per model (`go`). |
| `plans` | OpenAI help center (GPT-6 and other models, ChatGPT model selector), Claude support (plans and usage), Google AI plans / Gemini app help | Which plan reaches which model. Change `access` only when a source clearly says so; otherwise leave it. |

## Adding or removing models

**Look for new models on every run.** Updating only the models already in `data.json` is not enough. After reading each source (`aa`, `lb`, `ar`, `vals`, `opencode`), list every model in it that has no family in `data.json` (compare names loosely: case, spaces, dashes, version suffixes, reasoning-level suffixes such as "(high)"). For each one, decide:

- Add it as a family when it is reachable through one of the subscriptions above, or when it is a new model from Anthropic, OpenAI, Google or DeepSeek. **AA is not required**: a model that appears in any one source (AA, LiveBench, LMArena or Vals) is added. Use AA's spelling of the name if AA lists it, otherwise the maker's official name, and use that same name as the `ext` key.
- Fill whatever the sources give: `v` from AA (or `[]` if AA doesn't have it), `ext` from LiveBench, LMArena and Vals. Never invent a number.
- `access`: take it from the plan pages. If those can't be read, use the maker's official launch announcement (blog or model page found with WebSearch) when it clearly names who gets the model (e.g. "rolling out to free users of the Gemini app" → `gemini` t 0). If neither says, use `access: []` and mention it in the summary. Add `note: "doğrulanmadı"` when the wording is vague.
- Skip models that are not reachable through any subscription and are not from those four makers (e.g. a lab's minor model only on its own API).

In the final summary, always include a **"Yeni modeller"** line: what you added, and every unmatched name you skipped with a few words on why. Write "Yeni modeller: yok" if every source matched.

- When a model leaves every subscription, set its `access` to `[]` instead of deleting it, unless every source has dropped it too.
- A newer version that replaces an older one in a subscription (e.g. a new Sonnet) is a new family; set the old one's `access` to `[]`.

## Before you commit

```bash
git show HEAD:data.json > /tmp/prev.json
node scripts/validate.mjs /tmp/prev.json
node scripts/sync-seed.mjs
```

`validate.mjs` must print `data.json OK`. Fix every `ERROR`. For each `WARN` (large jumps), re-read that value from the source once; keep it if the source really says so, and mention it in the commit message.

End the run with a short summary: which sources were read, which were stale, and what changed.
