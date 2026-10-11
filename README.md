# JourneySync AI
Original journey orchestration MVP. Open dist/index.html or serve dist with any static web server. No dependencies required.

## Implemented
Unified timeline for flights, transfers, meetings, hotels, trains and events; directed dependency buffers; overlap and cancellation detection; delay simulation; candidate recovery enumeration and feasibility checks; budget filtering; local approval workflow; dependency map; approval history; JSON export; local device persistence.

Recovery is deterministic and constraint-based, not an LLM or live predictive model. The engine ranks three simulated alternatives, rejecting those with unresolved conflicts or excess cost. Meeting changes require a locally recorded approval. No provider calls, bookings, real availability, corporate multi-user accounts or live monitoring are implemented.

## Verification
`node tests/engine.test.js`

## Next integration points
Replace sample candidates with provider adapters; add server storage, authenticated organisation roles and approval policies; time-zone aware journey editing; real disruption feeds; optimisation solver; optional LLM explanations with deterministic constraint validation. Never treat generated availability as bookable inventory.

## Run on your laptop

```bash
git clone https://github.com/CODESOFT-ui/journeysync-ai.git
cd journeysync-ai
python -m http.server 8000 --directory dist
```

Open http://localhost:8000. On Windows, use `py` instead of `python` if needed. You can also open `dist/index.html` directly.

## Demo
Set the flight delay to 120 minutes, simulate it, review recovery options, then approve a feasible plan. Reset demo restores the original journey. No API keys are needed.

[Hosted demo](https://journeysync-shravan.fizzytune128.chatgpt.site) (owner-private)
