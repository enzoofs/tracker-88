export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      carga_historico: {
        Row: {
          created_at: string | null
          data_evento: string | null
          descricao: string | null
          evento: string
          id: string
          localizacao: string | null
          numero_carga: string
        }
        Insert: {
          created_at?: string | null
          data_evento?: string | null
          descricao?: string | null
          evento: string
          id?: string
          localizacao?: string | null
          numero_carga: string
        }
        Update: {
          created_at?: string | null
          data_evento?: string | null
          descricao?: string | null
          evento?: string
          id?: string
          localizacao?: string | null
          numero_carga?: string
        }
        Relationships: []
      }
      carga_sales_orders: {
        Row: {
          created_at: string | null
          id: string
          numero_carga: string
          so_number: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          numero_carga: string
          so_number: string
        }
        Update: {
          created_at?: string | null
          id?: string
          numero_carga?: string
          so_number?: string
        }
        Relationships: []
      }
      cargas: {
        Row: {
          created_at: string | null
          data_chegada_prevista: string | null
          data_embarque: string | null
          destino: string | null
          hawb: string | null
          id: string
          mawb: string | null
          numero_carga: string
          origem: string | null
          status: string | null
          tipo_temperatura: string | null
          transportadora: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_chegada_prevista?: string | null
          data_embarque?: string | null
          destino?: string | null
          hawb?: string | null
          id?: string
          mawb?: string | null
          numero_carga: string
          origem?: string | null
          status?: string | null
          tipo_temperatura?: string | null
          transportadora?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_chegada_prevista?: string | null
          data_embarque?: string | null
          destino?: string | null
          hawb?: string | null
          id?: string
          mawb?: string | null
          numero_carga?: string
          origem?: string | null
          status?: string | null
          tipo_temperatura?: string | null
          transportadora?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string | null
          endereco: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clientes_contact_info: {
        Row: {
          cliente_id: string
          created_at: string | null
          email: string | null
          id: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_contact_info_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_assignments: {
        Row: {
          cliente_nome: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          cliente_nome: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          cliente_nome?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      envios_processados: {
        Row: {
          carrier: string | null
          cliente: string
          created_at: string | null
          data_envio: string | null
          data_ultima_atualizacao: string | null
          erp_order: string | null
          id: string
          is_at_warehouse: boolean | null
          is_delivered: boolean | null
          produtos: Json | null
          sales_order: string
          ship_to: string | null
          status: string | null
          status_atual: string | null
          status_cliente: string | null
          tracking_numbers: string | null
          ultima_localizacao: string | null
          updated_at: string | null
          valor_total: number | null
          web_order: string | null
        }
        Insert: {
          carrier?: string | null
          cliente: string
          created_at?: string | null
          data_envio?: string | null
          data_ultima_atualizacao?: string | null
          erp_order?: string | null
          id?: string
          is_at_warehouse?: boolean | null
          is_delivered?: boolean | null
          produtos?: Json | null
          sales_order: string
          ship_to?: string | null
          status?: string | null
          status_atual?: string | null
          status_cliente?: string | null
          tracking_numbers?: string | null
          ultima_localizacao?: string | null
          updated_at?: string | null
          valor_total?: number | null
          web_order?: string | null
        }
        Update: {
          carrier?: string | null
          cliente?: string
          created_at?: string | null
          data_envio?: string | null
          data_ultima_atualizacao?: string | null
          erp_order?: string | null
          id?: string
          is_at_warehouse?: boolean | null
          is_delivered?: boolean | null
          produtos?: Json | null
          sales_order?: string
          ship_to?: string | null
          status?: string | null
          status_atual?: string | null
          status_cliente?: string | null
          tracking_numbers?: string | null
          ultima_localizacao?: string | null
          updated_at?: string | null
          valor_total?: number | null
          web_order?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          cliente: string | null
          created_at: string | null
          enviado_em: string | null
          id: string
          mensagem: string | null
          sales_order: string | null
          tipo: string | null
          titulo: string | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string | null
          enviado_em?: string | null
          id?: string
          mensagem?: string | null
          sales_order?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Update: {
          cliente?: string | null
          created_at?: string | null
          enviado_em?: string | null
          id?: string
          mensagem?: string | null
          sales_order?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          cliente: string | null
          created_at: string | null
          data_evento: string | null
          detalhes: Json | null
          id: number
          mensagem: string
          prioridade: string | null
          sales_order: string | null
          status: string | null
          tipo_notificacao: string
          titulo: string
        }
        Insert: {
          cliente?: string | null
          created_at?: string | null
          data_evento?: string | null
          detalhes?: Json | null
          id?: number
          mensagem: string
          prioridade?: string | null
          sales_order?: string | null
          status?: string | null
          tipo_notificacao: string
          titulo: string
        }
        Update: {
          cliente?: string | null
          created_at?: string | null
          data_evento?: string | null
          detalhes?: Json | null
          id?: number
          mensagem?: string
          prioridade?: string | null
          sales_order?: string | null
          status?: string | null
          tipo_notificacao?: string
          titulo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shipment_history: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          sales_order: string
          status: string
          timestamp: string | null
          tracking_number: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          sales_order: string
          status: string
          timestamp?: string | null
          tracking_number?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          sales_order?: string
          status?: string
          timestamp?: string | null
          tracking_number?: string | null
        }
        Relationships: []
      }
      tracking_master: {
        Row: {
          created_at: string | null
          id: string
          numero_carga: string | null
          sales_order: string | null
          status: string | null
          tipo: string | null
          tracking_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          numero_carga?: string | null
          sales_order?: string | null
          status?: string | null
          tipo?: string | null
          tracking_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          numero_carga?: string | null
          sales_order?: string | null
          status?: string | null
          tipo?: string | null
          tracking_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
