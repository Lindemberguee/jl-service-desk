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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_components: {
        Row: {
          asset_id: string
          brand: string | null
          component_type: string
          created_at: string
          id: string
          installed_at: string | null
          model: string | null
          notes: string | null
          serial_number: string | null
          specifications: Json | null
          status: string
          stock_item_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          brand?: string | null
          component_type: string
          created_at?: string
          id?: string
          installed_at?: string | null
          model?: string | null
          notes?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string
          stock_item_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          brand?: string | null
          component_type?: string
          created_at?: string
          id?: string
          installed_at?: string | null
          model?: string | null
          notes?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string
          stock_item_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_components_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_components_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_records: {
        Row: {
          asset_id: string
          completed_at: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          observations: string | null
          parts_used: Json | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          technician_id: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["maintenance_type"]
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          asset_id: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          observations?: string | null
          parts_used?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          technician_id?: string | null
          tenant_id: string
          title: string
          type?: Database["public"]["Enums"]["maintenance_type"]
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          asset_id?: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          observations?: string | null
          parts_used?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          technician_id?: string | null
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["maintenance_type"]
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          location_id: string | null
          metadata: Json | null
          name: string
          patrimony_code: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["asset_status"]
          tenant_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          name: string
          patrimony_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          name?: string
          patrimony_code?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_settings: {
        Row: {
          enabled_entities: string[]
          id: string
          retention_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled_entities?: string[]
          id?: string
          retention_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled_entities?: string[]
          id?: string
          retention_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      canvas_board_shares: {
        Row: {
          board_id: string
          created_at: string
          id: string
          permission: string
          shared_by: string
          shared_with_user_id: string
          tenant_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          permission?: string
          shared_by: string
          shared_with_user_id: string
          tenant_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          permission?: string
          shared_by?: string
          shared_with_user_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvas_board_shares_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "canvas_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_board_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_board_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_boards: {
        Row: {
          created_at: string
          edges: Json
          id: string
          name: string
          nodes: Json
          public_share_token: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          version: number
          viewport: Json | null
        }
        Insert: {
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          public_share_token?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          version?: number
          viewport?: Json | null
        }
        Update: {
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          public_share_token?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          version?: number
          viewport?: Json | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          items: Json
          name: string
          tenant_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          name: string
          tenant_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          sector: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["customer_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          sector?: string | null
          tenant_id: string
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          sector?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["customer_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          unit_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      note_shares: {
        Row: {
          created_at: string
          id: string
          note_id: string
          permission: string
          shared_by: string
          shared_with_user_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          permission?: string
          shared_by: string
          shared_with_user_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          permission?: string
          shared_by?: string
          shared_with_user_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          editor_mode: string
          folder: string
          id: string
          is_pinned: boolean
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          editor_mode?: string
          folder?: string
          id?: string
          is_pinned?: boolean
          tags?: string[]
          tenant_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          editor_mode?: string
          folder?: string
          id?: string
          is_pinned?: boolean
          tags?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          icon: string | null
          id: string
          is_read: boolean
          link: string | null
          metadata: Json | null
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          linkedin_url: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          id: string
          is_active?: boolean
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          linkedin_url?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string
          due_at: string | null
          id: string
          is_completed: boolean
          priority: string
          recurrence_end_at: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          due_at?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          recurrence_end_at?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          tags?: string[]
          tenant_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          due_at?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          recurrence_end_at?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          tags?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted: boolean
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          granted?: boolean
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          granted?: boolean
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sla_policies: {
        Row: {
          created_at: string
          id: string
          name: string
          pause_statuses: string[] | null
          rules: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pause_statuses?: string[] | null
          rules?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pause_statuses?: string[] | null
          rules?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          brand: string | null
          component_type: string | null
          created_at: string
          current_level: number | null
          description: string | null
          id: string
          min_level: number | null
          model: string | null
          name: string
          patrimony_code: string | null
          serial_number: string | null
          sku: string | null
          tenant_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          component_type?: string | null
          created_at?: string
          current_level?: number | null
          description?: string | null
          id?: string
          min_level?: number | null
          model?: string | null
          name: string
          patrimony_code?: string | null
          serial_number?: string | null
          sku?: string | null
          tenant_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          component_type?: string | null
          created_at?: string
          current_level?: number | null
          description?: string | null
          id?: string
          min_level?: number | null
          model?: string | null
          name?: string
          patrimony_code?: string | null
          serial_number?: string | null
          sku?: string | null
          tenant_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          qty: number
          reference: string | null
          stock_item_id: string
          tenant_id: string
          type: Database["public"]["Enums"]["stock_movement_type"]
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          qty: number
          reference?: string | null
          stock_item_id: string
          tenant_id: string
          type: Database["public"]["Enums"]["stock_movement_type"]
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          qty?: number
          reference?: string | null
          stock_item_id?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["stock_movement_type"]
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          accent_color: string | null
          created_at: string
          dark_mode_default: boolean | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          plan: Database["public"]["Enums"]["tenant_plan"]
          primary_color: string | null
          show_ratings_to_techs: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          dark_mode_default?: boolean | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          primary_color?: string | null
          show_ratings_to_techs?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          dark_mode_default?: boolean | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          primary_color?: string | null
          show_ratings_to_techs?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          state: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          state?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          permissions: string[] | null
          role: Database["public"]["Enums"]["app_role"]
          team_ids: string[] | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          permissions?: string[] | null
          role?: Database["public"]["Enums"]["app_role"]
          team_ids?: string[] | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          permissions?: string[] | null
          role?: Database["public"]["Enums"]["app_role"]
          team_ids?: string[] | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_memberships_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size: number | null
          storage_key: string | null
          tenant_id: string
          uploaded_by: string | null
          url: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size?: number | null
          storage_key?: string | null
          tenant_id: string
          uploaded_by?: string | null
          url?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size?: number | null
          storage_key?: string | null
          tenant_id?: string
          uploaded_by?: string | null
          url?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_attachments_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_checklist_items: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          is_checked: boolean | null
          label: string
          observation: string | null
          sort_order: number | null
          tenant_id: string
          work_order_id: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean | null
          label: string
          observation?: string | null
          sort_order?: number | null
          tenant_id: string
          work_order_id: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean | null
          label?: string
          observation?: string | null
          sort_order?: number | null
          tenant_id?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_checklist_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_checklist_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          payload: Json | null
          tenant_id: string
          type: Database["public"]["Enums"]["os_event_type"]
          work_order_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          tenant_id: string
          type: Database["public"]["Enums"]["os_event_type"]
          work_order_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["os_event_type"]
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_events_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_labor_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          hours: number
          id: string
          observation: string | null
          rate_per_hour: number
          tenant_id: string
          total: number | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          hours?: number
          id?: string
          observation?: string | null
          rate_per_hour?: number
          tenant_id: string
          total?: number | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          hours?: number
          id?: string
          observation?: string | null
          rate_per_hour?: number
          tenant_id?: string
          total?: number | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_labor_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_labor_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_part_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          observation: string | null
          qty: number
          stock_item_id: string | null
          tenant_id: string
          total: number | null
          unit_price: number
          work_order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          observation?: string | null
          qty?: number
          stock_item_id?: string | null
          tenant_id: string
          total?: number | null
          unit_price?: number
          work_order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          observation?: string | null
          qty?: number
          stock_item_id?: string | null
          tenant_id?: string
          total?: number | null
          unit_price?: number
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_part_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_part_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_part_items_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          asset_id: string | null
          assigned_team_id: string | null
          assigned_to_id: string | null
          category_id: string | null
          closed_at: string | null
          code: string
          created_at: string
          deleted_at: string | null
          description: string | null
          external_link: string | null
          id: string
          labor_cost: number | null
          location_id: string | null
          parts_cost: number | null
          paused_at: string | null
          priority: Database["public"]["Enums"]["os_priority"]
          requester_contact: Json | null
          requester_id: string | null
          requester_user_id: string | null
          resolution_quality: number | null
          resolution_time_rating: number | null
          resolve_due_at: string | null
          resolved_at: string | null
          response_due_at: string | null
          sla_policy_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["os_status"]
          tags: string[] | null
          technical_note: string | null
          tenant_id: string
          title: string
          total_cost: number | null
          total_paused_ms: number | null
          unit_id: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["os_visibility"]
        }
        Insert: {
          asset_id?: string | null
          assigned_team_id?: string | null
          assigned_to_id?: string | null
          category_id?: string | null
          closed_at?: string | null
          code: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          external_link?: string | null
          id?: string
          labor_cost?: number | null
          location_id?: string | null
          parts_cost?: number | null
          paused_at?: string | null
          priority?: Database["public"]["Enums"]["os_priority"]
          requester_contact?: Json | null
          requester_id?: string | null
          requester_user_id?: string | null
          resolution_quality?: number | null
          resolution_time_rating?: number | null
          resolve_due_at?: string | null
          resolved_at?: string | null
          response_due_at?: string | null
          sla_policy_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          tags?: string[] | null
          technical_note?: string | null
          tenant_id: string
          title: string
          total_cost?: number | null
          total_paused_ms?: number | null
          unit_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["os_visibility"]
        }
        Update: {
          asset_id?: string | null
          assigned_team_id?: string | null
          assigned_to_id?: string | null
          category_id?: string | null
          closed_at?: string | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          external_link?: string | null
          id?: string
          labor_cost?: number | null
          location_id?: string | null
          parts_cost?: number | null
          paused_at?: string | null
          priority?: Database["public"]["Enums"]["os_priority"]
          requester_contact?: Json | null
          requester_id?: string | null
          requester_user_id?: string | null
          resolution_quality?: number | null
          resolution_time_rating?: number | null
          resolve_due_at?: string | null
          resolved_at?: string | null
          response_due_at?: string | null
          sla_policy_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          tags?: string[] | null
          technical_note?: string | null
          tenant_id?: string
          title?: string
          total_cost?: number | null
          total_paused_ms?: number | null
          unit_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["os_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_sla_policy_id_fkey"
            columns: ["sla_policy_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_role: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "coordenador"
        | "tecnico"
        | "solicitante"
        | "analista"
        | "leitura"
      asset_status: "ativo" | "inativo" | "em_manutencao" | "descartado"
      customer_type: "internal" | "external"
      maintenance_status:
        | "agendada"
        | "em_andamento"
        | "concluida"
        | "cancelada"
        | "atrasada"
      maintenance_type:
        | "preventiva"
        | "corretiva"
        | "preditiva"
        | "instalacao"
        | "substituicao"
      os_event_type:
        | "created"
        | "assigned"
        | "status_changed"
        | "comment_internal"
        | "comment_public"
        | "attachment_added"
        | "checklist_updated"
        | "time_started"
        | "time_paused"
        | "time_resumed"
        | "resolved"
        | "closed"
        | "reopened"
      os_priority: "baixa" | "media" | "alta" | "critica"
      os_status:
        | "aberta"
        | "triagem"
        | "em_execucao"
        | "aguardando_peca"
        | "aguardando_solicitante"
        | "aguardando_terceiro"
        | "concluida"
        | "aprovada"
        | "encerrada"
        | "reaberta"
      os_visibility: "internal" | "customer"
      stock_movement_type: "in" | "out" | "adjust"
      tenant_plan: "free" | "pro" | "enterprise"
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
      app_role: [
        "super_admin",
        "admin",
        "coordenador",
        "tecnico",
        "solicitante",
        "analista",
        "leitura",
      ],
      asset_status: ["ativo", "inativo", "em_manutencao", "descartado"],
      customer_type: ["internal", "external"],
      maintenance_status: [
        "agendada",
        "em_andamento",
        "concluida",
        "cancelada",
        "atrasada",
      ],
      maintenance_type: [
        "preventiva",
        "corretiva",
        "preditiva",
        "instalacao",
        "substituicao",
      ],
      os_event_type: [
        "created",
        "assigned",
        "status_changed",
        "comment_internal",
        "comment_public",
        "attachment_added",
        "checklist_updated",
        "time_started",
        "time_paused",
        "time_resumed",
        "resolved",
        "closed",
        "reopened",
      ],
      os_priority: ["baixa", "media", "alta", "critica"],
      os_status: [
        "aberta",
        "triagem",
        "em_execucao",
        "aguardando_peca",
        "aguardando_solicitante",
        "aguardando_terceiro",
        "concluida",
        "aprovada",
        "encerrada",
        "reaberta",
      ],
      os_visibility: ["internal", "customer"],
      stock_movement_type: ["in", "out", "adjust"],
      tenant_plan: ["free", "pro", "enterprise"],
    },
  },
} as const
