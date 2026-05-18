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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      evaluations: {
        Row: {
          author_id: string | null
          business_model: number | null
          clarity: number | null
          created_at: string
          financials: number | null
          id: string
          name: string
          pitch: number | null
          status: string | null
          traction: number | null
        }
        Insert: {
          author_id?: string | null
          business_model?: number | null
          clarity?: number | null
          created_at?: string
          financials?: number | null
          id?: string
          name: string
          pitch?: number | null
          status?: string | null
          traction?: number | null
        }
        Update: {
          author_id?: string | null
          business_model?: number | null
          clarity?: number | null
          created_at?: string
          financials?: number | null
          id?: string
          name?: string
          pitch?: number | null
          status?: string | null
          traction?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          status: string | null
          startup_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          status?: string | null
          startup_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          status?: string | null
          startup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          location: string | null
          title: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          location?: string | null
          title: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          location?: string | null
          title?: string
        }
        Relationships: []
      }
      startup_financials: {
        Row: {
          created_at: string | null
          expenses: number | null
          id: string
          month: string
          profit_loss: number | null
          revenue: number | null
          startup_id: string | null
        }
        Insert: {
          created_at?: string | null
          expenses?: number | null
          id?: string
          month: string
          profit_loss?: number | null
          revenue?: number | null
          startup_id?: string | null
        }
        Update: {
          created_at?: string | null
          expenses?: number | null
          id?: string
          month?: string
          profit_loss?: number | null
          revenue?: number | null
          startup_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startup_financials_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_targets: {
        Row: {
          created_at: string | null
          id: string
          month: string
          objective: string
          status: string | null
          startup_id: string | null
          target_value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          objective: string
          status?: string | null
          startup_id?: string | null
          target_value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          objective?: string
          status?: string | null
          startup_id?: string | null
          target_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startup_targets_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          priority: string
          due_date: string | null
          startup_id: string | null
          admin_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          startup_id?: string | null
          admin_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          startup_id?: string | null
          admin_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string | null
          is_read: boolean | null
          link: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string | null
          is_read?: boolean | null
          link?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string | null
          is_read?: boolean | null
          link?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          resource_id: string
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          resource_id: string
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          resource_id?: string
          resource_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          file_name: string
          file_url: string
          id: string
          startup_id: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_url: string
          id?: string
          startup_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_url?: string
          id?: string
          startup_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          id: string
          startup_id: string
          founder_id: string | null
          title: string
          category: string | null
          type: string | null
          status: string | null
          priority: string | null
          is_pinned: boolean | null
          progress: number | null
          deadline: string | null
          created_at: string | null
          updated_at: string | null
          target_value: number | null
          current_value: number | null
        }
        Insert: {
          id?: string
          startup_id: string
          founder_id?: string | null
          title: string
          category?: string | null
          type?: string | null
          status?: string | null
          priority?: string | null
          is_pinned?: boolean | null
          progress?: number | null
          deadline?: string | null
          created_at?: string | null
          updated_at?: string | null
          target_value?: number | null
          current_value?: number | null
        }
        Update: {
          id?: string
          startup_id?: string
          founder_id?: string | null
          title?: string
          category?: string | null
          type?: string | null
          status?: string | null
          priority?: string | null
          is_pinned?: boolean | null
          progress?: number | null
          deadline?: string | null
          created_at?: string | null
          updated_at?: string | null
          target_value?: number | null
          current_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          startup_id: string
          full_name: string
          role: string
          avatar_url: string | null
          linkedin: string | null
          current_focus: string | null
          is_founder: boolean | null
          bio: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          startup_id: string
          full_name: string
          role: string
          avatar_url?: string | null
          linkedin?: string | null
          current_focus?: string | null
          is_founder?: boolean | null
          bio?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          startup_id?: string
          full_name?: string
          role?: string
          avatar_url?: string | null
          linkedin?: string | null
          current_focus?: string | null
          is_founder?: boolean | null
          bio?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_vitals: {
        Row: {
          id: string
          startup_id: string
          founder_id: string | null
          week_start: string
          revenue: number | null
          top_win: string | null
          top_blocker: string | null
          morale: number | null
          next_week_goal: string | null
          priorities: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          startup_id: string
          founder_id?: string | null
          week_start: string
          revenue?: number | null
          top_win?: string | null
          top_blocker?: string | null
          morale?: number | null
          next_week_goal?: string | null
          priorities?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          startup_id?: string
          founder_id?: string | null
          week_start?: string
          revenue?: number | null
          top_win?: string | null
          top_blocker?: string | null
          morale?: number | null
          next_week_goal?: string | null
          priorities?: string[] | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_vitals_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          id: string
          startup_id: string
          founder_id: string | null
          title: string
          source: string | null
          source_id: string | null
          achieved_at: string | null
        }
        Insert: {
          id?: string
          startup_id: string
          founder_id?: string | null
          title: string
          source?: string | null
          source_id?: string | null
          achieved_at?: string | null
        }
        Update: {
          id?: string
          startup_id?: string
          founder_id?: string | null
          title?: string
          source?: string | null
          source_id?: string | null
          achieved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          is_private: boolean | null
          startup_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          startup_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          role: string | null
          startup_id: string | null
          phone_number: string | null
          country: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          startup_id?: string | null
          phone_number?: string | null
          country?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          startup_id?: string | null
          phone_number?: string | null
          country?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          active_users: number | null
          business_model: string | null
          business_type: string | null
          created_at: string
          culture_tags: string[] | null
          currency: string | null
          metric_config: Json | null
          current_stage: string | null
          description: string | null
          founder_id: string | null
          founder_name: string
          id: string
          industry: string | null
          institutional_status: string | null
          is_delayed: boolean | null
          key_results: string | null
          logo_url: string | null
          ltv_cac_ratio: number | null
          mission_statement: string | null
          mom_growth_rate: number | null
          monthly_burn_rate: number | null
          name: string
          north_star_metric_name: string | null
          north_star_metric_value: number | null
          open_ask: string | null
          problem_statement: string | null
          roadmap_text: string | null
          runway_months: number | null
          sector: string | null
          social_links: Json | null
          solution_description: string | null
          strategic_goals: string | null
          target_market: string | null
          updated_at: string
          user_retention: number | null
          value_proposition: string | null
          vision_statement: string | null
          website: string | null
        }
        Insert: {
          active_users?: number | null
          business_model?: string | null
          business_type?: string | null
          created_at?: string
          currency?: string | null
          metric_config?: Json | null
          current_stage?: string | null
          description?: string | null
          founder_id?: string | null
          founder_name: string
          id?: string
          industry?: string | null
          institutional_status?: string | null
          is_delayed?: boolean | null
          key_results?: string | null
          logo_url?: string | null
          ltv_cac_ratio?: number | null
          mission_statement?: string | null
          mom_growth_rate?: number | null
          monthly_burn_rate?: number | null
          name: string
          problem_statement?: string | null
          roadmap_text?: string | null
          runway_months?: number | null
          sector?: string | null
          social_links?: Json | null
          solution_description?: string | null
          strategic_goals?: string | null
          target_market?: string | null
          updated_at?: string
          user_retention?: number | null
          value_proposition?: string | null
          vision_statement?: string | null
          website?: string | null
        }
        Update: {
          active_users?: number | null
          business_model?: string | null
          business_type?: string | null
          created_at?: string
          currency?: string | null
          metric_config?: Json | null
          current_stage?: string | null
          description?: string | null
          founder_id?: string | null
          founder_name?: string
          id?: string
          industry?: string | null
          institutional_status?: string | null
          is_delayed?: boolean | null
          key_results?: string | null
          logo_url?: string | null
          ltv_cac_ratio?: number | null
          mission_statement?: string | null
          mom_growth_rate?: number | null
          monthly_burn_rate?: number | null
          name?: string
          problem_statement?: string | null
          roadmap_text?: string | null
          runway_months?: number | null
          sector?: string | null
          solution_description?: string | null
          strategic_goals?: string | null
          target_market?: string | null
          updated_at?: string
          user_retention?: number | null
          value_proposition?: string | null
          vision_statement?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startups_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      hiring_roles: {
        Row: {
          id: string
          startup_id: string
          role_title: string
          department: string | null
          status: string | null
          priority: string | null
          description_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          startup_id: string
          role_title: string
          department?: string | null
          status?: string | null
          priority?: string | null
          description_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          startup_id?: string
          role_title?: string
          department?: string | null
          status?: string | null
          priority?: string | null
          description_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hiring_roles_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          startup_id: string | null
          user_id: string | null
          type: string | null
          category: string | null
          amount: number
          date: string | null
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          startup_id?: string | null
          user_id?: string | null
          type?: string | null
          category?: string | null
          amount: number
          date?: string | null
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          startup_id?: string | null
          user_id?: string | null
          type?: string | null
          category?: string | null
          amount?: number
          date?: string | null
          description?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      startup_updates: {
        Row: {
          id: string
          startup_id: string | null
          title: string
          content: string
          type: string | null
          is_acknowledged: boolean | null
          admin_feedback: string | null
          created_at: string | null
          author_id: string | null
        }
        Insert: {
          id?: string
          startup_id?: string | null
          title: string
          content: string
          type?: string | null
          is_acknowledged?: boolean | null
          admin_feedback?: string | null
          created_at?: string | null
          author_id?: string | null
        }
        Update: {
          id?: string
          startup_id?: string | null
          title?: string
          content?: string
          type?: string | null
          is_acknowledged?: boolean | null
          admin_feedback?: string | null
          created_at?: string | null
          author_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startup_updates_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "startup_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      pulses: {
        Row: {
          id: string
          startup_id: string
          founder_id: string | null
          month: string
          custom_kpis: Json | null
          mrr: number | null
          expenses: number | null
          cash_in_bank: number | null
          active_users: number | null
          new_users: number | null
          lost_users: number | null
          team_morale: number | null
          team_size: number | null
          win: string | null
          blocker: string | null
          ask: string | null
          fundraising_status: string | null
          spend_salaries: number | null
          spend_infra: number | null
          spend_marketing: number | null
          spend_ops: number | null
          target_mrr: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          startup_id: string
          founder_id?: string | null
          month: string
          custom_kpis?: Json | null
          mrr?: number | null
          expenses?: number | null
          cash_in_bank?: number | null
          active_users?: number | null
          new_users?: number | null
          lost_users?: number | null
          team_morale?: number | null
          team_size?: number | null
          win?: string | null
          blocker?: string | null
          ask?: string | null
          fundraising_status?: string | null
          spend_salaries?: number | null
          spend_infra?: number | null
          spend_marketing?: number | null
          spend_ops?: number | null
          target_mrr?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          startup_id?: string
          founder_id?: string | null
          month?: string
          custom_kpis?: Json | null
          mrr?: number | null
          expenses?: number | null
          cash_in_bank?: number | null
          active_users?: number | null
          new_users?: number | null
          lost_users?: number | null
          team_morale?: number | null
          team_size?: number | null
          win?: string | null
          blocker?: string | null
          ask?: string | null
          fundraising_status?: string | null
          spend_salaries?: number | null
          spend_infra?: number | null
          spend_marketing?: number | null
          spend_ops?: number | null
          target_mrr?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulses_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulses_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
