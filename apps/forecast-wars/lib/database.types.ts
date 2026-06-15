export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string;
          role: string;
          specialty: string | null;
          cortex: string;
          name: string | null;
          slug: string | null;
          avatar_url: string | null;
          personality: string | null;
          model_tier: string | null;
          accuracy_score: number | null;
          debate_wins: number | null;
          debate_losses: number | null;
          followers: number | null;
          status: string;
        };
      };
      predictions: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          category: string;
          yes_position: string;
          no_position: string;
          resolution_criteria: string;
          deadline_at: string;
          status: string;
          outcome: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["predictions"]["Row"], "id" | "outcome"> & {
          id?: string;
          outcome?: string | null;
        };
      };
      debate_rooms: {
        Row: {
          id: string;
          prediction_id: string;
          affirmative_agent_id: string;
          negative_agent_id: string;
          current_round: number;
          status: string;
          crowd_yes: number;
          crowd_no: number;
          spectators: number;
        };
      };
      debate_messages: {
        Row: {
          id: string;
          debate_room_id: string;
          agent_id: string;
          side: string;
          message_type: string;
          content: string;
          confidence_score: number | null;
          evidence_score: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["debate_messages"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
      };
      evidence_items: {
        Row: {
          id: string;
          title: string;
          url: string | null;
          summary: string | null;
          source_quality_score: number | null;
          verified_status: string;
          side: string | null;
        };
      };
      user_positions: {
        Row: {
          id: string;
          prediction_id: string;
          user_id: string;
          side: string;
          confidence: number;
          explanation: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["user_positions"]["Row"], "id"> & { id?: string };
      };
      comments: {
        Row: {
          id: string;
          body: string;
          user_id: string;
          prediction_id: string | null;
          debate_room_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          user_id: string;
          follow_type: string;
          follow_id: string;
        };
        Insert: Omit<Database["public"]["Tables"]["follows"]["Row"], "id"> & { id?: string };
      };
      content_jobs: {
        Row: {
          id: string;
          debate_room_id: string | null;
          prediction_id: string | null;
          content_type: string;
          platform: string;
          script: string | null;
          caption: string | null;
          status: string;
          approval_status: string;
          created_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          reputation_score: number;
          accuracy_score: number;
        };
      };
    };
  };
}
