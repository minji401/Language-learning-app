# Contextual Echo

Language-learning MVP. A conversation is captured, transcribed, turned into reusable local expressions, and reviewed on a simple spaced-repetition schedule.

## Architecture

The phone talks to two backends with different jobs:

- **Supabase** owns accounts, Postgres, and the private `recordings` audio bucket. Row-level security keeps each user on their own rows. The app uploads audio directly to Storage at `{userId}/{file}`.
- **Express API** (`apps/api`) owns the slow work. With the service-role key it downloads that audio, sends it to Whisper, asks GPT-4o for key sentences, and writes `sentences` plus `review_cards`.

Express is the MVP processor because a transcription plus a generation call is a poor fit for a short-lived Edge Function. The analysis service is isolated, so Claude can replace GPT-4o later without touching storage or review.

```
Home (record / upload)
  -> Supabase Storage + POST /recordings
  -> POST /recordings/:id/process
       Whisper transcript
       GPT-4o sentences (original, local expression, Korean, context, examples)
  -> Analysis screen
  -> Sentence detail (save / unsave)
  -> Review tab (again / hard / good / easy)
```

## Layout

```
apps/mobile          Expo Router app (Home, Capture, Analysis, Sentence, Review)
apps/api             Express API
packages/shared      Types shared by the app and the API
supabase/migrations  Postgres schema, RLS, and the recordings bucket
```

The four product screens are in place. Home, Analysis, Sentence, and Review currently render sample data so navigation works before Supabase auth is connected. Capture explains the upload step still to be wired. The API routes are implemented and wait on env keys.

## Run

```bash
npm install --prefix apps/api
npm install --prefix apps/mobile
npm run api
npm run mobile
```

Copy `apps/api/.env.example` to `apps/api/.env` and `apps/mobile/.env.example` to `apps/mobile/.env` before starting the API.

Apply `supabase/migrations/20260924120000_init.sql` in the Supabase SQL editor, or with the Supabase CLI.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/recordings` | Recent history |
| POST | `/recordings` | Register an uploaded audio path |
| GET | `/recordings/:id` | Transcript and extracted sentences |
| POST | `/recordings/:id/process` | Transcribe, extract, and schedule review cards |
| GET | `/sentences/:id` | Sentence detail |
| PATCH | `/sentences/:id` | Save or unsave |
| GET | `/reviews/due` | Cards due now |
| POST | `/reviews/:id/grade` | `{ "grade": "again" \| "hard" \| "good" \| "easy" }` |

Authenticated routes expect `Authorization: Bearer <supabase access token>`.
