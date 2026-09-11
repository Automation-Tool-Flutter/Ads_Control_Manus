# Meta Ads AI — GPT-5.6 Luna setup

Create a `.env.local` file at the project root:

```env
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-5.6-luna
OPENAI_REASONING_EFFORT=none
```

Then start the application with `npm run dev`.

## Firebase App Hosting

Keep `OPENAI_API_KEY` configured on the deployed backend. Do not commit the key.
The local `.env.local` file is ignored by Git and is not copied from GitHub.

| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | Your API project's key | Required at runtime; never a `NEXT_PUBLIC_` variable. |
| `OPENAI_MODEL` | `gpt-5.6-luna` | Used by all 15 AI API routes. Other models are rejected; there is no model fallback. |
| `OPENAI_REASONING_EFFORT` | `none` by default | Preserves the low-deliberation behavior of the previous integration. Supported: `none`, `low`, `medium`, `high`, `xhigh`, `max`. |

`apphosting.yaml` supplies model and reasoning defaults, but Firebase Console
values override them. Check **App Hosting → View backend → Settings → Environment**
for stale overrides. Deploy these code changes to the connected branch, then
create a new rollout using that commit. Reusing an older build does not include
the new API client. No deployment is performed by editing these files.

## Request behavior

- All AI requests use the Responses API and the configured Luna model.
- Legacy `temperature` parameters are no longer sent. Existing JSON schemas,
  English-language instructions, and image inputs are preserved.
- Existing output limits are preserved with `none`. Enabling reasoning adds
  4,096 tokens to the request's total budget, capped at 128,000. This reserve is
  not a guarantee of completion; higher effort may increase time and cost.
- Requests retain the 55-second timeout. The body read is covered by it too.
- Incomplete, refused, empty, malformed and unfinished outputs are rejected
  before they reach analysis consumers. There are no automatic generation retries.
- Creative analysis retries without images only for a recognized image error,
  not for unrelated schema or model errors. It still uses Luna.

## Troubleshooting

| Result | Next step |
| :--- | :--- |
| Not configured | Check the runtime API key and create a new rollout. |
| Cannot access `gpt-5.6-luna` | Check the API project's model access and permissions. |
| Request configuration rejected | Note the rejected parameter and request reference. Check the deployed commit. |
| Output schema rejected | Review the schema in the affected API route. |
| Output limit reached | Reduce scope, lower reasoning effort, or adjust the affected route's output budget. |
| No available API quota | Check API billing and project spending limits. |

Server logs tagged `[Meta Ads AI]` contain only HTTP status, allowlisted error
code/parameter and a validated provider request ID. They do not contain the key,
provider error message, prompts or advertising data. User-facing errors include
the request reference when available. A successful local edit does not verify
your deployed key, model access or live responses.

Offline regression tests: `node --test tests/openai-luna.test.cjs`.
They mock every network call and do not load `.env.local`.

References: [OpenAI GPT-5.6 guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.6),
[Firebase backend configuration](https://firebase.google.com/docs/app-hosting/configure).

Campaign analysis uses OpenAI Structured Outputs. Executable recommendations
currently support pausing, activating, and changing a campaign daily budget.

The Budget Optimizer is available at `/accounts/{accountId}/budget-optimizer`.
It uses AI campaign scoring plus deterministic 10%, 20%, or 40% allocation limits.
