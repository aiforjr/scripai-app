// Hand-written until `supabase gen types typescript --linked` is run against the
// deployed schema (see supabase/migrations/0001_init.sql for the source of truth).

export type AgeBracket = '13-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type Gender = 'female' | 'male' | 'other' | 'prefer_not_to_say' | null;

export interface Profile {
  [key: string]: unknown; // lets this named interface satisfy postgrest-js's Record<string, unknown> constraint
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  image: string | null;
  customer_id: string | null;
  price_id: string | null;
  has_access: boolean;
  age_bracket: AgeBracket | null;
  gender: Gender;
  camera_fear_situation: string | null;
  topic_preferences: string[] | null;
  reminder_time: string | null; // 'HH:mm'
  reminder_days: number[] | null; // 0=Sun..6=Sat
  notifications_enabled: boolean;
  ai_call_enabled: boolean;
  teleprompter_speed: 'slow' | 'medium' | 'fast';
  teleprompter_text_size: 'M' | 'L' | 'XL';
  /** 0..1 fraction, passed straight to the camera's `zoom` prop (1mf "Default zoom"). */
  teleprompter_zoom: number;
  save_to_photos: boolean;
  onboarding_complete: boolean;
  is_premium: boolean;
  current_streak: number;
  longest_streak: number;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  [key: string]: unknown;
  id: string;
  title: string;
  category: string | null;
  active: boolean;
}

export interface DailyScript {
  [key: string]: unknown;
  id: string;
  user_id: string;
  day: string; // date 'YYYY-MM-DD'
  topic_id: string | null;
  topic_title: string;
  script_text: string;
  model: string;
  created_at: string;
}

export interface Recording {
  [key: string]: unknown;
  id: string;
  user_id: string;
  daily_script_id: string;
  day: string;
  storage_path: string;
  duration_seconds: number | null;
  reviewed_audio: boolean;
  reviewed_video: boolean;
  reviewed_both: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface DayCompletion {
  [key: string]: unknown;
  user_id: string;
  day: string;
  recording_id: string | null;
  completed_at: string;
}

/** One day's record of where a user stood on the board. */
export interface RankSnapshot {
  [key: string]: unknown;
  user_id: string;
  day: string;
  rank: number;
  board_size: number;
  points: number;
  current_streak: number;
  created_at: string;
}

/**
 * Rank change over a trailing window, from `fn_rank_movement`.
 * `delta` is positive for improvement — rank 7 → 5 is `delta: 2`.
 */
export interface RankMovement {
  [key: string]: unknown;
  current_rank: number;
  previous_rank: number;
  delta: number;
  board_size: number;
}

export interface LeaderboardRow {
  [key: string]: unknown;
  user_id: string;
  full_name: string | null;
  current_streak: number;
  longest_streak: number;
  points: number;
  rank: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      topics: { Row: Topic; Insert: Partial<Topic>; Update: Partial<Topic>; Relationships: [] };
      daily_scripts: {
        Row: DailyScript;
        Insert: Partial<DailyScript>;
        Update: Partial<DailyScript>;
        Relationships: [];
      };
      recordings: {
        Row: Recording;
        Insert: Partial<Recording>;
        Update: Partial<Recording>;
        Relationships: [];
      };
      day_completions: {
        Row: DayCompletion;
        Insert: Partial<DayCompletion>;
        Update: Partial<DayCompletion>;
        Relationships: [];
      };
      rank_snapshots: {
        Row: RankSnapshot;
        Insert: Partial<RankSnapshot>;
        Update: Partial<RankSnapshot>;
        Relationships: [];
      };
    };
    Views: {
      leaderboard: { Row: LeaderboardRow; Relationships: [] };
    };
    Functions: {
      fn_complete_day: {
        Args: { p_user_id: string; p_day: string; p_recording_id: string };
        Returns: { current_streak: number; longest_streak: number; points: number }[];
      };
      fn_snapshot_rank: {
        Args: { p_user_id: string; p_day: string };
        Returns: undefined;
      };
      fn_rank_movement: {
        Args: { p_user_id: string; p_days?: number };
        Returns: RankMovement[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
