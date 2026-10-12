# JourneySync AI — Local Journey Assistant & Recovery Engine

A laptop-friendly journey orchestration prototype with a real local LLM assistant. It combines a simulated travel timeline, dependency and overlap checks, budget-aware recovery candidates, and natural-language explanations powered by **Ollama + Qwen2.5 1.5B**.

## Run on Windows

1. Install [Ollama for Windows](https://ollama.com/download/windows). Keep Ollama running.
2. Open PowerShell and download the small model once:

   ```powershell
   ollama pull qwen2.5:1.5b
   ```

3. Download and extract the project ZIP, or clone this repository:

   ```powershell
   git clone https://github.com/CODESOFT-ui/journeysync-ai.git
   cd journeysync-ai
   ```

4. With Python 3.10+ installed, double-click **start-windows.bat**, or run:

   ```powershell
   py -3 server.py
   ```

5. Open **http://localhost:8000**. The AI panel should show **Local AI ready**. Do not open index.html directly when using AI.

No pip or npm installation, paid API keys or cloud inference required. The Python server uses the standard library and only listens on your laptop. After installing Ollama and downloading the model, this app can perform inference without internet. The model weights are not included in the ZIP.

## Laptop resource use

The default model download is about 986 MB; actual memory use is higher because inference needs working memory and context. The app limits context to 4,096 tokens, responses to 350 tokens, concurrent inference to one request, and keeps the model warm for two minutes. This is a modest starting configuration for an RTX 3050 laptop; speed and fit depend on RAM, VRAM, drivers and other apps. Update NVIDIA drivers if GPU acceleration is unavailable. `ollama ps` shows the processor being used.

For a smaller fallback:

```powershell
ollama pull qwen2.5:0.5b
$env:JOURNEYSYNC_MODEL = "qwen2.5:0.5b"
py -3 server.py
```

The smaller model can be less accurate. For a different port: `py -3 server.py --port 8001` and open http://localhost:8001. On Linux/macOS use `python3 server.py`.

## Demo walkthrough

- Set flight delay to 120 minutes and simulate it.
- Review conflict and recovery cards.
- Ask AI: **Explain the current conflicts and their downstream impact.**
- Ask AI: **Compare the feasible recovery options and recommend one within my budget.**
- A validated suggested plan links to its recovery card. Review and approve it yourself to update the timeline.
- Reset demo restores the original journey. Export downloads journey JSON.

## What AI actually does

The local LLM generates explanations and comparisons using current journey facts and supplied recovery candidates. It can recommend a feasible candidate ID. The server independently checks candidate timing, cancellations, dependency buffers, costs and budget before exposing that recommendation as a selectable plan. A changed fixed appointment is labelled as requiring approval. AI never directly updates the timeline or makes bookings. Answers can still be inaccurate; the checked cards remain the source of truth.

The current implementation is grounded prompting, not a trained prediction model or an autonomous multi-agent system. It does not discover real inventory or generate arbitrary new bookable itineraries. Travel availability, disruptions, fares, and alternative candidates are simulated. The corporate screen is a single-traveller prototype, not enterprise account management. Journey state and approval history are stored in your browser.

## Architecture

- `dist/engine.js`: deterministic overlap, dependency, cancellation and recovery feasibility logic.
- `dist/app.js`: timeline, local persistence, approvals and JSON export.
- `dist/ai.js`: local AI status, questions, context snapshots and validated recommendation navigation.
- `server.py`: serves frontend; validates journey context; calls local Ollama `/api/chat`; checks AI recommendation IDs.
- `start-windows.bat`: Windows launcher.
- `tests/`: deterministic engine tests and mocked local AI API tests.

The server binds to 127.0.0.1, uses a fixed local Ollama address, restricts Host and Origin headers, limits request size, and serves only `dist/`. No external AI service or API key is used. Questions are processed one at a time; HTTP tests use a mock model and do not establish actual model quality or laptop performance.

## Tests

```bash
node tests/engine.test.js
python -m unittest discover -s tests -p "test_*.py" -v
```

Node is only needed for the engine tests, not to run the app. Python is needed for local AI.

## Troubleshooting

- **Ollama offline:** start Ollama and press Check connection.
- **Model not installed:** run `ollama pull qwen2.5:1.5b`.
- **Local server required:** start `server.py`; use localhost, not the hosted demo or a file URL.
- **Port in use:** start with `--port 8001`.
- **Slow first response:** model loading can take time. Close memory-heavy apps or use the 0.5B fallback.

The earlier [hosted demo](https://journeysync-shravan.fizzytune128.chatgpt.site) remains the original static prototype. Local AI is in this downloadable version; that hosted page does not connect to your laptop.

Official references: [model](https://ollama.com/library/qwen2.5:1.5b), [Windows setup](https://docs.ollama.com/windows), [chat API](https://docs.ollama.com/api/chat).
