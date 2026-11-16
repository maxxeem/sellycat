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
      buyers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          newsletter_opt_in_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          newsletter_opt_in_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          newsletter_opt_in_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_images: {
        Row: {
          alt: string | null
          created_at: string
          deal_id: string
          height: number | null
          id: string
          sort_order: number
          tenant_id: string
          url: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          deal_id: string
          height?: number | null
          id?: string
          sort_order?: number
          tenant_id: string
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          deal_id?: string
          height?: number | null
          id?: string
          sort_order?: number
          tenant_id?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_images_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_images_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_locations: {
        Row: {
          deal_id: string
          location_id: string
          tenant_id: string
        }
        Insert: {
          deal_id: string
          location_id: string
          tenant_id: string
        }
        Update: {
          deal_id?: string
          location_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_locations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "partner_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          barcode_type: Database["public"]["Enums"]["barcode_type"] | null
          category_id: string | null
          code_format: Database["public"]["Enums"]["code_format"]
          code_source: Database["public"]["Enums"]["code_source"]
          compare_at_cents: number | null
          created_at: string
          deal_type: Database["public"]["Enums"]["deal_type"]
          description: Json
          faq: Json
          featured: boolean
          id: string
          max_per_buyer: number | null
          max_per_order: number | null
          partial_redemption: boolean
          partner_id: string | null
          price_cents: number
          published_at: string | null
          redeem_days: number | null
          redeem_until: string | null
          redeem_validity: Database["public"]["Enums"]["redeem_validity"]
          redeem_windows: Json
          reserved_qty: number
          sales_end: string | null
          sales_start: string | null
          show_countdown: boolean
          show_remaining: boolean
          show_stock_bar: boolean
          slug: string
          sold_qty: number
          sort_order: number
          state: Database["public"]["Enums"]["deal_state"]
          subtitle: string | null
          tenant_id: string
          terms: string | null
          title: string
          total_qty: number | null
          updated_at: string
          value_cents: number | null
        }
        Insert: {
          barcode_type?: Database["public"]["Enums"]["barcode_type"] | null
          category_id?: string | null
          code_format?: Database["public"]["Enums"]["code_format"]
          code_source?: Database["public"]["Enums"]["code_source"]
          compare_at_cents?: number | null
          created_at?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          description?: Json
          faq?: Json
          featured?: boolean
          id?: string
          max_per_buyer?: number | null
          max_per_order?: number | null
          partial_redemption?: boolean
          partner_id?: string | null
          price_cents: number
          published_at?: string | null
          redeem_days?: number | null
          redeem_until?: string | null
          redeem_validity?: Database["public"]["Enums"]["redeem_validity"]
          redeem_windows?: Json
          reserved_qty?: number
          sales_end?: string | null
          sales_start?: string | null
          show_countdown?: boolean
          show_remaining?: boolean
          show_stock_bar?: boolean
          slug: string
          sold_qty?: number
          sort_order?: number
          state?: Database["public"]["Enums"]["deal_state"]
          subtitle?: string | null
          tenant_id: string
          terms?: string | null
          title: string
          total_qty?: number | null
          updated_at?: string
          value_cents?: number | null
        }
        Update: {
          barcode_type?: Database["public"]["Enums"]["barcode_type"] | null
          category_id?: string | null
          code_format?: Database["public"]["Enums"]["code_format"]
          code_source?: Database["public"]["Enums"]["code_source"]
          compare_at_cents?: number | null
          created_at?: string
          deal_type?: Database["public"]["Enums"]["deal_type"]
          description?: Json
          faq?: Json
          featured?: boolean
          id?: string
          max_per_buyer?: number | null
          max_per_order?: number | null
          partial_redemption?: boolean
          partner_id?: string | null
          price_cents?: number
          published_at?: string | null
          redeem_days?: number | null
          redeem_until?: string | null
          redeem_validity?: Database["public"]["Enums"]["redeem_validity"]
          redeem_windows?: Json
          reserved_qty?: number
          sales_end?: string | null
          sales_start?: string | null
          show_countdown?: boolean
          show_remaining?: boolean
          show_stock_bar?: boolean
          slug?: string
          sold_qty?: number
          sort_order?: number
          state?: Database["public"]["Enums"]["deal_state"]
          subtitle?: string | null
          tenant_id?: string
          terms?: string | null
          title?: string
          total_qty?: number | null
          updated_at?: string
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string
          kind: Database["public"]["Enums"]["legal_kind"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          kind: Database["public"]["Enums"]["legal_kind"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          kind?: Database["public"]["Enums"]["legal_kind"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_pages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          deal_id: string | null
          id: string
          order_id: string
          qty: number
          tenant_id: string
          title: string
          total_cents: number
          unit_cents: number
        }
        Insert: {
          deal_id?: string | null
          id?: string
          order_id: string
          qty: number
          tenant_id: string
          title: string
          total_cents: number
          unit_cents: number
        }
        Update: {
          deal_id?: string | null
          id?: string
          order_id?: string
          qty?: number
          tenant_id?: string
          title?: string
          total_cents?: number
          unit_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          buyer_id: string
          created_at: string
          currency: string
          email: string
          fee_cents: number
          id: string
          locale: string
          name: string | null
          newsletter: boolean
          number: string
          oversold: boolean
          paid_at: string | null
          refunded_cents: number
          restocked: boolean
          status: Database["public"]["Enums"]["order_status"]
          stripe_account_id: string | null
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          created_at?: string
          currency: string
          email: string
          fee_cents?: number
          id?: string
          locale?: string
          name?: string | null
          newsletter?: boolean
          number: string
          oversold?: boolean
          paid_at?: string | null
          refunded_cents?: number
          restocked?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          stripe_account_id?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          email?: string
          fee_cents?: number
          id?: string
          locale?: string
          name?: string | null
          newsletter?: boolean
          number?: string
          oversold?: boolean
          paid_at?: string | null
          refunded_cents?: number
          restocked?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          stripe_account_id?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_locations: {
        Row: {
          city: string | null
          country: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          opening_hours: string | null
          partner_id: string
          street: string | null
          tenant_id: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          opening_hours?: string | null
          partner_id: string
          street?: string | null
          tenant_id: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          opening_hours?: string | null
          partner_id?: string
          street?: string | null
          tenant_id?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_locations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      processed_events: {
        Row: {
          account: string | null
          created_at: string
          error: string | null
          id: string
          status: string
          type: string
        }
        Insert: {
          account?: string | null
          created_at?: string
          error?: string | null
          id: string
          status: string
          type: string
        }
        Update: {
          account?: string | null
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          type?: string
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
      reservations: {
        Row: {
          created_at: string
          deal_id: string
          email: string
          expires_at: string
          id: string
          order_id: string
          qty: number
          status: Database["public"]["Enums"]["reservation_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          email: string
          expires_at: string
          id?: string
          order_id: string
          qty: number
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          email?: string
          expires_at?: string
          id?: string
          order_id?: string
          qty?: number
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_themes: {
        Row: {
          draft: Json
          published: Json
          published_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          draft?: Json
          published?: Json
          published_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          draft?: Json
          published?: Json
          published_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_themes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_accounts: {
        Row: {
          account_id: string
          business_name: string | null
          charges_enabled: boolean
          connected_at: string
          country: string | null
          default_currency: string | null
          details_submitted: boolean
          livemode: boolean
          payouts_enabled: boolean
          requirements: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          business_name?: string | null
          charges_enabled?: boolean
          connected_at?: string
          country?: string | null
          default_currency?: string | null
          details_submitted?: boolean
          livemode?: boolean
          payouts_enabled?: boolean
          requirements?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          business_name?: string | null
          charges_enabled?: boolean
          connected_at?: string
          country?: string | null
          default_currency?: string | null
          details_submitted?: boolean
          livemode?: boolean
          payouts_enabled?: boolean
          requirements?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "tenant_members_partner_fk"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
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
          shop_settings: Json
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
          shop_settings?: Json
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
          shop_settings?: Json
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
      application_fee: {
        Args: { p_amount: number; p_tenant: string }
        Returns: number
      }
      can_edit: { Args: { p_tenant: string }; Returns: boolean }
      can_manage: { Args: { p_tenant: string }; Returns: boolean }
      can_see_orders: { Args: { p_tenant: string }; Returns: boolean }
      create_tenant: {
        Args: {
          p_locale?: string
          p_name: string
          p_root: string
          p_slug: string
        }
        Returns: string
      }
      fulfil_order: {
        Args: { p_payment_intent: string; p_session: string }
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
      record_refund: {
        Args: { p_payment_intent: string; p_refunded: number }
        Returns: string
      }
      release_expired: { Args: { p_deal?: string }; Returns: number }
      release_order: { Args: { p_order: string }; Returns: boolean }
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
      restock_order: { Args: { p_order: string }; Returns: boolean }
      shop_legal_complete: { Args: { p_tenant: string }; Returns: boolean }
      shop_profile: {
        Args: { p_tenant: string }
        Returns: {
          currency: string
          legal_complete: boolean
          locale: string
          name: string
          payments_ready: boolean
          primary_host: string
          settings: Json
          slug: string
          tenant_id: string
          theme: Json
        }[]
      }
      slug_available: { Args: { p_slug: string }; Returns: boolean }
      start_checkout: {
        Args: {
          p_deal: string
          p_email: string
          p_locale: string
          p_minutes?: number
          p_name: string
          p_newsletter: boolean
          p_qty: number
        }
        Returns: {
          amount_cents: number
          currency: string
          expires_at: string
          fee_cents: number
          order_id: string
          order_number: string
          title: string
          unit_cents: number
        }[]
      }
      tenant_is_public: { Args: { p_tenant: string }; Returns: boolean }
      tenant_role: {
        Args: { p_tenant: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
    }
    Enums: {
      barcode_type:
        | "ean13"
        | "ean8"
        | "upca"
        | "code128"
        | "code39"
        | "itf14"
        | "datamatrix"
        | "pdf417"
      code_format: "qr" | "numeric" | "barcode"
      code_source: "generated" | "pool"
      deal_state: "draft" | "published" | "ended"
      deal_type: "fixed" | "value"
      domain_kind: "subdomain" | "custom"
      domain_status: "pending" | "dns_ok" | "active" | "error"
      legal_kind: "imprint" | "terms" | "privacy"
      member_role: "owner" | "admin" | "editor" | "redeemer" | "partner"
      order_status:
        | "pending"
        | "paid"
        | "partially_refunded"
        | "refunded"
        | "expired"
      platform_role: "superadmin" | "support"
      redeem_validity: "none" | "until_date" | "days_after_purchase"
      reservation_status: "active" | "converted" | "released"
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
      barcode_type: [
        "ean13",
        "ean8",
        "upca",
        "code128",
        "code39",
        "itf14",
        "datamatrix",
        "pdf417",
      ],
      code_format: ["qr", "numeric", "barcode"],
      code_source: ["generated", "pool"],
      deal_state: ["draft", "published", "ended"],
      deal_type: ["fixed", "value"],
      domain_kind: ["subdomain", "custom"],
      domain_status: ["pending", "dns_ok", "active", "error"],
      legal_kind: ["imprint", "terms", "privacy"],
      member_role: ["owner", "admin", "editor", "redeemer", "partner"],
      order_status: [
        "pending",
        "paid",
        "partially_refunded",
        "refunded",
        "expired",
      ],
      platform_role: ["superadmin", "support"],
      redeem_validity: ["none", "until_date", "days_after_purchase"],
      reservation_status: ["active", "converted", "released"],
      signup_mode: ["open", "paused"],
      tenant_status: ["trial", "active", "suspended", "closed"],
    },
  },
} as const
