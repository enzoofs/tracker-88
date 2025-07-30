export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      carga_historico: {
        Row: {
          created_at: string | null
          data_evento: string | null
          detalhes: Json | null
          evento: string | null
          fonte: string | null
          id: number
          numero_carga: number
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          data_evento?: string | null
          detalhes?: Json | null
          evento?: string | null
          fonte?: string | null
          id?: number
          numero_carga: number
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          data_evento?: string | null
          detalhes?: Json | null
          evento?: string | null
          fonte?: string | null
          id?: number
          numero_carga?: number
          tipo?: string | null
        }
        Relationships: []
      }
      carga_sales_orders: {
        Row: {
          created_at: string | null
          id: string
          item_count: number | null
          numero_carga: number | null
          so_number: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_count?: number | null
          numero_carga?: number | null
          so_number?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_count?: number | null
          numero_carga?: number | null
          so_number?: string | null
          status?: string | null
        }
        Relationships: []
      }
      cargas: {
        Row: {
          created_at: string | null
          data_chegada_prevista: string | null
          data_chegada_real: string | null
          data_consolidacao: string | null
          data_embarque_prevista: string | null
          data_embarque_real: string | null
          data_liberacao: string | null
          data_prevista_chegada: string | null
          hawb: string | null
          id: string
          invoices: Json | null
          mawb: string | null
          numero_carga: number
          processo_globex: string | null
          status: string | null
          tipo_temperatura: string | null
          updated_at: string | null
          wr_reference: string | null
        }
        Insert: {
          created_at?: string | null
          data_chegada_prevista?: string | null
          data_chegada_real?: string | null
          data_consolidacao?: string | null
          data_embarque_prevista?: string | null
          data_embarque_real?: string | null
          data_liberacao?: string | null
          data_prevista_chegada?: string | null
          hawb?: string | null
          id?: string
          invoices?: Json | null
          mawb?: string | null
          numero_carga: number
          processo_globex?: string | null
          status?: string | null
          tipo_temperatura?: string | null
          updated_at?: string | null
          wr_reference?: string | null
        }
        Update: {
          created_at?: string | null
          data_chegada_prevista?: string | null
          data_chegada_real?: string | null
          data_consolidacao?: string | null
          data_embarque_prevista?: string | null
          data_embarque_real?: string | null
          data_liberacao?: string | null
          data_prevista_chegada?: string | null
          hawb?: string | null
          id?: string
          invoices?: Json | null
          mawb?: string | null
          numero_carga?: number
          processo_globex?: string | null
          status?: string | null
          tipo_temperatura?: string | null
          updated_at?: string | null
          wr_reference?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          contato_principal: string | null
          created_at: string | null
          email_principal: string | null
          emails_adicionais: string | null
          id: number
          nome_cliente: string
          notificar_email: boolean | null
          notificar_whatsapp: boolean | null
          preferencias: Json | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          contato_principal?: string | null
          created_at?: string | null
          email_principal?: string | null
          emails_adicionais?: string | null
          id?: number
          nome_cliente: string
          notificar_email?: boolean | null
          notificar_whatsapp?: boolean | null
          preferencias?: Json | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          contato_principal?: string | null
          created_at?: string | null
          email_principal?: string | null
          emails_adicionais?: string | null
          id?: number
          nome_cliente?: string
          notificar_email?: boolean | null
          notificar_whatsapp?: boolean | null
          preferencias?: Json | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      envios_processados: {
        Row: {
          cliente: string
          created_at: string | null
          data_envio: string | null
          data_processamento: string | null
          data_ultima_atualizacao: string | null
          erp_order: string | null
          id: number
          produtos: string | null
          sales_order: string
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
          cliente: string
          created_at?: string | null
          data_envio?: string | null
          data_processamento?: string | null
          data_ultima_atualizacao?: string | null
          erp_order?: string | null
          id?: number
          produtos?: string | null
          sales_order: string
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
          cliente?: string
          created_at?: string | null
          data_envio?: string | null
          data_processamento?: string | null
          data_ultima_atualizacao?: string | null
          erp_order?: string | null
          id?: number
          produtos?: string | null
          sales_order?: string
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
          created_at: string | null
          id: number
          is_internal: boolean | null
          mensagem: string | null
          numero_carga: number | null
          prioridade: string | null
          sent_at: string | null
          status: string | null
          tipo: string | null
          tipo_notificacao: string | null
          titulo: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_internal?: boolean | null
          mensagem?: string | null
          numero_carga?: number | null
          prioridade?: string | null
          sent_at?: string | null
          status?: string | null
          tipo?: string | null
          tipo_notificacao?: string | null
          titulo?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_internal?: boolean | null
          mensagem?: string | null
          numero_carga?: number | null
          prioridade?: string | null
          sent_at?: string | null
          status?: string | null
          tipo?: string | null
          tipo_notificacao?: string | null
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
          enviado_em: string | null
          id: number
          mensagem: string | null
          prioridade: string | null
          sales_order: string | null
          status: string | null
          tentativas: number | null
          tipo_notificacao: string | null
          titulo: string | null
          ultimo_erro: string | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string | null
          data_evento?: string | null
          detalhes?: Json | null
          enviado_em?: string | null
          id?: number
          mensagem?: string | null
          prioridade?: string | null
          sales_order?: string | null
          status?: string | null
          tentativas?: number | null
          tipo_notificacao?: string | null
          titulo?: string | null
          ultimo_erro?: string | null
        }
        Update: {
          cliente?: string | null
          created_at?: string | null
          data_evento?: string | null
          detalhes?: Json | null
          enviado_em?: string | null
          id?: number
          mensagem?: string | null
          prioridade?: string | null
          sales_order?: string | null
          status?: string | null
          tentativas?: number | null
          tipo_notificacao?: string | null
          titulo?: string | null
          ultimo_erro?: string | null
        }
        Relationships: []
      }
      shipment_history: {
        Row: {
          created_at: string | null
          data_evento: string | null
          detalhes: Json | null
          evento: string
          fonte: string | null
          id: number
          sales_order: string
        }
        Insert: {
          created_at?: string | null
          data_evento?: string | null
          detalhes?: Json | null
          evento: string
          fonte?: string | null
          id?: number
          sales_order: string
        }
        Update: {
          created_at?: string | null
          data_evento?: string | null
          detalhes?: Json | null
          evento?: string
          fonte?: string | null
          id?: number
          sales_order?: string
        }
        Relationships: []
      }
      tracking_master: {
        Row: {
          cliente: string
          created_at: string | null
          data_chegada_armazem: string | null
          data_chegada_brasil: string | null
          data_embarque: string | null
          data_entrada_producao: string | null
          data_entrega_cliente: string | null
          data_expedicao: string | null
          data_liberacao: string | null
          data_pedido: string | null
          data_saida_fornecedor: string | null
          end_user: string | null
          erp_order: string | null
          etapa_logistica: string | null
          fonte_ultima_atualizacao: string | null
          id: number
          observacoes: string | null
          pay_auth: string | null
          pedido_compra: string | null
          pi_name: string | null
          produtos: string | null
          proposta: string | null
          ref_id: string | null
          representante: string | null
          sales_order: string
          shipped_from: string | null
          shipped_to: string | null
          status_atual: string | null
          tracking_numbers: string | null
          updated_at: string | null
          valor_total: number | null
          web_order: string | null
        }
        Insert: {
          cliente: string
          created_at?: string | null
          data_chegada_armazem?: string | null
          data_chegada_brasil?: string | null
          data_embarque?: string | null
          data_entrada_producao?: string | null
          data_entrega_cliente?: string | null
          data_expedicao?: string | null
          data_liberacao?: string | null
          data_pedido?: string | null
          data_saida_fornecedor?: string | null
          end_user?: string | null
          erp_order?: string | null
          etapa_logistica?: string | null
          fonte_ultima_atualizacao?: string | null
          id?: number
          observacoes?: string | null
          pay_auth?: string | null
          pedido_compra?: string | null
          pi_name?: string | null
          produtos?: string | null
          proposta?: string | null
          ref_id?: string | null
          representante?: string | null
          sales_order: string
          shipped_from?: string | null
          shipped_to?: string | null
          status_atual?: string | null
          tracking_numbers?: string | null
          updated_at?: string | null
          valor_total?: number | null
          web_order?: string | null
        }
        Update: {
          cliente?: string
          created_at?: string | null
          data_chegada_armazem?: string | null
          data_chegada_brasil?: string | null
          data_embarque?: string | null
          data_entrada_producao?: string | null
          data_entrega_cliente?: string | null
          data_expedicao?: string | null
          data_liberacao?: string | null
          data_pedido?: string | null
          data_saida_fornecedor?: string | null
          end_user?: string | null
          erp_order?: string | null
          etapa_logistica?: string | null
          fonte_ultima_atualizacao?: string | null
          id?: number
          observacoes?: string | null
          pay_auth?: string | null
          pedido_compra?: string | null
          pi_name?: string | null
          produtos?: string | null
          proposta?: string | null
          ref_id?: string | null
          representante?: string | null
          sales_order?: string
          shipped_from?: string | null
          shipped_to?: string | null
          status_atual?: string | null
          tracking_numbers?: string | null
          updated_at?: string | null
          valor_total?: number | null
          web_order?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_envios_pendentes_tracking: {
        Row: {
          cliente: string | null
          created_at: string | null
          data_envio: string | null
          data_processamento: string | null
          data_ultima_atualizacao: string | null
          erp_order: string | null
          id: number | null
          produtos: string | null
          sales_order: string | null
          status: string | null
          status_atual: string | null
          status_cliente: string | null
          tracking_numbers: string | null
          tracking_status: string | null
          ultima_localizacao: string | null
          updated_at: string | null
          valor_total: number | null
          web_order: string | null
        }
        Relationships: []
      }
      v_envios_resumo: {
        Row: {
          clientes: string | null
          data_envio: string | null
          total_clientes: number | null
          total_pedidos: number | null
          valor_total_dia: number | null
        }
        Relationships: []
      }
      v_status_consolidado: {
        Row: {
          cliente: string | null
          created_at: string | null
          data_ultima_atualizacao: string | null
          ordem_status: number | null
          produtos: string | null
          sales_order: string | null
          status_interno: string | null
          status_publico: string | null
          tracking_numbers: string | null
          ultima_localizacao: string | null
          updated_at: string | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string | null
          data_ultima_atualizacao?: string | null
          ordem_status?: never
          produtos?: string | null
          sales_order?: string | null
          status_interno?: string | null
          status_publico?: string | null
          tracking_numbers?: string | null
          ultima_localizacao?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente?: string | null
          created_at?: string | null
          data_ultima_atualizacao?: string | null
          ordem_status?: never
          produtos?: string | null
          sales_order?: string | null
          status_interno?: string | null
          status_publico?: string | null
          tracking_numbers?: string | null
          ultima_localizacao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_next_job: {
        Args: {
          p_queue_name: string
          p_worker_id: string
          p_lock_duration?: number
        }
        Returns: {
          id: string
          queue_name: string
          job_type: string
          payload: Json
          attempts: number
        }[]
      }
      mapear_status_cliente: {
        Args: { status_interno: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
