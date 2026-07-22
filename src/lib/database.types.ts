export type Role = "coordinador" | "instructor" | "arbitro";
export type ProfileStatus = "approved" | "pending";
export type Evaluation = "mala" | "estandar" | "buena" | "relevante";
export type Situation =
  | "Falta personal"
  | "Falta técnica"
  | "Falta antideportiva"
  | "Violación"
  | "Mecánica / Posicionamiento"
  | "Tiro libre"
  | "Gestión de partido"
  | "Otro";
export type MaterialType = "pdf" | "word" | "video" | "presentacion" | "enlace" | "otro";
export type EntityType = "partido" | "clip";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: Role;
          status: ProfileStatus;
          photo_url: string | null;
          referee_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role: Role;
          status?: ProfileStatus;
          photo_url?: string | null;
          referee_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      referees: {
        Row: {
          id: string;
          name: string;
          color: string;
          photo_url: string | null;
          starter: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          photo_url?: string | null;
          starter?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["referees"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          color: string;
          starter: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          starter?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      partidos: {
        Row: {
          id: string;
          fecha: string | null;
          temporada: string;
          team_local_id: string | null;
          team_visit_id: string | null;
          competition: string | null;
          notes: string | null;
          finalized_by: string | null;
          finalized_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha?: string | null;
          team_local_id?: string | null;
          team_visit_id?: string | null;
          competition?: string | null;
          notes?: string | null;
          finalized_by?: string | null;
          finalized_at?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partidos"]["Insert"]>;
        Relationships: [];
      };
      partido_referees: {
        Row: { partido_id: string; referee_id: string; position: number };
        Insert: { partido_id: string; referee_id: string; position: number };
        Update: Partial<Database["public"]["Tables"]["partido_referees"]["Insert"]>;
        Relationships: [];
      };
      partido_reads: {
        Row: { partido_id: string; referee_id: string; confirmed_by: string; confirmed_at: string };
        Insert: {
          partido_id: string;
          referee_id: string;
          confirmed_by: string;
          confirmed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partido_reads"]["Insert"]>;
        Relationships: [];
      };
      clips: {
        Row: {
          id: string;
          partido_id: string;
          title: string;
          video_url: string | null;
          situation: Situation;
          quarter: string;
          clock: string | null;
          referee_id: string | null;
          notes: string | null;
          evaluation: Evaluation | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          partido_id: string;
          title: string;
          video_url?: string | null;
          situation: Situation;
          quarter?: string;
          clock?: string | null;
          referee_id?: string | null;
          notes?: string | null;
          evaluation?: Evaluation | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clips"]["Insert"]>;
        Relationships: [];
      };
      materials: {
        Row: {
          id: string;
          title: string;
          type: MaterialType;
          url: string;
          description: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          type: MaterialType;
          url: string;
          description?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["materials"]["Insert"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          entity_type: EntityType;
          entity_id: string;
          author_id: string | null;
          author_name: string;
          author_role: Role;
          text: string;
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          entity_type: EntityType;
          entity_id: string;
          author_id?: string | null;
          author_name: string;
          author_role: Role;
          text: string;
          created_at?: string;
          edited_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
