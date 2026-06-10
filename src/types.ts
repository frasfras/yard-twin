export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface SessionInfo {
  session_id: string;
  user_id: string;
  loading: boolean;
  error: string | null;
}

export interface Part {
  text: string;
}

export interface NewMessage {
  parts: Part[];
}

export interface RunPayload {
  app_name: string;
  user_id: string;
  session_id: string;
  new_message: NewMessage;
}

export interface Agent {
  id: string;
  name: string;
  version: string;
  description: string;
  appName: string;
  userId: string;
  baseUrl: string;
  iconType: 'cpu' | 'sparkles' | 'terminal' | 'database' | 'code' | 'shield';
  accentColor: string; // e.g. violet, emerald, sky, rose, amber
  status: 'active' | 'inactive' | 'loading';
}

