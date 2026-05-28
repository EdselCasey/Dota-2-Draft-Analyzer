# Batch Analyzer Scripts

Tools for validating the draft analyzer against bulk pro matches.

## Setup

1. Get a Stratz API key at https://stratz.com/api
2. Copy `.env.local.example` to `.env.local` and add your key:
   ```
   STRATZ_API_KEY=your_key_here
   ```

## Usage

### Step 1 — Fetch match IDs

Pulls recent pro/premium/international match IDs from Stratz and writes them to `match-ids.txt`.

```
npm run fetch:matches
```

Configurable via env vars:
- `FETCH_MATCH_COUNT` (default: 300)
- `FETCH_LEAGUE_TIER` (default: PROFESSIONAL,PREMIUM,INTERNATIONAL)

Example with custom count:
```
$env:FETCH_MATCH_COUNT="500"; npm run fetch:matches
```

### Step 2 — Analyze in batch

Reads `match-ids.txt`, fetches each match, runs through the analyzer, writes results to `results.csv`.

```
npm run analyze:batch
```

Output: `scripts/results.csv` (one row per match) plus a summary printed to console.

## CSV columns

- `match_id`, `patch`, `league`, `tier`, `duration_min`
- `radiant_heroes`, `dire_heroes` (pipe-separated)
- `radiant_timing_label/score`, `dire_timing_label/score`
- `predicted_favor`, `radiant_edge`
- `radiant_urgency_label/score`, `dire_urgency_label/score`
- Advantage/vulnerability counts by severity per side
- `radiant_dominance_count`, `dire_dominance_count`
- `top_*_advantage`, `top_*_vulnerability`
- `predicted_winner`, `actual_winner`, `prediction_correct`

## Workflow

1. Run `fetch:matches` once to populate IDs
2. Run `analyze:batch` to generate results
3. Open `results.csv` in Excel
4. Filter, pivot, look for patterns
5. Adjust counter strengths / weights in `lib/matchup.ts`
6. Re-run `analyze:batch` (same match IDs) and compare accuracy

## Notes

- Bronze tier rate limit: 250/min (script delays 300ms between calls)
- Output files (`match-ids.txt`, `results.csv`) are gitignored
- Failed matches are skipped, not retried — keep track via console output
