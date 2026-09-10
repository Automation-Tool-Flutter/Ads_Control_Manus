# OpenAI setup

Create a `.env.local` file at the project root:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4.1-mini
```

Then start the application with `npm run dev`.

Campaign analysis uses OpenAI Structured Outputs. Executable recommendations
currently support pausing, activating, and changing a campaign daily budget.

The Budget Optimizer is available at `/accounts/{accountId}/budget-optimizer`.
It uses AI campaign scoring plus deterministic 10%, 20%, or 40% allocation limits.
