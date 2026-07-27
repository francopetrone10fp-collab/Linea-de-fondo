export type Role = "coordinador" | "instructor" | "arbitro";
export type ProfileStatus = "approved" | "pending";
export type Evaluation = "mala" | "estandar" | "buena" | "relevante";
export type Situation =
  | "Falta personal"
  | "Falta técnica"
  | "Falta antideportiva"
  | "Violación"
  | "Regla"
  | "Mecánica / Posicionamiento"
  | "Tiro libre"
  | "Gestión de partido"
  | "Otro";
export type MaterialType = "pdf" | "word" | "video" | "presentacion" | "enlace" | "otro";
export type WhistleType = "QW" | "IW" | "PW" | "CW";
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
      categories: {
        Row: {
          id: string;
          name: string;
          color: string;
          starter: boolean;
          competition_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          starter?: boolean;
          competition_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      competitions: {
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
        Update: Partial<Database["public"]["Tables"]["competitions"]["Insert"]>;
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          competition_id: string;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Insert"]>;
        Relationships: [];
      };
      partidos: {
        Row: {
          id: string;
          fecha: string | null;
          temporada: string;
          team_local_id: string | null;
          team_visit_id: string | null;
          category_id: string | null;
          competition_id: string | null;
          season_id: string | null;
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
          category_id?: string | null;
          competition_id?: string | null;
          season_id?: string | null;
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
        Row: { id: string; partido_id: string; referee_id: string; confirmed_by: string; confirmed_at: string };
        Insert: {
          id?: string;
          partido_id: string;
          referee_id: string;
          confirmed_by: string;
          confirmed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partido_reads"]["Insert"]>;
        Relationships: [];
      };
      clip_views: {
        Row: { clip_id: string; referee_id: string; viewed_at: string };
        Insert: { clip_id: string; referee_id: string; viewed_at?: string };
        Update: Partial<Database["public"]["Tables"]["clip_views"]["Insert"]>;
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
          whistle_type: WhistleType | null;
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
          whistle_type?: WhistleType | null;
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
