export interface SurveyRow {
  id: string;
  timestamp: string;
  exitReasons: string[];
  criticalEvent: string;
  scores: {
    goal: number;
    eval: number;
    collab: number;
    leadership: number;
    growth: number;
  };
  scoreFeedback: {
    goal_problem: string;
    goal_solution: string;
    eval_problem: string;
    eval_solution: string;
    collab_problem: string;
    collab_solution: string;
    leadership_problem: string;
    leadership_solution: string;
    growth_problem: string;
    growth_solution: string;
  };
  enps: number;
  positiveAspect: string;
  changeRequest: string;
  freeText: string;
  department: string;
  name: string;
  position: string;
  tenureRaw: string;
  tenureMonths: number;
}

export interface ImprovementTask {
  id: string;
  title: string;
  description: string;
  linkedProblemId: string;
  priority: 'high' | 'medium' | 'low';
  difficulty: 'high' | 'medium' | 'low';
  expectedEffect: string;
  assignee: string;
  department: string;
  dueDate: string;
  status: 'planned' | 'in_progress' | 'review' | 'done' | 'delayed';
  progress: number;
  comments: { id: string; author: string; text: string; createdAt: string }[];
  resources: { id: string; label: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FilterState {
  department: string;
  position: string;
  tenureRange: [number, number];
  dateRange: [string, string];
}
