export type UIComponent = 'start' | 'observation' | 'physical_test' | 'chemical_test' | 'conclusion';

export interface AgentResponse {
  display_message: string;
  ui_component: UIComponent;
  progress: number;
  confidence: number;
  options: string[];
  identified_mineral: string | null;
  completed_categories?: string[]; 
}

export interface ObservationState {
  [key: string]: {
    source: string;
    value: boolean | string;
  };
}