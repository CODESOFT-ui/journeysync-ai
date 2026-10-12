/* AI is optional: the deterministic journey engine works without Ollama. */
(() => {
  let ready = false, busy = false, revision = 0, selected = null;
  const local = location.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(location.hostname);
  const status = $('ai-status'), answer = $('ai-answer'), note = $('ai-note'), button = $('ai-send');
  const controllerTimeout = 190000;
  function controls() {
    button.disabled = busy || !ready;
    button.textContent = busy ? 'Thinking locally…' : 'Ask AI →';
    document.querySelectorAll('[data-ai-question]').forEach(b => b.disabled = busy || !ready);
  }
  async function health() {
    if (!local) {
      status.textContent = 'Local server required';
      answer.textContent = 'To use AI, run server.py and open http://localhost:8000. Opening index.html directly runs only the journey engine.';
      controls(); return;
    }
    status.textContent = 'Checking local AI…';
    try {
      const response = await fetch('/api/health', {signal: AbortSignal.timeout(6000)});
      if (!response.ok) throw new Error('Start with server.py, rather than a static file server.');
      const data = await response.json(); ready = data.ready === true;
      status.textContent = ready ? 'Local AI ready · ' + data.model : data.connected ? 'Model not installed' : 'Ollama offline';
      if (!ready) answer.textContent = data.connected ? 'Download the model in a terminal: ollama pull ' + data.model + '. Then click Check connection.' : 'Start the Ollama application, then click Check connection. The journey engine still works offline.';
      else if (!selected) answer.textContent = 'Local AI is ready. Ask a question or use one of the shortcuts above.';
    } catch (err) { ready = false; status.textContent = 'Local server unavailable'; answer.textContent = err.message; }
    controls();
  }
  async function ask(question) {
    if (busy || !ready || !question.trim()) return;
    const requestedRevision = revision;
    selected = null; $('ai-plan').hidden = true; busy = true; controls();
    answer.textContent = 'Generating an answer on your laptop. The first response may take longer while the model loads…';
    try {
      const snapshot = JSON.parse(JSON.stringify({question, items: state.items, budget: state.budget, extra: state.extra,
        plans: plans.map(p => ({id:p.id, title:p.title, items:p.items, extra:p.extra}))}));
      const response = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify(snapshot), signal:AbortSignal.timeout(controllerTimeout)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI request failed.');
      if (revision !== requestedRevision) {answer.textContent = 'Your journey changed while AI was answering. Ask again for an updated recommendation.'; return;}
      answer.textContent = data.answer;
      note.textContent = data.validation_note + ' AI text can contain mistakes; use the checked recovery cards. Availability is simulated.';
      const plan = plans.find(p => p.id === data.suggested_plan_id && p.feasible);
      if (plan) {selected = plan.id; $('ai-plan').textContent = 'Review: ' + plan.title + ' →'; $('ai-plan').hidden = false;}
    } catch (err) {answer.textContent = err.name === 'TimeoutError' ? 'The model took too long. Retry, or use the smaller model described in README.' : err.message;}
    finally {busy = false; controls();}
  }
  $('ai-form').addEventListener('submit', ev => {ev.preventDefault(); ask($('ai-question').value);});
  document.querySelectorAll('[data-ai-question]').forEach(b => b.addEventListener('click', () => { $('ai-question').value = b.dataset.aiQuestion; ask(b.dataset.aiQuestion); }));
  $('ai-check').onclick = health;
  $('ai-plan').onclick = () => {
    view('recovery');
    const target = document.querySelector('[data-plan="' + selected + '"]');
    if (target) {target.scrollIntoView({behavior:'smooth',block:'center'}); target.focus();}
  };
  document.addEventListener('journeyupdated', () => {revision++; selected = null; $('ai-plan').hidden = true; if (!busy) { answer.textContent = 'Journey updated. Ask AI again to analyse the latest timeline.'; note.textContent = 'Changes still require approval. AI does not book or modify reservations.'; }});
  controls(); health();
})();
