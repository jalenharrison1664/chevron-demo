# Hack Island (Chevron) – Implementation Guide

## Challenge summary

**Mission:** Autonomous AI-driven workflow that **Detect → Decide → Act → Explain** so monitoring and maintenance coordinate **without a human in the loop**.

- **Detect** – Read sensor data, identify abnormal temperature (overheating).
- **Decide** – Evaluate severity (warning vs critical) using context.
- **Act** – Automatically create maintenance work order(s); stronger: update **two** systems (e.g. work order + status/inventory).
- **Explain** – Clear summary: what was detected, what decision was made, what action was taken.

**AI requirement:** Use AI in at least one meaningful step (e.g. “Is this a dangerous trend?”, “What maintenance action should be created?”, or generate the technician report).

---

## What your app already does (mapped to the challenge)

| Challenge step | Your app today |
|----------------|-----------------|
| **Detect** | ✅ Simulated sensor data (temperature); history and spikes. |
| **Decide** | ✅ Severity from thresholds (Normal / Warning / Critical). |
| **Act** | ❌ No automatic maintenance work order; no second system. |
| **Explain** | ❌ No single “what happened” summary. |
| **AI** | ❌ No AI in the loop (could add for Decide or Explain). |

So you already have **Detect** and **Decide**. You need to add **Act** (and ideally a second system) and **Explain**, and plug in **AI** in at least one step.

---

## How to implement the full workflow

### 1. Detect (keep and extend)

- Keep: temperature (and history) as main sensor.
- Optional: add **pressure**, **pump load**, **flow rate** (even simulated) so data matches the prompt and supports AI.
- Store readings with: `timestamp`, `pump_id` (or pipe id), `temperature`, `pressure`, `flow_rate`, `load_pct` (or similar). JSON in memory + append to a CSV/JSON file for “sensor log.”

### 2. Decide (add AI here – strong option)

- When severity is Warning or Critical (or when trend is “dangerous”), call an AI API with:
  - Last N readings (temperature, optional pressure/load).
  - Question: *“Is this a dangerous trend or normal behavior? One sentence.”*  
  Or: *“Given this overheating event, what maintenance action should be created? One line.”*
- Use the answer to:
  - Drive **Act** (e.g. prefill work order description).
  - Or drive **Explain** (e.g. “AI assessment: dangerous trend – recommend immediate inspection”).

Tech: any **backend** that can call OpenAI / Azure OpenAI / Anthropic / etc. with a small prompt and return a string. No need for complex logic.

### 3. Act (must-have for the challenge)

- **System 1 – Maintenance work order**  
  When severity crosses into Warning or Critical (or when AI says “dangerous”):
  - Create a **maintenance record** with at least:
    - What was detected (e.g. “Pipe temperature in warning/critical range”).
    - Severity.
    - Recommended action (e.g. “Inspect pump”, “Reduce load”, “Schedule maintenance”).
    - Timestamp, asset id.
  - Store in a **JSON file** or **CSV** (e.g. `work-orders.json` / `work-orders.csv`) so judges can see “the system took action.”

- **System 2 (stronger)**  
  Update one more place, e.g.:
  - **Status board**: a simple “Asset status” JSON/CSV (e.g. `pump_1: under_investigation`, `last_alert: 2026-03-13T…`), or  
  - **Inventory / parts**: e.g. “Reserve or suggest part X for this work order” in another file or table.

Implementation options:
- **Frontend-only (simplest):** On threshold breach, JavaScript writes a new row/object to a structure in memory and triggers a **download** of `work-orders.json` (and optionally `status.json`) so “the system created a work order” is visible.
- **Backend (recommended for “real” feel):** Small API (e.g. Node/Express, Python/FastAPI) with POST `/api/work-orders` that appends to `work-orders.json` and optionally updates a status file. Frontend calls this when Decide says Warning/Critical (or when AI says act).

### 4. Explain (must-have)

- After each **Act**, generate a short **summary**:
  - What was detected (e.g. “Temperature exceeded 95°C at Pipe 1”).
  - What decision was made (e.g. “Severity: Critical; AI: dangerous trend”).
  - What action was taken (e.g. “Maintenance work order #3 created; status set to Under investigation”).
- Show this in the UI (e.g. “Last automated response” or “Event log” with the latest entry). Optionally also append to a **report.txt** or include in export.

**AI option for Explain:**  
Instead of fixed template text, call AI: *“Write a 2–3 sentence technician report: we detected [X], decided [Y], and created work order [Z].”* Then show that in the UI and/or save to file.

---

## Suggested tech stack

| Layer | Options | Notes |
|-------|--------|--------|
| **Frontend** | Current: HTML + JS + Tailwind + Chart.js | Keep it. Add a “Work orders” / “Event log” panel and a clear “Last automated response” (Explain) block. |
| **Backend** | Node (Express) or Python (FastAPI/Flask) | One role: receive “create work order” and “update status”; second role: call AI API and return text. Simple REST: e.g. `POST /api/work-orders`, `POST /api/explain` or `POST /api/ai/assess`. |
| **AI** | OpenAI API, Azure OpenAI, or Anthropic | Single endpoint: send recent readings + short prompt; get back one or two sentences for Decide or Explain. |
| **Data** | JSON/CSV files under repo | `sensor-log.json`, `work-orders.json`, `status.json`. No DB required for the demo. |
| **Presentation** | Live demo + 1–2 slides | Show one run: Detect → Decide → Act → Explain, and show the generated work order file and the on-screen summary. |

---

## Presentation tips (from the PDFs)

- **Technical feasibility:** Show the app running end-to-end: sensor → severity → auto work order + (optional) second system → clear explanation.
- **Innovation:** Emphasize “no human in the loop” and where AI is used (Decide or Explain).
- **Impact:** “Prevents island going offline by auto-creating the work order and updating status.”
- **Presentation:** One clear flow diagram (Detect → Decide → Act → Explain) and a short script: “We detect temperature; we decide severity and use AI to assess trend; we act by creating a work order and updating status; we explain in plain English here.”

---

## Minimal additions to your current codebase

1. **Data model**  
   Add (even simulated): `pressure`, `pump_id`, `load_pct` (and optionally flow rate) so “sensor data” matches the prompt.

2. **Work order creation (Act)**  
   On Warning/Critical (or when AI says act):
   - Create an object: `{ id, timestamp, detected_issue, severity, recommended_action, asset_id }`.
   - Append to an in-memory array and (if backend) to `work-orders.json`; or trigger download of `work-orders.json`.

3. **Second system (Act)**  
   e.g. Update a “Pipe/asset status” (e.g. “under_investigation”) in memory and in a `status.json` or CSV.

4. **Explain**  
   After each Act, set a “last event” text (and optionally append to a log) with: what was detected, what was decided, what was done. Show it in the UI.

5. **AI (one step)**  
   Either:
   - **Decide:** “Given these last 10 readings, is this a dangerous trend? One sentence.” → use answer in severity/Act.
   - **Explain:** “Write a 2-sentence technician report for: detected [X], decided [Y], created [Z].” → show in UI.

6. **Chevron logo**  
   ✅ Already added at the top of the UI.

Once these are in place, you have a complete **Detect → Decide → Act → Explain** flow with AI and automatic maintenance work orders, aligned with the Hack Island prompt and ready to demo.
