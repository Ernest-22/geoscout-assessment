"use client";

import { useState } from "react";
import { AgentStatus } from "@/components/AgentStatus";
import { ActionPanel } from "@/components/ActionPanel";
import { Gem } from 'lucide-react';
import { AgentResponse, ObservationState } from "@/types";
import { inferMineral } from "@/lib/offlineInference";

const INITIAL_AGENT_STATE: AgentResponse = {
  display_message: "System Ready. Initialize session to begin identification.",
  ui_component: "start",
  progress: 0,
  confidence: 0,
  options: ["Start Identification"],
  identified_mineral: null,
};

export default function Home() {
  const [agentState, setAgentState] = useState<AgentResponse>(INITIAL_AGENT_STATE);
  const [observation, setObservation] = useState<ObservationState>({});
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  // STATE TRACKING: Determines if we are using the Cloud API or Local Engine
  const [isOffline, setIsOffline] = useState(false);

  const resetSession = () => {
    setAgentState(INITIAL_AGENT_STATE);
    setObservation({});
    setHistory([]);
    setIsOffline(false); // Optimistically try to go online again on reset
  };

  // --- THE "OFFLINE BRAIN" (Deterministic Rule Engine) ---
  const simulateOfflineResponse = (currentObs: ObservationState): AgentResponse => {
    // 1. ANALYZE: Count the evidence
    const evidenceCount = Object.keys(currentObs).length;
    
    // 2. INFER: Check for a strong match immediately
    const result = inferMineral(currentObs);

    // 3. DECIDE: Early Exit Strategy
    if (result && result.confidence > 0.7) { 
      return {
        display_message: `[OFFLINE] Strong Match: ${result.name}`,
        ui_component: "conclusion",
        progress: 100,
        confidence: result.confidence,
        options: [],
        identified_mineral: result.name
      };
    }

    // 4. MERCY RULE: Don't ask more than 6 questions
    if (evidenceCount >= 6) {
      if (result && result.confidence > 0.4) {
        return {
           display_message: `[OFFLINE] Best possible match: ${result.name} (Low Confidence)`,
           ui_component: "conclusion",
           progress: 100,
           confidence: result.confidence,
           options: [],
           identified_mineral: result.name + "?"
        };
      }
      return {
        display_message: "[OFFLINE] Logic Constraints: No matching mineral found in database.",
        ui_component: "conclusion",
        progress: 100,
        confidence: 0.0,
        options: [],
        identified_mineral: "Unknown / Insufficient Data"
      };
    }

    // 5. DETERMINISTIC WORKFLOW (The "Script")
    if (evidenceCount === 0) {
      return {
        display_message: "[OFFLINE] Mode: Deterministic Logic. Observe Color.",
        ui_component: "observation",
        progress: 15,
        confidence: 0.1,
        options: ["Colorless", "White", "Grey", "Black", "Red", "Green", "Yellow", "Gold", "Silver"],
        identified_mineral: null
      };
    }

    if (evidenceCount === 1) {
      return {
        display_message: "[OFFLINE] Color recorded. Observe Luster (Reflection).",
        ui_component: "physical_test",
        progress: 30,
        confidence: 0.2,
        options: ["Glassy", "Metallic", "Pearly", "Dull", "Waxy", "Greasy"],
        identified_mineral: null
      };
    }

    if (evidenceCount === 2) {
      return {
        display_message: "[OFFLINE] Luster recorded. Check Transparency.",
        ui_component: "observation",
        progress: 45,
        confidence: 0.3,
        options: ["Transparent", "Translucent", "Opaque"],
        identified_mineral: null
      };
    }

    if (evidenceCount === 3) {
      return {
        display_message: "[OFFLINE] Check Hardness. Can it scratch glass?",
        ui_component: "physical_test",
        progress: 60,
        confidence: 0.4,
        options: ["Hard (>5.5)", "Soft (<5.5)", "Unsure"],
        identified_mineral: null
      };
    }
    
    if (evidenceCount === 4) {
      return {
        display_message: "[OFFLINE] Perform Streak Test (Rub on ceramic plate).",
        ui_component: "physical_test",
        progress: 75,
        confidence: 0.5,
        options: ["White Streak", "Black Streak", "Red Streak", "Grey Streak", "No Streak", "Unsure"],
        identified_mineral: null
      };
    }

    if (evidenceCount === 5) {
      return {
        display_message: "[OFFLINE] Final check. Observe Crystal Shape or Fracture.",
        ui_component: "observation",
        progress: 90,
        confidence: 0.6,
        options: ["Cubic", "Hexagonal", "Rhombohedral", "Massive", "Conchoidal", "Fibrous", "None"],
        identified_mineral: null
      };
    }

    // Safety Net
    return {
       display_message: "Error: Sequence limit.",
       ui_component: "conclusion",
       progress: 0,
       confidence: 0,
       options: [],
       identified_mineral: "Error"
    };
  };

  const updateAgent = async (
    currentObs: ObservationState, 
    userAction: string, 
    actionType: "add" | "remove"
  ) => {
    setLoading(true);
    
    // Update history with the USER'S move
    const newHistory = [
      ...history,
      { role: 'user', content: `User ${actionType === 'add' ? 'selected' : 'removed'}: ${userAction}` }
    ].slice(-6);

    try {
      // CIRCUIT BREAKER: If already offline, skip the network entirely
      if (isOffline) {
        throw new Error("Force Offline");
      }

      const res = await fetch("/api/identify", {
        method: "POST",
        body: JSON.stringify({
          history: newHistory, 
          current_state: currentObs, 
          action: actionType 
        }),
      });

      if (!res.ok) throw new Error("API Failed");
      
      const data: AgentResponse = await res.json();
      
      // Governance: Truncate long messages
      if (data.display_message.length > 120) {
        data.display_message = data.display_message.slice(0, 117) + "...";
      }

      setAgentState(data);
      setObservation(currentObs);
      setHistory([...newHistory, { role: 'assistant', content: JSON.stringify(data) }]);

    } catch (e) {
      console.warn("Network/API Error - Switching to Offline Demo Mode");
      setIsOffline(true); // <--- THIS UPDATES THE UI BANNER
      
      // Switch to the backup brain
      const offlineData = simulateOfflineResponse(currentObs);
      setAgentState(offlineData);
      setObservation(currentObs);
    } finally {
      setLoading(false);
    }
  };

  const handleSelection = (option: string) => {
    if (agentState.ui_component === 'start') {
      updateAgent({}, "Start Session", "add");
      return;
    }

    const newObs = { 
      ...observation, 
      [option]: { 
        source: agentState.ui_component,
        value: true 
      } 
    };

    updateAgent(newObs, option, "add");
  };

  const handleCorrection = (keyToRemove: string) => {
    const newObs = { ...observation };
    delete newObs[keyToRemove];
    updateAgent(newObs, keyToRemove, "remove");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans relative">
      
      {/* --- HEADER SECTION --- */}
      <div className="mb-8 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="p-4 bg-slate-900 rounded-full border-2 border-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
          <Gem className="h-12 w-12 text-emerald-400" strokeWidth={1.5} />
        </div>
        
        <h1 className="text-white font-black text-3xl mt-4 tracking-[0.15em] uppercase drop-shadow-md">
          GeoScout
        </h1>

        <div className="flex flex-col items-center gap-1 mt-2">
          <h2 className="text-slate-300 text-base font-medium tracking-wide">
            UI-Constrained Field Assistant
          </h2>
          
          {/* THE NETWORK STATUS INDICATOR */}
          <div className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${isOffline ? "bg-amber-900/50 text-amber-200 border border-amber-500/50" : "bg-emerald-900/50 text-emerald-200 border border-emerald-500/50"}`}>
            {isOffline ? "⚠️ Offline Mode" : "● System Online"}
          </div>
        </div>
      </div>
      
      {/* --- AGENT STATUS --- */}
      <AgentStatus 
        message={loading ? "Processing..." : agentState.display_message} 
        confidence={agentState.confidence}
        // Note: Make sure AgentStatus accepts a 'loading' prop if you added the pulse animation!
      />

      {/* --- FIELD NOTES (UNDO SYSTEM) --- */}
      {Object.keys(observation).length > 0 && (
        <div className="w-full max-w-md mb-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
          {Object.entries(observation).map(([key, data]) => (
            <button
              key={key}
              onClick={() => handleCorrection(key)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white text-sm rounded-full border border-slate-600 hover:border-red-500 hover:bg-red-900/30 transition-all group shadow-sm"
              title={`Source: ${data.source}`}
            >
              <span className="font-medium">{key}</span>
              <span className="text-slate-400 group-hover:text-red-400 font-bold">✕</span>
            </button>
          ))}
        </div>
      )}

      {/* --- INTERACTION AREA --- */}
      <div className={`w-full max-w-md bg-slate-900/80 backdrop-blur p-6 rounded-xl border shadow-2xl flex flex-col gap-4 transition-colors duration-500 ${isOffline ? 'border-amber-500/30' : 'border-slate-800'}`}>
        {agentState.ui_component === 'conclusion' ? (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="text-5xl mb-4 drop-shadow-lg">💎</div>
            <h2 className="text-2xl font-bold text-white mb-1">Identification Complete</h2>
            
            <div className="bg-emerald-950/50 border border-emerald-500/30 p-4 rounded-lg mb-6 mt-4">
              <p className="text-2xl text-emerald-400 font-mono tracking-wide">
                {agentState.identified_mineral}
              </p>
            </div>

            <button 
              onClick={resetSession}
              className="w-full py-3 bg-slate-800 text-white rounded hover:bg-slate-700 transition-all border border-slate-600"
            >
              Start New Sample
            </button>
          </div>
        ) : (
          <ActionPanel 
            options={agentState.options} 
            onSelect={handleSelection} 
            disabled={loading}
          />
        )}
      </div>
    </main>
  );
}