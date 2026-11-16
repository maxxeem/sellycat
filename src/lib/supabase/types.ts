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
      plans: {
        Row: {
          application_fee_bps: number
          application_fee_fixed: number
          created_at: string
          id: string
          is_public: boolean
          limits: Json
          name: string
          prices: Json
          sort_order: number
          stripe: Json
          trial_days: number
          updated_at: string
        }
        Insert: {
          application_fee_bps?: number
          application_fee_fixed?: number
          created_at?: string
          id: string
          is_public?: boolean
          limits?: Json
          name: string
          prices?: Json
          sort_order?: number
          stripe?: Json
          trial_days?: number
          updated_at?: string
        }
        Update: {
          application_fee_bps?: number
          application_fee_fixed?: number
          created_at?: string
          id?: string
          is_public?: boolean
          limits?: Json
          name?: string
          prices?: Json
          sort_order?: number
          stripe?: Json
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          meta: Json
          target_id: string | null
          target_type: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          meta?: Json
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          meta?: Json
          target_id?: string | null
          target_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: boolean
          signup_mode: Database["public"]["Enums"]["signup_mode"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          signup_mode?: Database["public"]["Enums"]["signup_mode"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          signup_mode?: Database["public"]["Enums"]["signup_mode"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_staff: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["platform_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["platform_role"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          locale: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          locale?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          locale?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenant_domains: {
        Row: {
          created_at: string
          error: string | null
          hostname: string
          id: string
          is_primary: boolean
          kind: Database["public"]["Enums"]["domain_kind"]
          last_checked_at: string | null
          status: Database["public"]["Enums"]["domain_status"]
          tenant_id: string
          updated_at: string
          verification: Json
        }
        Insert: {
          created_at?: string
          error?: string | null
          hostname: string
          id?: string
          is_primary?: boolean
          kind: Database["public"]["Enums"]["domain_kind"]
          last_checked_at?: string | null
          status?: Database["public"]["Enums"]["domain_status"]
          tenant_id: string
          updated_at?: string
          verification?: Json
        }
        Update: {
          created_at?: string
          error?: string | null
          hostname?: string
          id?: string
          is_primary?: boolean
          kind?: Database["public"]["Enums"]["domain_kind"]
          last_checked_at?: string | null
          status?: Database["public"]["Enums"]["domain_status"]
          tenant_id?: string
          updated_at?: string
          verification?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          partner_id: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          partner_id?: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          partner_id?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          billing: Json
          created_at: string
          created_by: string | null
          currency: string
          fee_override_bps: number | null
          fee_override_fixed: number | null
          id: string
          locale: string
          mail_from_name: string | null
          name: string
          plan_id: string
          reply_to: string | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          billing?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          fee_override_bps?: number | null
          fee_override_fixed?: number | null
          id?: string
          locale?: string
          mail_from_name?: string | null
          name: string
          plan_id?: string
          reply_to?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          billing?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          fee_override_bps?: number | null
          fee_override_fixed?: number | null
          id?: string
          locale?: string
          mail_from_name?: string | null
          name?: string
          plan_id?: string
          reply_to?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_tenant: {
        Args: {
          p_locale?: string
          p_name: string
          p_root: string
          p_slug: string
        }
        Returns: string
      }
      has_tenant_role: {
        Args: {
          p_roles: Database["public"]["Enums"]["member_role"][]
          p_tenant: string
        }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      is_tenant_member: { Args: { p_tenant: string }; Returns: boolean }
      my_tenants: {
        Args: never
        Returns: {
          name: string
          role: Database["public"]["Enums"]["member_role"]
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
        }[]
      }
      resolve_shop: {
        Args: { p_host?: string; p_slug?: string }
        Returns: {
          locale: string
          name: string
          primary_host: string
          slug: string
          tenant_id: string
        }[]
      }
      shop_profile: {
        Args: { p_tenant: string }
        Returns: {
          currency: string
          locale: string
          name: string
          slug: string
          tenant_id: string
        }[]
      }
      slug_available: { Args: { p_slug: string }; Returns: boolean }
      tenant_role: {
        Args: { p_tenant: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
    }
    Enums: {
      domain_kind: "subdomain" | "custom"
      domain_status: "pending" | "dns_ok" | "active" | "error"
      member_role: "owner" | "admin" | "editor" | "redeemer" | "partner"
      platform_role: "superadmin" | "support"
      signup_mode: "open" | "paused"
      tenant_status: "trial" | "active" | "suspended" | "closed"
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
      domain_kind: ["subdomain", "custom"],
      domain_status: ["pending", "dns_ok", "active", "error"],
      member_role: ["owner", "admin", "editor", "redeemer", "partner"],
      platform_role: ["superadmin", "support"],
      signup_mode: ["open", "paused"],
      tenant_status: ["trial", "active", "suspended", "closed"],
    },
  },
} as const
