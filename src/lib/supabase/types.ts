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
      analytics_daily: {
        Row: {
          count: number
          day: string
          deal_id: string | null
          metric: string
          tenant_id: string
        }
        Insert: {
          count?: number
          day: string
          deal_id?: string | null
          metric: string
          tenant_id: string
        }
        Update: {
          count?: number
          day?: string
          deal_id?: string | null
          metric?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          error: string | null
          id: string
          payload: Json
          status: string
          tenant_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id: string
          payload?: Json
          status: string
          tenant_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          status?: string
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_links: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          tenant_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          tenant_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      code_pool: {
        Row: {
          code: string
          created_at: string
          deal_id: string
          id: string
          tenant_id: string
          voucher_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          deal_id: string
          id?: string
          tenant_id: string
          voucher_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          deal_id?: string
          id?: string
          tenant_id?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_pool_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_pool_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_pool_voucher_fk"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          company: string | null
          country: string | null
          created_at: string
          email: string
          handled_at: string | null
          id: string
          locale: string | null
          message: string
          name: string
          plan_id: string | null
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          handled_at?: string | null
          id?: string
          locale?: string | null
          message: string
          name: string
          plan_id?: string | null
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          handled_at?: string | null
          id?: string
          locale?: string | null
          message?: string
          name?: string
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_alert_sends: {
        Row: {
          alert_id: string
          attempts: number
          error: string | null
          next_at: string
          status: string
          subscriber_id: string
          tenant_id: string
        }
        Insert: {
          alert_id: string
          attempts?: number
          error?: string | null
          next_at?: string
          status?: string
          subscriber_id: string
          tenant_id: string
        }
        Update: {
          alert_id?: string
          attempts?: number
          error?: string | null
          next_at?: string
          status?: string
          subscriber_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_alert_sends_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "deal_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_alert_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "deal_alert_subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_alert_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_alert_subscribers: {
        Row: {
          confirm_count: number
          confirm_hash: string | null
          confirm_sent_at: string | null
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          confirm_count?: number
          confirm_hash?: string | null
          confirm_sent_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          status?: string
          tenant_id: string
          token: string
        }
        Update: {
          confirm_count?: number
          confirm_hash?: string | null
          confirm_sent_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_alert_subscribers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_alert_tick: {
        Row: {
          id: boolean
          token: string | null
          url: string | null
        }
        Insert: {
          id?: boolean
          token?: string | null
          url?: string | null
        }
        Update: {
          id?: boolean
          token?: string | null
          url?: string | null
        }
        Relationships: []
      }
      deal_alerts: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          recipients: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          recipients?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          recipients?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_alerts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: true
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_alerts_tenant_id_fkey"
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
          alert_skip: boolean
          archived_at: string | null
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
          pool_free: number
          price_cents: number
          published_at: string | null
          redeem_days: number | null
          redeem_until: string | null
          redeem_validity: Database["public"]["Enums"]["redeem_validity"]
          redeem_windows: Json
          reserved_qty: number
          sales_end: string | null
          sales_start: string | null
          seo_description: string | null
          seo_noindex: boolean
          seo_title: string | null
          settle_commission_bps: number
          settle_kind: string
          settle_mode: string
          settle_payout_cents: number | null
          show_countdown: boolean
          show_remaining: boolean
          show_stock_bar: boolean
          slug: string
          sold_qty: number
          sort_order: number
          state: Database["public"]["Enums"]["deal_state"]
          subtitle: string | null
          teaser: boolean
          tenant_id: string
          terms: string | null
          title: string
          total_qty: number | null
          updated_at: string
          value_cents: number | null
          view_count: number
        }
        Insert: {
          alert_skip?: boolean
          archived_at?: string | null
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
          pool_free?: number
          price_cents: number
          published_at?: string | null
          redeem_days?: number | null
          redeem_until?: string | null
          redeem_validity?: Database["public"]["Enums"]["redeem_validity"]
          redeem_windows?: Json
          reserved_qty?: number
          sales_end?: string | null
          sales_start?: string | null
          seo_description?: string | null
          seo_noindex?: boolean
          seo_title?: string | null
          settle_commission_bps?: number
          settle_kind?: string
          settle_mode?: string
          settle_payout_cents?: number | null
          show_countdown?: boolean
          show_remaining?: boolean
          show_stock_bar?: boolean
          slug: string
          sold_qty?: number
          sort_order?: number
          state?: Database["public"]["Enums"]["deal_state"]
          subtitle?: string | null
          teaser?: boolean
          tenant_id: string
          terms?: string | null
          title: string
          total_qty?: number | null
          updated_at?: string
          value_cents?: number | null
          view_count?: number
        }
        Update: {
          alert_skip?: boolean
          archived_at?: string | null
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
          pool_free?: number
          price_cents?: number
          published_at?: string | null
          redeem_days?: number | null
          redeem_until?: string | null
          redeem_validity?: Database["public"]["Enums"]["redeem_validity"]
          redeem_windows?: Json
          reserved_qty?: number
          sales_end?: string | null
          sales_start?: string | null
          seo_description?: string | null
          seo_noindex?: boolean
          seo_title?: string | null
          settle_commission_bps?: number
          settle_kind?: string
          settle_mode?: string
          settle_payout_cents?: number | null
          show_countdown?: boolean
          show_remaining?: boolean
          show_stock_bar?: boolean
          slug?: string
          sold_qty?: number
          sort_order?: number
          state?: Database["public"]["Enums"]["deal_state"]
          subtitle?: string | null
          teaser?: boolean
          tenant_id?: string
          terms?: string | null
          title?: string
          total_qty?: number | null
          updated_at?: string
          value_cents?: number | null
          view_count?: number
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
      help_article_history: {
        Row: {
          article_id: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          locale: string
          title: string
        }
        Insert: {
          article_id: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          locale: string
          title: string
        }
        Update: {
          article_id?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          locale?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_history_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_versions: {
        Row: {
          article_id: string
          body: string
          draft_body: string | null
          draft_title: string | null
          draft_updated_at: string | null
          locale: string
          published_at: string | null
          search: unknown
          title: string
          updated_by: string | null
        }
        Insert: {
          article_id: string
          body?: string
          draft_body?: string | null
          draft_title?: string | null
          draft_updated_at?: string | null
          locale: string
          published_at?: string | null
          search?: unknown
          title?: string
          updated_by?: string | null
        }
        Update: {
          article_id?: string
          body?: string
          draft_body?: string | null
          draft_title?: string | null
          draft_updated_at?: string | null
          locale?: string
          published_at?: string | null
          search?: unknown
          title?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category: string
          created_at: string
          id: string
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_feedback: {
        Row: {
          article_id: string
          comment: string | null
          created_at: string
          helpful: boolean
          id: string
          locale: string
          session: string
        }
        Insert: {
          article_id: string
          comment?: string | null
          created_at?: string
          helpful: boolean
          id?: string
          locale: string
          session: string
        }
        Update: {
          article_id?: string
          comment?: string | null
          created_at?: string
          helpful?: boolean
          id?: string
          locale?: string
          session?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_code_uses: {
        Row: {
          code_id: string
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          released_at: string | null
          status: Database["public"]["Enums"]["invite_use_status"]
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          code_id: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          released_at?: string | null
          status?: Database["public"]["Enums"]["invite_use_status"]
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          code_id?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          released_at?: string | null
          status?: Database["public"]["Enums"]["invite_use_status"]
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_code_uses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          disabled_at: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          note: string | null
          plan_id: string | null
          stripe_coupon_id: string | null
          tag: string | null
          trial_days: number | null
          uses: number
          waitlist_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          note?: string | null
          plan_id?: string | null
          stripe_coupon_id?: string | null
          tag?: string | null
          trial_days?: number | null
          uses?: number
          waitlist_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          note?: string | null
          plan_id?: string | null
          stripe_coupon_id?: string | null
          tag?: string | null
          trial_days?: number | null
          uses?: number
          waitlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_waitlist_fk"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          content: string
          content_doc: Json | null
          kind: Database["public"]["Enums"]["legal_kind"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          content_doc?: Json | null
          kind: Database["public"]["Enums"]["legal_kind"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_doc?: Json | null
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
      mail_domains: {
        Row: {
          created_at: string
          domain: string
          error: string | null
          last_checked_at: string | null
          local_part: string
          records: Json
          status: string
          tenant_id: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          error?: string | null
          last_checked_at?: string | null
          local_part?: string
          records?: Json
          status?: string
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          error?: string | null
          last_checked_at?: string | null
          local_part?: string
          records?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          kind: string
          order_id: string | null
          provider_id: string | null
          recipient: string
          sender: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          kind: string
          order_id?: string | null
          provider_id?: string | null
          recipient: string
          sender?: string | null
          status: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          kind?: string
          order_id?: string | null
          provider_id?: string | null
          recipient?: string
          sender?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_log_tenant_id_fkey"
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
          gift: boolean
          gift_email: string | null
          gift_from: string | null
          gift_message: string | null
          gift_name: string | null
          gift_send_on: string | null
          gift_sent_at: string | null
          id: string
          locale: string
          mail_sent_at: string | null
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
          gift?: boolean
          gift_email?: string | null
          gift_from?: string | null
          gift_message?: string | null
          gift_name?: string | null
          gift_send_on?: string | null
          gift_sent_at?: string | null
          id?: string
          locale?: string
          mail_sent_at?: string | null
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
          gift?: boolean
          gift_email?: string | null
          gift_from?: string | null
          gift_message?: string | null
          gift_name?: string | null
          gift_send_on?: string | null
          gift_sent_at?: string | null
          id?: string
          locale?: string
          mail_sent_at?: string | null
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
          google_place_id: string | null
          hours: Json | null
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
          google_place_id?: string | null
          hours?: Json | null
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
          google_place_id?: string | null
          hours?: Json | null
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
      partner_settlement_lines: {
        Row: {
          base_cents: number
          code: string
          commission_cents: number
          corrects: string | null
          deal_id: string | null
          deal_title: string
          id: string
          kind: string
          occurred_at: string
          payout_cents: number
          redemption_id: string | null
          settlement_id: string
          tenant_id: string
          voucher_id: string | null
        }
        Insert: {
          base_cents: number
          code: string
          commission_cents: number
          corrects?: string | null
          deal_id?: string | null
          deal_title: string
          id?: string
          kind: string
          occurred_at: string
          payout_cents: number
          redemption_id?: string | null
          settlement_id: string
          tenant_id: string
          voucher_id?: string | null
        }
        Update: {
          base_cents?: number
          code?: string
          commission_cents?: number
          corrects?: string | null
          deal_id?: string | null
          deal_title?: string
          id?: string
          kind?: string
          occurred_at?: string
          payout_cents?: number
          redemption_id?: string | null
          settlement_id?: string
          tenant_id?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_settlement_lines_corrects_fkey"
            columns: ["corrects"]
            isOneToOne: false
            referencedRelation: "partner_settlement_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_settlement_lines_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_settlement_lines_redemption_id_fkey"
            columns: ["redemption_id"]
            isOneToOne: false
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_settlement_lines_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "partner_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_settlement_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_settlement_lines_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_settlements: {
        Row: {
          base_cents: number
          commission_cents: number
          created_at: string
          created_by: string | null
          currency: string
          finalized_at: string | null
          id: string
          note: string | null
          number: number | null
          paid_at: string | null
          partner: Json
          partner_id: string | null
          payout_cents: number
          period_from: string | null
          period_to: string
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          base_cents?: number
          commission_cents?: number
          created_at?: string
          created_by?: string | null
          currency: string
          finalized_at?: string | null
          id?: string
          note?: string | null
          number?: number | null
          paid_at?: string | null
          partner?: Json
          partner_id?: string | null
          payout_cents?: number
          period_from?: string | null
          period_to: string
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          base_cents?: number
          commission_cents?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          finalized_at?: string | null
          id?: string
          note?: string | null
          number?: number | null
          paid_at?: string | null
          partner?: Json
          partner_id?: string | null
          payout_cents?: number
          period_from?: string | null
          period_to?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_settlements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_settlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          billing: Json
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
          billing?: Json
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
          billing?: Json
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
          application_fee_min: number
          contact_only: boolean
          created_at: string
          id: string
          is_public: boolean
          limits: Json
          marketing: Json
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
          application_fee_min?: number
          contact_only?: boolean
          created_at?: string
          id: string
          is_public?: boolean
          limits?: Json
          marketing?: Json
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
          application_fee_min?: number
          contact_only?: boolean
          created_at?: string
          id?: string
          is_public?: boolean
          limits?: Json
          marketing?: Json
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
          billing: Json
          id: boolean
          invite_reminder_days: number
          signup_mode: Database["public"]["Enums"]["signup_mode"]
          support_notify_email: string | null
          support_notify_staff_ids: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing?: Json
          id?: boolean
          invite_reminder_days?: number
          signup_mode?: Database["public"]["Enums"]["signup_mode"]
          support_notify_email?: string | null
          support_notify_staff_ids?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing?: Json
          id?: boolean
          invite_reminder_days?: number
          signup_mode?: Database["public"]["Enums"]["signup_mode"]
          support_notify_email?: string | null
          support_notify_staff_ids?: string[]
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
      rate_hits: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      redeem_logins: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          tenant_id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          tenant_id: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redeem_logins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          amount_cents: number | null
          api_key_id: string | null
          created_at: string
          id: string
          location_id: string | null
          note: string | null
          partner_id: string | null
          source: Database["public"]["Enums"]["redemption_source"]
          tenant_id: string
          undone_at: string | null
          undone_by: string | null
          user_id: string | null
          voucher_id: string
        }
        Insert: {
          amount_cents?: number | null
          api_key_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          note?: string | null
          partner_id?: string | null
          source?: Database["public"]["Enums"]["redemption_source"]
          tenant_id: string
          undone_at?: string | null
          undone_by?: string | null
          user_id?: string | null
          voucher_id: string
        }
        Update: {
          amount_cents?: number | null
          api_key_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          note?: string | null
          partner_id?: string | null
          source?: Database["public"]["Enums"]["redemption_source"]
          tenant_id?: string
          undone_at?: string | null
          undone_by?: string | null
          user_id?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "partner_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
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
      support_messages: {
        Row: {
          attachment_bytes: number | null
          attachment_name: string | null
          attachment_path: string | null
          author: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          tenant_id: string | null
          ticket_id: string
        }
        Insert: {
          attachment_bytes?: number | null
          attachment_name?: string | null
          attachment_path?: string | null
          author: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          ticket_id: string
        }
        Update: {
          attachment_bytes?: number | null
          attachment_name?: string | null
          attachment_path?: string | null
          author?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          internal_note: string | null
          last_message_at: string
          locale: string
          number: number
          plan_id: string | null
          status: string
          subject: string
          tenant_id: string | null
          tenant_name: string | null
          updated_at: string
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          internal_note?: string | null
          last_message_at?: string
          locale?: string
          number?: number
          plan_id?: string | null
          status?: string
          subject: string
          tenant_id?: string | null
          tenant_name?: string | null
          updated_at?: string
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          internal_note?: string | null
          last_message_at?: string
          locale?: string
          number?: number
          plan_id?: string | null
          status?: string
          subject?: string
          tenant_id?: string | null
          tenant_name?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          active_at: string | null
          created_at: string
          error: string | null
          hostname: string
          id: string
          is_primary: boolean
          kind: Database["public"]["Enums"]["domain_kind"]
          last_checked_at: string | null
          provider: string | null
          status: Database["public"]["Enums"]["domain_status"]
          tenant_id: string
          updated_at: string
          verification: Json
          www: boolean
        }
        Insert: {
          active_at?: string | null
          created_at?: string
          error?: string | null
          hostname: string
          id?: string
          is_primary?: boolean
          kind: Database["public"]["Enums"]["domain_kind"]
          last_checked_at?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["domain_status"]
          tenant_id: string
          updated_at?: string
          verification?: Json
          www?: boolean
        }
        Update: {
          active_at?: string | null
          created_at?: string
          error?: string | null
          hostname?: string
          id?: string
          is_primary?: boolean
          kind?: Database["public"]["Enums"]["domain_kind"]
          last_checked_at?: string | null
          provider?: string | null
          status?: Database["public"]["Enums"]["domain_status"]
          tenant_id?: string
          updated_at?: string
          verification?: Json
          www?: boolean
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
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          name: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          token_hash: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          name?: string | null
          role: Database["public"]["Enums"]["member_role"]
          tenant_id: string
          token_hash?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          tenant_id?: string
          token_hash?: string | null
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
          billing_interval: string | null
          billing_status: string
          cancel_at_period_end: boolean
          created_at: string
          created_by: string | null
          currency: string
          current_period_end: string | null
          deal_alert_at: string | null
          fee_override_bps: number | null
          fee_override_fixed: number | null
          id: string
          invite_code_id: string | null
          locale: string
          mail_from_name: string | null
          name: string
          pending_at: string | null
          pending_interval: string | null
          pending_plan_id: string | null
          plan_id: string
          plan_parent_id: string | null
          reply_to: string | null
          shop_notice: Json
          shop_settings: Json
          shop_state: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id: string | null
          stripe_schedule_id: string | null
          stripe_subscription_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          billing?: Json
          billing_interval?: string | null
          billing_status?: string
          cancel_at_period_end?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          current_period_end?: string | null
          deal_alert_at?: string | null
          fee_override_bps?: number | null
          fee_override_fixed?: number | null
          id?: string
          invite_code_id?: string | null
          locale?: string
          mail_from_name?: string | null
          name: string
          pending_at?: string | null
          pending_interval?: string | null
          pending_plan_id?: string | null
          plan_id?: string
          plan_parent_id?: string | null
          reply_to?: string | null
          shop_notice?: Json
          shop_settings?: Json
          shop_state?: string
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id?: string | null
          stripe_schedule_id?: string | null
          stripe_subscription_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          billing?: Json
          billing_interval?: string | null
          billing_status?: string
          cancel_at_period_end?: boolean
          created_at?: string
          created_by?: string | null
          currency?: string
          current_period_end?: string | null
          deal_alert_at?: string | null
          fee_override_bps?: number | null
          fee_override_fixed?: number | null
          id?: string
          invite_code_id?: string | null
          locale?: string
          mail_from_name?: string | null
          name?: string
          pending_at?: string | null
          pending_interval?: string | null
          pending_plan_id?: string | null
          plan_id?: string
          plan_parent_id?: string | null
          reply_to?: string | null
          shop_notice?: Json
          shop_settings?: Json
          shop_state?: string
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id?: string | null
          stripe_schedule_id?: string | null
          stripe_subscription_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_plan_parent_id_fkey"
            columns: ["plan_parent_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_access: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          device_expires_at: string | null
          device_hash: string | null
          expires_at: string
          id: string
          tenant_id: string
          verified_at: string | null
          voucher_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          device_expires_at?: string | null
          device_hash?: string | null
          expires_at: string
          id?: string
          tenant_id: string
          verified_at?: string | null
          voucher_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          device_expires_at?: string | null
          device_hash?: string | null
          expires_at?: string
          id?: string
          tenant_id?: string
          verified_at?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_access_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_designs: {
        Row: {
          accent: string | null
          layout: string
          note: string | null
          show_image: boolean
          show_locations: boolean
          show_terms: boolean
          size: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accent?: string | null
          layout?: string
          note?: string | null
          show_image?: boolean
          show_locations?: boolean
          show_terms?: boolean
          size?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accent?: string | null
          layout?: string
          note?: string | null
          show_image?: boolean
          show_locations?: boolean
          show_terms?: boolean
          size?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_designs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          barcode_type: Database["public"]["Enums"]["barcode_type"] | null
          code: string
          code_format: Database["public"]["Enums"]["code_format"]
          created_at: string
          deal_id: string | null
          id: string
          order_id: string
          order_item_id: string | null
          partial: boolean
          partner_id: string | null
          redeemed_at: string | null
          remaining_cents: number | null
          reminder_sent_at: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          tenant_id: string
          title: string
          token: string
          valid_until: string | null
          value_cents: number | null
        }
        Insert: {
          barcode_type?: Database["public"]["Enums"]["barcode_type"] | null
          code: string
          code_format: Database["public"]["Enums"]["code_format"]
          created_at?: string
          deal_id?: string | null
          id?: string
          order_id: string
          order_item_id?: string | null
          partial?: boolean
          partner_id?: string | null
          redeemed_at?: string | null
          remaining_cents?: number | null
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          tenant_id: string
          title: string
          token: string
          valid_until?: string | null
          value_cents?: number | null
        }
        Update: {
          barcode_type?: Database["public"]["Enums"]["barcode_type"] | null
          code?: string
          code_format?: Database["public"]["Enums"]["code_format"]
          created_at?: string
          deal_id?: string | null
          id?: string
          order_id?: string
          order_item_id?: string | null
          partial?: boolean
          partner_id?: string | null
          redeemed_at?: string | null
          remaining_cents?: number | null
          reminder_sent_at?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          tenant_id?: string
          title?: string
          token?: string
          valid_until?: string | null
          value_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          company: string | null
          confirm_sent_at: string | null
          confirm_token_hash: string | null
          confirmed_at: string | null
          consent_at: string
          consent_version: string
          created_at: string
          email: string
          id: string
          invite_code_id: string | null
          invited_at: string | null
          locale: string
          message: string | null
          name: string | null
          registered_at: string | null
          reminded_at: string | null
          staff_note: string | null
          status: Database["public"]["Enums"]["waitlist_status"]
          updated_at: string
          use_case: Database["public"]["Enums"]["waitlist_use_case"] | null
          website: string | null
        }
        Insert: {
          company?: string | null
          confirm_sent_at?: string | null
          confirm_token_hash?: string | null
          confirmed_at?: string | null
          consent_at: string
          consent_version: string
          created_at?: string
          email: string
          id?: string
          invite_code_id?: string | null
          invited_at?: string | null
          locale?: string
          message?: string | null
          name?: string | null
          registered_at?: string | null
          reminded_at?: string | null
          staff_note?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
          use_case?: Database["public"]["Enums"]["waitlist_use_case"] | null
          website?: string | null
        }
        Update: {
          company?: string | null
          confirm_sent_at?: string | null
          confirm_token_hash?: string | null
          confirmed_at?: string | null
          consent_at?: string
          consent_version?: string
          created_at?: string
          email?: string
          id?: string
          invite_code_id?: string | null
          invited_at?: string | null
          locale?: string
          message?: string | null
          name?: string | null
          registered_at?: string | null
          reminded_at?: string | null
          staff_note?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
          use_case?: Database["public"]["Enums"]["waitlist_use_case"] | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_designs: {
        Row: {
          background: string | null
          foreground: string | null
          label: string | null
          show_image: boolean
          show_locations: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          background?: string | null
          foreground?: string | null
          label?: string | null
          show_image?: boolean
          show_locations?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          background?: string | null
          foreground?: string | null
          label?: string | null
          show_image?: boolean
          show_locations?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_designs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_devices: {
        Row: {
          device_id: string
          push_token: string
          updated_at: string
        }
        Insert: {
          device_id: string
          push_token: string
          updated_at?: string
        }
        Update: {
          device_id?: string
          push_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_passes: {
        Row: {
          auth_token: string
          created_at: string
          google_object_id: string | null
          tenant_id: string
          updated_at: string
          voucher_id: string
        }
        Insert: {
          auth_token: string
          created_at?: string
          google_object_id?: string | null
          tenant_id: string
          updated_at?: string
          voucher_id: string
        }
        Update: {
          auth_token?: string
          created_at?: string
          google_object_id?: string | null
          tenant_id?: string
          updated_at?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_passes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_passes_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: true
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_registrations: {
        Row: {
          created_at: string
          device_id: string
          tenant_id: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          tenant_id: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          tenant_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_registrations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "wallet_devices"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "wallet_registrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_registrations_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "wallet_passes"
            referencedColumns: ["voucher_id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          endpoint_id: string
          event_id: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_status: number | null
          next_attempt_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          endpoint_id: string
          event_id: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_status?: number | null
          next_attempt_at?: string
          status?: string
          tenant_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          endpoint_id?: string
          event_id?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_status?: number | null
          next_attempt_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          events: string[]
          id: string
          secret: string
          tenant_id: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          events: string[]
          id?: string
          secret: string
          tenant_id: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          events?: string[]
          id?: string
          secret?: string
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          data: Json
          id: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string }
      access_housekeeping: { Args: { p_hours?: number }; Returns: Json }
      api_find_voucher: {
        Args: { p_code: string; p_tenant: string }
        Returns: string
      }
      api_key_auth: {
        Args: { p_hash: string }
        Returns: {
          key_id: string
          scopes: string[]
          tenant_id: string
        }[]
      }
      api_redeem_voucher: {
        Args: {
          p_amount?: number
          p_code: string
          p_key: string
          p_location?: string
          p_note?: string
          p_tenant: string
        }
        Returns: Json
      }
      application_fee: {
        Args: { p_amount: number; p_tenant: string }
        Returns: number
      }
      attach_invite_user: {
        Args: { p_use: string; p_user: string }
        Returns: undefined
      }
      auth_user_id: { Args: { p_email: string }; Returns: string }
      bump_analytics: {
        Args: { p_deal: string; p_metric: string; p_tenant: string }
        Returns: undefined
      }
      can_edit: { Args: { p_tenant: string }; Returns: boolean }
      can_manage: { Args: { p_tenant: string }; Returns: boolean }
      can_redeem: {
        Args: { p_partner: string; p_tenant: string }
        Returns: boolean
      }
      can_see_orders: { Args: { p_tenant: string }; Returns: boolean }
      can_see_ticket: { Args: { p_ticket: string }; Returns: boolean }
      can_use_redeem: { Args: { p_tenant: string }; Returns: boolean }
      claim_invite_code: {
        Args: { p_code: string; p_email: string }
        Returns: string
      }
      clear_pool_codes: { Args: { p_deal: string }; Returns: Json }
      confirm_invite_use: {
        Args: { p_user: string }
        Returns: {
          code_id: string
          plan_id: string
          stripe_coupon_id: string
          trial_days: number
        }[]
      }
      create_settlement: {
        Args: { p_partner: string; p_tenant: string; p_until: string }
        Returns: string
      }
      create_tenant: {
        Args: {
          p_locale?: string
          p_name: string
          p_root: string
          p_slug: string
        }
        Returns: string
      }
      deal_alert_claim: {
        Args: { p_limit: number }
        Returns: {
          alert_id: string
          deal_id: string
          email: string
          subscriber_id: string
          tenant_id: string
          token: string
        }[]
      }
      deal_alert_done: {
        Args: {
          p_alert: string
          p_error?: string
          p_ok: boolean
          p_subscriber: string
        }
        Returns: undefined
      }
      deal_alert_due: { Args: never; Returns: string[] }
      deal_alert_history: {
        Args: { p_tenant: string }
        Returns: {
          created_at: string
          deal_id: string
          failed: number
          id: string
          open: number
          recipients: number
          sent: number
          title: string
        }[]
      }
      deal_alert_live: {
        Args: { d: Database["public"]["Tables"]["deals"]["Row"] }
        Returns: boolean
      }
      deal_alert_start: { Args: never; Returns: number }
      deal_alert_tick_claim: { Args: { p_token: string }; Returns: boolean }
      deal_alert_wake: { Args: never; Returns: undefined }
      deal_has_sales: { Args: { p_deal: string }; Returns: boolean }
      fee_lines: {
        Args: { p_month: string; p_tenant: string }
        Returns: {
          amount_cents: number
          currency: string
          fee_cents: number
          net_fee_cents: number
          number: string
          paid_at: string
          refunded_cents: number
        }[]
      }
      fee_months: {
        Args: { p_months?: number; p_tenant: string }
        Returns: {
          amount_cents: number
          currency: string
          fee_cents: number
          month: string
          orders: number
          refunded_cents: number
        }[]
      }
      find_voucher: {
        Args: { p_code: string; p_tenant: string }
        Returns: string
      }
      find_voucher_by_token: {
        Args: { p_tenant: string; p_token: string }
        Returns: string
      }
      finish_invite_signup: {
        Args: { p_tenant: string; p_user: string }
        Returns: undefined
      }
      fulfil_order: {
        Args: { p_payment_intent: string; p_session: string }
        Returns: string
      }
      gs1_check: { Args: { p_digits: string }; Returns: string }
      has_tenant_role: {
        Args: {
          p_roles: Database["public"]["Enums"]["member_role"][]
          p_tenant: string
        }
        Returns: boolean
      }
      help_search: {
        Args: { p_limit?: number; p_locale: string; p_query: string }
        Returns: {
          category: string
          rank: number
          slug: string
          snippet: string
          title: string
        }[]
      }
      import_pool_codes: {
        Args: { p_codes: string[]; p_deal: string }
        Returns: Json
      }
      in_redeem_window: {
        Args: { p_at: string; p_windows: Json }
        Returns: boolean
      }
      included_shop_room: { Args: never; Returns: number }
      invite_preview: {
        Args: { p_token: string }
        Returns: {
          email_masked: string
          expired: boolean
          open: boolean
          role: Database["public"]["Enums"]["member_role"]
          tenant_name: string
        }[]
      }
      is_staff: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      is_tenant_member: { Args: { p_tenant: string }; Returns: boolean }
      issue_vouchers: { Args: { p_order: string }; Returns: number }
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
      new_voucher_code: {
        Args: {
          p_barcode: Database["public"]["Enums"]["barcode_type"]
          p_format: Database["public"]["Enums"]["code_format"]
        }
        Returns: string
      }
      plan_allows: {
        Args: { p_feature: string; p_tenant: string }
        Returns: boolean
      }
      plan_limit: { Args: { p_key: string; p_tenant: string }; Returns: number }
      plan_shops: { Args: { p_plan: string }; Returns: number }
      platform_analytics: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      random_digits: { Args: { n: number }; Returns: string }
      rate_hit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      record_refund: {
        Args: { p_payment_intent: string; p_refunded: number }
        Returns: string
      }
      redeem_apply: {
        Args: {
          p_amount: number
          p_api_key: string
          p_api_tenant: string
          p_location: string
          p_note: string
          p_source: Database["public"]["Enums"]["redemption_source"]
          p_voucher: string
        }
        Returns: Json
      }
      redeem_login_try: {
        Args: { p_email: string; p_max: number; p_tenant: string }
        Returns: {
          attempts: number
          code_hash: string
          id: string
        }[]
      }
      redeem_user_id: {
        Args: { p_email: string; p_tenant: string }
        Returns: string
      }
      redeem_voucher: {
        Args: {
          p_amount?: number
          p_location?: string
          p_note?: string
          p_source?: Database["public"]["Enums"]["redemption_source"]
          p_voucher: string
        }
        Returns: Json
      }
      release_expired: { Args: { p_deal?: string }; Returns: number }
      release_invite_use: { Args: { p_use: string }; Returns: undefined }
      release_order: { Args: { p_order: string }; Returns: boolean }
      resolve_shop: {
        Args: { p_host?: string; p_slug?: string }
        Returns: {
          locale: string
          name: string
          primary_host: string
          redirect_host: string
          slug: string
          tenant_id: string
        }[]
      }
      restock_order: { Args: { p_order: string }; Returns: boolean }
      set_primary_domain: {
        Args: { p_hostname: string; p_tenant: string }
        Returns: boolean
      }
      settlement_candidates: {
        Args: { p_cutoff: string; p_partner: string; p_tenant: string }
        Returns: {
          base_cents: number
          code: string
          commission_cents: number
          corrects: string
          deal_id: string
          deal_title: string
          kind: string
          occurred_at: string
          partner_id: string
          payout_cents: number
          redemption_id: string
          voucher_id: string
        }[]
      }
      settlement_cutoff: {
        Args: { p_tenant: string; p_until: string }
        Returns: string
      }
      settlement_mark_sent: {
        Args: { p_settlement: string }
        Returns: undefined
      }
      settlement_open: {
        Args: { p_tenant: string; p_until: string }
        Returns: {
          base_cents: number
          commission_cents: number
          has_draft: boolean
          lines: number
          partner_id: string
          partner_name: string
          payout_cents: number
        }[]
      }
      settlement_set_status: {
        Args: { p_settlement: string; p_status: string }
        Returns: undefined
      }
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
          shop_notice: Json
          shop_state: string
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
      team_seats_used: { Args: { p_tenant: string }; Returns: number }
      tenant_analytics: {
        Args: { p_from: string; p_tenant: string; p_to: string }
        Returns: Json
      }
      tenant_is_public: { Args: { p_tenant: string }; Returns: boolean }
      tenant_role: {
        Args: { p_tenant: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      tenant_today: { Args: { p_tenant: string }; Returns: string }
      track_deal_view: { Args: { p_deal: string }; Returns: undefined }
      track_shop_view: { Args: { p_tenant: string }; Returns: undefined }
      undo_redemption: { Args: { p_redemption: string }; Returns: Json }
      void_voucher: { Args: { p_voucher: string }; Returns: Json }
      voucher_access_try: {
        Args: { p_max: number; p_voucher: string }
        Returns: {
          attempts: number
          code_hash: string
          id: string
        }[]
      }
      voucher_code_text: { Args: { p_groups?: number }; Returns: string }
      voucher_owner: {
        Args: { p_token: string }
        Returns: {
          email: string
          tenant_id: string
          voucher_id: string
        }[]
      }
      voucher_partner_hint: {
        Args: { p_code: string; p_tenant: string; p_token: string }
        Returns: string
      }
      voucher_public: {
        Args: { p_token: string }
        Returns: {
          barcode_type: Database["public"]["Enums"]["barcode_type"]
          code: string
          code_format: Database["public"]["Enums"]["code_format"]
          currency: string
          deal_slug: string
          partner_name: string
          remaining_cents: number
          status: Database["public"]["Enums"]["voucher_status"]
          tenant_id: string
          title: string
          valid_until: string
          value_cents: number
        }[]
      }
      voucher_valid_until: {
        Args: {
          d: Database["public"]["Tables"]["deals"]["Row"]
          p_from: string
        }
        Returns: string
      }
      webhook_claim: {
        Args: { p_limit?: number; p_tenant?: string }
        Returns: {
          attempts: number
          created_at: string
          endpoint_id: string
          event_id: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_status: number | null
          next_attempt_at: string
          status: string
          tenant_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      webhook_enqueue: {
        Args: { p_data: Json; p_tenant: string; p_type: string }
        Returns: string
      }
      webhook_order: { Args: { p_order: string }; Returns: Json }
      webhook_prune: { Args: never; Returns: number }
      webhook_redemption: { Args: { p_redemption: string }; Returns: Json }
      webhook_voucher: { Args: { p_voucher: string }; Returns: Json }
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
      invite_use_status: "pending" | "confirmed" | "released"
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
      redemption_source: "dashboard" | "pwa" | "api"
      reservation_status: "active" | "converted" | "released"
      signup_mode: "open" | "invite" | "paused"
      tenant_status: "trial" | "active" | "suspended" | "closed"
      voucher_status: "valid" | "redeemed" | "expired" | "refunded" | "void"
      waitlist_status: "new" | "invited" | "registered" | "rejected"
      waitlist_use_case:
        | "media"
        | "association"
        | "city_tourism"
        | "retail_gastro"
        | "agency"
        | "other"
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
      invite_use_status: ["pending", "confirmed", "released"],
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
      redemption_source: ["dashboard", "pwa", "api"],
      reservation_status: ["active", "converted", "released"],
      signup_mode: ["open", "invite", "paused"],
      tenant_status: ["trial", "active", "suspended", "closed"],
      voucher_status: ["valid", "redeemed", "expired", "refunded", "void"],
      waitlist_status: ["new", "invited", "registered", "rejected"],
      waitlist_use_case: [
        "media",
        "association",
        "city_tourism",
        "retail_gastro",
        "agency",
        "other",
      ],
    },
  },
} as const
