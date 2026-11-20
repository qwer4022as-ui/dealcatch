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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          id: number
          name: string
          name_normalized: string | null
        }
        Insert: {
          id?: never
          name: string
          name_normalized?: string | null
        }
        Update: {
          id?: never
          name?: string
          name_normalized?: string | null
        }
        Relationships: []
      }
      collection_attempts: {
        Row: {
          attempted_at: string
          duration_ms: number | null
          error_detail: string | null
          http_status: number | null
          id: number
          listing_id: number
          outcome: Database["public"]["Enums"]["attempt_outcome"]
          run_id: number | null
        }
        Insert: {
          attempted_at?: string
          duration_ms?: number | null
          error_detail?: string | null
          http_status?: number | null
          id?: never
          listing_id: number
          outcome: Database["public"]["Enums"]["attempt_outcome"]
          run_id?: number | null
        }
        Update: {
          attempted_at?: string
          duration_ms?: number | null
          error_detail?: string | null
          http_status?: number | null
          id?: never
          listing_id?: number
          outcome?: Database["public"]["Enums"]["attempt_outcome"]
          run_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_attempts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_attempts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_health"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "collection_attempts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "collection_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_runs: {
        Row: {
          failed: number
          finished_at: string | null
          id: number
          platform_id: number
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
          succeeded: number
          total: number
          trigger: Database["public"]["Enums"]["run_trigger"]
        }
        Insert: {
          failed?: number
          finished_at?: string | null
          id?: never
          platform_id: number
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          succeeded?: number
          total?: number
          trigger: Database["public"]["Enums"]["run_trigger"]
        }
        Update: {
          failed?: number
          finished_at?: string | null
          id?: never
          platform_id?: number
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          succeeded?: number
          total?: number
          trigger?: Database["public"]["Enums"]["run_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "collection_runs_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_variants: {
        Row: {
          external_option_id: string | null
          id: number
          is_active: boolean
          listing_id: number
          option_label_raw: string
          product_variant_id: number | null
        }
        Insert: {
          external_option_id?: string | null
          id?: never
          is_active?: boolean
          listing_id: number
          option_label_raw: string
          product_variant_id?: number | null
        }
        Update: {
          external_option_id?: string | null
          id?: never
          is_active?: boolean
          listing_id?: number
          option_label_raw?: string
          product_variant_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_variants_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_variants_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "v_listing_health"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_variants_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          consecutive_failures: number
          created_at: string
          external_id: string
          id: number
          platform_id: number
          product_id: number
          status: Database["public"]["Enums"]["listing_status"]
          title_on_platform: string | null
          url: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          external_id: string
          id?: never
          platform_id: number
          product_id: number
          status?: Database["public"]["Enums"]["listing_status"]
          title_on_platform?: string | null
          url: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          external_id?: string
          id?: never
          platform_id?: number
          product_id?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title_on_platform?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          base_url: string | null
          code: string
          collect_interval_minutes: number | null
          collection_mode: Database["public"]["Enums"]["collection_mode"]
          id: number
          is_paused: boolean
          name: string
          policy_note: string | null
          policy_reviewed_at: string | null
        }
        Insert: {
          base_url?: string | null
          code: string
          collect_interval_minutes?: number | null
          collection_mode?: Database["public"]["Enums"]["collection_mode"]
          id?: never
          is_paused?: boolean
          name: string
          policy_note?: string | null
          policy_reviewed_at?: string | null
        }
        Update: {
          base_url?: string | null
          code?: string
          collect_interval_minutes?: number | null
          collection_mode?: Database["public"]["Enums"]["collection_mode"]
          id?: never
          is_paused?: boolean
          name?: string
          policy_note?: string | null
          policy_reviewed_at?: string | null
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          product_id: number
          target_price: number | null
          updated_at: string
        }
        Insert: {
          product_id: number
          target_price?: number | null
          updated_at?: string
        }
        Update: {
          product_id?: number
          target_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_snapshots: {
        Row: {
          attempt_id: number
          collected_at: string
          created_at: string
          currency: string
          id: number
          is_void: boolean
          list_price: number | null
          listing_variant_id: number
          member_price: number | null
          sale_price: number
          source: Database["public"]["Enums"]["price_source"]
          stock_status: Database["public"]["Enums"]["stock_status"]
          void_reason: string | null
        }
        Insert: {
          attempt_id: number
          collected_at: string
          created_at?: string
          currency?: string
          id?: never
          is_void?: boolean
          list_price?: number | null
          listing_variant_id: number
          member_price?: number | null
          sale_price: number
          source: Database["public"]["Enums"]["price_source"]
          stock_status?: Database["public"]["Enums"]["stock_status"]
          void_reason?: string | null
        }
        Update: {
          attempt_id?: number
          collected_at?: string
          created_at?: string
          currency?: string
          id?: never
          is_void?: boolean
          list_price?: number | null
          listing_variant_id?: number
          member_price?: number | null
          sale_price?: number
          source?: Database["public"]["Enums"]["price_source"]
          stock_status?: Database["public"]["Enums"]["stock_status"]
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "collection_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_snapshots_listing_variant_id_fkey"
            columns: ["listing_variant_id"]
            isOneToOne: false
            referencedRelation: "listing_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string
          color_code: string | null
          id: number
          product_id: number
          size: string
          sku: string | null
        }
        Insert: {
          color?: string
          color_code?: string | null
          id?: never
          product_id: number
          size?: string
          sku?: string | null
        }
        Update: {
          color?: string
          color_code?: string | null
          id?: never
          product_id?: number
          size?: string
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: number
          category: string | null
          created_at: string
          id: number
          is_sample: boolean
          model_no: string | null
          name: string
        }
        Insert: {
          brand_id: number
          category?: string | null
          created_at?: string
          id?: never
          is_sample?: boolean
          model_no?: string | null
          name: string
        }
        Update: {
          brand_id?: number
          category?: string | null
          created_at?: string
          id?: never
          is_sample?: boolean
          model_no?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_latest_price: {
        Row: {
          collected_at: string | null
          list_price: number | null
          listing_variant_id: number | null
          sale_price: number | null
          source: Database["public"]["Enums"]["price_source"] | null
          stock_status: Database["public"]["Enums"]["stock_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_listing_variant_id_fkey"
            columns: ["listing_variant_id"]
            isOneToOne: false
            referencedRelation: "listing_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_listing_health: {
        Row: {
          consecutive_failures: number | null
          failures_since_success: number | null
          last_attempt_at: string | null
          last_outcome: Database["public"]["Enums"]["attempt_outcome"] | null
          last_success_at: string | null
          listing_id: number | null
          status: Database["public"]["Enums"]["listing_status"] | null
        }
        Relationships: []
      }
      v_variant_price_summary: {
        Row: {
          first_collected_at: string | null
          has_sample: boolean | null
          last_collected_at: string | null
          listing_variant_id: number | null
          low_at: string | null
          low_first_at: string | null
          low_price: number | null
          record_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_snapshots_listing_variant_id_fkey"
            columns: ["listing_variant_id"]
            isOneToOne: false
            referencedRelation: "listing_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      purge_sample_data: { Args: never; Returns: Json }
      record_manual_prices: {
        Args: { p_collected_at: string; p_items: Json; p_listing_id: number }
        Returns: number
      }
      record_manual_prices_batch: {
        Args: { p_collected_at: string; p_listings: Json }
        Returns: number
      }
      register_product_listings: {
        Args: {
          p_brand_name: string
          p_category: string
          p_listings: Json
          p_model_no: string
          p_product_name: string
        }
        Returns: Json
      }
    }
    Enums: {
      attempt_outcome:
        | "success"
        | "http_error"
        | "blocked"
        | "not_found"
        | "parse_error"
        | "timeout"
        | "policy_disabled"
        | "unknown"
      collection_mode: "disabled" | "manual" | "sample" | "api" | "crawl"
      listing_status: "active" | "paused" | "not_found" | "ended"
      price_source: "sample" | "manual" | "api" | "crawl"
      run_status: "running" | "succeeded" | "partial" | "failed"
      run_trigger: "cron" | "manual" | "seed"
      stock_status: "in_stock" | "low" | "sold_out" | "unknown"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      attempt_outcome: [
        "success",
        "http_error",
        "blocked",
        "not_found",
        "parse_error",
        "timeout",
        "policy_disabled",
        "unknown",
      ],
      collection_mode: ["disabled", "manual", "sample", "api", "crawl"],
      listing_status: ["active", "paused", "not_found", "ended"],
      price_source: ["sample", "manual", "api", "crawl"],
      run_status: ["running", "succeeded", "partial", "failed"],
      run_trigger: ["cron", "manual", "seed"],
      stock_status: ["in_stock", "low", "sold_out", "unknown"],
    },
  },
} as const
