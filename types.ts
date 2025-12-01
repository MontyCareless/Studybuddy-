export enum AppState {
  SETUP = 'SETUP',
  PROCESSING = 'PROCESSING',
  STUDYING = 'STUDYING',
  FINISHED = 'FINISHED'
}

export enum PartnerMood {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  THINKING = 'thinking',
  CONFUSED = 'confused',
  PROUD = 'proud'
}

export interface KnowledgeNode {
  id: string;
  name: string;
  details?: string;
  children?: KnowledgeNode[];
  completed?: boolean;
  isCurrent?: boolean;
}

export interface StudyMaterial {
  id: string;
  name: string;
  type: 'text' | 'file';
  content: string; // Base64 string (without prefix) or raw text
  mimeType: string;
}

export interface StudyConfig {
  partnerName: string;
  partnerImage: string | null;
  partnerVideo: string | null; // Blob URL for video
  iqLevel: number; // 80 - 180
  personality: string;
  studyDurationMinutes: number;
  materials: StudyMaterial[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'partner';
  text: string;
  timestamp: number;
  type?: 'text' | 'quiz';
  quizOptions?: string[];
  correctAnswer?: number;
}