# 💎 GeoScout: UI-Constrained Agentic Field Assistant

## Deloitte GenAI Assessment — Option 1 Submission

---

## 🌍 Executive Summary

**GeoScout** is a UI-Constrained Decision Support System designed to assist geologists in identifying minerals in the field.

Instead of following the traditional free-text chatbot paradigm, GeoScout enforces a strict, state-driven workflow:
**Visual Observation $\to$ Physical Tests $\to$ Conclusion**

This approach prioritizes **safety**, **determinism**, **auditability**, and **field usability**, making the system suitable for real-world deployment rather than just conversational demos.

---

## ⭐ Key Differentiators

**Why this submission stands out*

### 1. 🧠 Dual-Brain Architecture (Online + Offline)

GeoScout does not rely solely on an LLM.

* **Primary Brain:** LLM-powered reasoning via Groq API.
* **Fallback Brain:** A Deterministic Rule Engine (`offlineInference.ts`).

> **Resilience:** If connectivity is lost or no API key is provided, the system **automatically degrades** to offline logic — ensuring continued functionality in zero-connectivity environments.

### 2. 🛡️ Defensive Governance ("Defense in Depth")

Safety and reliability constraints are enforced at multiple layers:

* **Server-Side (System Prompt):**
  * Enforced JSON schema
  * Loop-prevention rules
  * Deterministic UI transitions

* **Client-Side:**
  * 120-character display limit.
    * Truncation safeguards.
    * Invalid state prevention.

### 3. 🔄 Resilient State Management

Users can correct prior observations (e.g., removing "Pink" from Color) without restarting the session. This demonstrates **non-linear state control** and robust memory handling, far exceeding simple linear chat flows.

---

## 🚀 Quick Start

### Prerequisites

* Node.js 18+

### Step 1. : Install Dependencies

Run this command to install the core framework and UI libraries:

```bash
npm install

```

### Step 2. : Configure Environment

The app requires an API key for the "Online Mode" to work.

1. Find the file named .env.example in the root folder.

2. Rename it to .env.local.

3. Open the file and paste your Groq API Key.

   * Don't have a key? Get a free one instantly here: ```<https://console.groq.com/keys>```

Note: If you skip this step, the app will simply launch in Offline Mode (which is a supported feature).

## Step 3: Run the App

```bash
npm run dev
```

Open your browser to:```http://localhost:3000```

## 🏗️ System Architecture

**(Requirement: UI2 vs Agent vs Memory State Model)*

GeoScout separates concerns into three explicit state layers to ensure stability and auditability.

| Layer | Responsibility | Implementation Details |
|------|---------------|------------------------|
| **Memory State** | Source of truth for accumulated evidence. | `ObservationState` in `page.tsx`. Stores `{ value, source }`, enabling precise undo and correction operations. |
| **Agent State** | Decision engine governing valid UI transitions. | Stateless API (`route.ts`). Receives the full memory snapshot and returns a strictly typed JSON directive. |
| **UI State** | Presentation layer. Renders only permitted interactions. | React components (`ActionPanel`, `AgentStatus`). UI is reactive and non-authoritative. |

## ⚠️ Failure Scenario & Recovery

**(Requirement: Failure handling demonstration)*

* **Scenario: Loss of Connectivity Mid-Identification.**

1. Context: A user has already identified Color: Pink and Luster: Glassy.
2. Failure: The user selects "Transparency: Transparent", but the API request fails (Timeout / 500 error).
3. Recovery Flow:

* ```updateAgent``` catches the network error.
* ```isOffline``` flag is set to ```true```.
* Offline Banner is rendered.
* Current Memory State is passed to ```offlineInference.ts```.
* Local rule engine identifies the mineral (e.g., Quartz).
* UI proceeds without interruption.

* **Result**: The system gracefully degrades from AI Assistant $\to$ Expert Rule System. No crashes. No data loss.

### 🚫 Why Not a Plain Text Chatbot?

**(Requirement: Analysis of Chat vs UI Constraints)*

A standard chatbot interface would fail critical safety and usability requirements:

* **❌ Ambiguity & Hallucination**
  * Chat: Free text like "It looks shiny" forces guesswork.

    * GeoScout: UI forces explicit geological terms (Glassy, Metallic, Dull).

* **❌ Safety Violations**
  * Chat: Users can ask unsafe questions ("Can I taste it?", "What if I smash it?").

  * GeoScout: Physically prevents unsafe actions by never rendering those options.

* **❌ Poor Field Usability**
  * Chat: Typing on a touchscreen in sunlight with dirty hands is impractical.

    * GeoScout: Uses large, high-contrast tap targets suitable for field conditions.

* **❌ State Corruption**
  * Chat: Users can provide contradictions ("It's red... actually blue").

    * GeoScout: Enforces single-value keys (Color is Red OR Blue — never both).

## 📊 Interaction Diagrams

### 1. Dual-Brain Control Loop

*How the system switches between Online and Offline brains.*

```mermaid
sequenceDiagram
    participant User
    participant UI as Next.js Client
    participant Controller as State Controller
    participant LLM as API Route (Online)
    participant Local as Rule Engine (Offline)

    User->>UI: Selects "Color: Pink"
    UI->>Controller: Update Observation State
    
    alt Network Available
        Controller->>LLM: POST /api/identify
        LLM-->>Controller: AgentResponse
    else Network Failure
        Controller->>Controller: Enable Offline Mode
        Controller->>Local: inferMineral(state)
        Local-->>Controller: Deterministic Response
    end

    Controller-->>UI: Render Next Panel
    
```

## 2. State Machine Transition

**How the Agent governs the workflow.*

```mermaid
stateDiagram-v2
    [*] --> Start
    Start --> Observation

    state "Data Collection Loop" as Loop {
        Observation --> PhysicalTest
        PhysicalTest --> ChemicalTest
        ChemicalTest --> Observation
    }

    Loop --> Conclusion
    Conclusion --> Start

    note right of Loop
        User can delete
        observations at
        any time.
    end note

```

## 📸 Screenshots

### 1. Main Interface

Clean, centered UI with confidence meter and field notes.  
![Main Interface](./screenshots/online_flow.png)

### 2. Offline Mode

Graceful degradation banner with uninterrupted workflow.  
![Offline Mode](./screenshots/offline_mode.png)

## 🛠️ Key Engineering Decisions

* **Next.js API Routes**: Chosen over Server Actions for explicit HTTP status control and compatibility with the Groq SDK.

* **Strict JSON Mode**: The System Prompt enforces ```response_format: { type: "json_object" }``` to guarantee that the UI never breaks due to malformed LLM text.

* **Universal Escape Hatches**: Every question generated by the Agent (Online or Offline) includes a "Negative" option (e.g., "No Cleavage", "Unsure"), preventing the "Constraint Trap" where a user cannot answer truthfully.
