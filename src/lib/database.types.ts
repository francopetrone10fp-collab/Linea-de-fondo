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
export type WhistleType = "QW" | "IW" | "PW" | "CW" | "NCC" | "NCI";
export type EntityType = "partido" | "clip";
export type ClassLevel = "inicial" | "medio_avanzado";
export type Rama = "masculino" | "femenino";
export type DesignacionEstado = "programado" | "confirmar" | "suspendido" | "jugado" | "confirmado";
export type TarifaModo = "por_arbitro" | "total_partido";

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
          designaciones_bell_seen_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          role: Role;
          status?: ProfileStatus;
          photo_url?: string | null;
          referee_id?: string | null;
          created_at?: string;
          designaciones_bell_seen_at?: string | null;
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
          telefono: string | null;
          starter: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          photo_url?: string | null;
          telefono?: string | null;
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
          photo_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          starter?: boolean;
          photo_url?: string | null;
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
          photo_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          starter?: boolean;
          photo_url?: string | null;
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
      class_years: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["class_years"]["Insert"]>;
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          year_id: string;
          title: string;
          video_url: string | null;
          notes: string | null;
          levels: ClassLevel[];
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          year_id: string;
          title: string;
          video_url?: string | null;
          notes?: string | null;
          levels?: ClassLevel[];
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["classes"]["Insert"]>;
        Relationships: [];
      };
      class_clips: {
        Row: {
          id: string;
          class_id: string;
          title: string;
          video_url: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          title: string;
          video_url?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["class_clips"]["Insert"]>;
        Relationships: [];
      };
      class_materials: {
        Row: {
          class_id: string;
          material_id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          class_id: string;
          material_id: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["class_materials"]["Insert"]>;
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
      tarifas_categoria: {
        Row: {
          competencia: string;
          categoria: string;
          modo: TarifaModo;
          monto_arbitro: number;
          monto_ct: number;
          created_at: string;
        };
        Insert: {
          competencia: string;
          categoria: string;
          modo?: TarifaModo;
          monto_arbitro?: number;
          monto_ct?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tarifas_categoria"]["Insert"]>;
        Relationships: [];
      };
      viaticos_localidad: {
        Row: { localidad: string; monto: number; created_at: string };
        Insert: { localidad: string; monto?: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["viaticos_localidad"]["Insert"]>;
        Relationships: [];
      };
      designaciones: {
        Row: {
          id: string;
          jornada: string | null;
          fecha: string | null;
          hora: string | null;
          categoria: string;
          competencia: string | null;
          rama: Rama | null;
          equipo_local: string;
          equipo_visitante: string;
          sede: string | null;
          localidad: string | null;
          estado: DesignacionEstado;
          notas: string | null;
          ct_nombre: string | null;
          ct_monto: number | null;
          requiere_confirmacion: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          jornada?: string | null;
          fecha?: string | null;
          hora?: string | null;
          categoria: string;
          competencia?: string | null;
          rama?: Rama | null;
          equipo_local: string;
          equipo_visitante: string;
          sede?: string | null;
          localidad?: string | null;
          estado?: DesignacionEstado;
          notas?: string | null;
          ct_nombre?: string | null;
          ct_monto?: number | null;
          requiere_confirmacion?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["designaciones"]["Insert"]>;
        Relationships: [];
      };
      designacion_arbitros: {
        Row: { designacion_id: string; posicion: number; referee_id: string; monto: number; publicado: boolean };
        Insert: { designacion_id: string; posicion: number; referee_id: string; monto?: number; publicado?: boolean };
        Update: Partial<Database["public"]["Tables"]["designacion_arbitros"]["Insert"]>;
        Relationships: [];
      };
      designacion_confirmaciones: {
        Row: { designacion_id: string; referee_id: string; confirmed_at: string };
        Insert: { designacion_id: string; referee_id: string; confirmed_at?: string };
        Update: Partial<Database["public"]["Tables"]["designacion_confirmaciones"]["Insert"]>;
        Relationships: [];
      };
      disponibilidades: {
        Row: {
          id: string;
          referee_id: string;
          fecha: string;
          disponible: boolean;
          categorias: string[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          referee_id: string;
          fecha: string;
          disponible?: boolean;
          categorias?: string[];
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["disponibilidades"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: { id: string; profile_id: string; endpoint: string; p256dh: string; auth: string; created_at: string };
        Insert: { id?: string; profile_id: string; endpoint: string; p256dh: string; auth: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      referee_club_exclusions: {
        Row: { referee_id: string; team_id: string; created_at: string };
        Insert: { referee_id: string; team_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["referee_club_exclusions"]["Insert"]>;
        Relationships: [];
      };
      designaciones_externas: {
        Row: {
          id: string;
          referee_id: string;
          fecha: string;
          hora: string | null;
          competencia: string | null;
          categoria: string | null;
          descripcion: string;
          monto: number;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referee_id: string;
          fecha: string;
          hora?: string | null;
          competencia?: string | null;
          categoria?: string | null;
          descripcion: string;
          monto?: number;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["designaciones_externas"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      designaciones_companeros: {
        Args: { p_designacion_ids: string[] };
        Returns: { designacion_id: string; referee_id: string; referee_name: string; posicion: number }[];
      };
      recalcular_montos_designaciones: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      recalcular_confirmacion_designacion: {
        Args: { p_designacion_id: string };
        Returns: undefined;
      };
    };
  };
}
