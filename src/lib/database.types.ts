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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      customer_returns: {
        Row: {
          back_to_stock: string
          created_at: number
          deleted_at: number | null
          id: string
          note: string | null
          qty: number
          refund_amount: number
          returned_at: number
          sale_id: string
          synced_at: number
          updated_at: number
        }
        Insert: {
          back_to_stock: string
          created_at: number
          deleted_at?: number | null
          id: string
          note?: string | null
          qty: number
          refund_amount: number
          returned_at: number
          sale_id: string
          synced_at?: number
          updated_at: number
        }
        Update: {
          back_to_stock?: string
          created_at?: number
          deleted_at?: number | null
          id?: string
          note?: string | null
          qty?: number
          refund_amount?: number
          returned_at?: number
          sale_id?: string
          synced_at?: number
          updated_at?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          at: number
          created_at: number
          deleted_at: number | null
          id: string
          month: string
          name: string
          note: string | null
          synced_at: number
          type: string
          updated_at: number
        }
        Insert: {
          amount: number
          at: number
          created_at: number
          deleted_at?: number | null
          id: string
          month: string
          name: string
          note?: string | null
          synced_at?: number
          type: string
          updated_at: number
        }
        Update: {
          amount?: number
          at?: number
          created_at?: number
          deleted_at?: number | null
          id?: string
          month?: string
          name?: string
          note?: string | null
          synced_at?: number
          type?: string
          updated_at?: number
        }
        Relationships: []
      }
      lots: {
        Row: {
          bill_photo_id: string | null
          created_at: number
          deleted_at: number | null
          description: string | null
          due_date: string | null
          id: string
          lot_photo_id: string | null
          max_price: number
          min_price: number
          mode: string
          party_id: string | null
          payment_type: string
          qty_bought: number
          qty_remaining: number
          suggested_price: number
          synced_at: number
          tag_ids: string[]
          title: string
          total_cost: number
          unit_cost: number
          updated_at: number
        }
        Insert: {
          bill_photo_id?: string | null
          created_at: number
          deleted_at?: number | null
          description?: string | null
          due_date?: string | null
          id: string
          lot_photo_id?: string | null
          max_price: number
          min_price: number
          mode: string
          party_id?: string | null
          payment_type: string
          qty_bought: number
          qty_remaining: number
          suggested_price: number
          synced_at?: number
          tag_ids?: string[]
          title: string
          total_cost: number
          unit_cost: number
          updated_at: number
        }
        Update: {
          bill_photo_id?: string | null
          created_at?: number
          deleted_at?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          lot_photo_id?: string | null
          max_price?: number
          min_price?: number
          mode?: string
          party_id?: string | null
          payment_type?: string
          qty_bought?: number
          qty_remaining?: number
          suggested_price?: number
          synced_at?: number
          tag_ids?: string[]
          title?: string
          total_cost?: number
          unit_cost?: number
          updated_at?: number
        }
        Relationships: [
          {
            foreignKeyName: "lots_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          address: string | null
          created_at: number
          deleted_at: number | null
          id: string
          kind: string
          name: string
          phone: string | null
          synced_at: number
          updated_at: number
        }
        Insert: {
          address?: string | null
          created_at: number
          deleted_at?: number | null
          id: string
          kind: string
          name: string
          phone?: string | null
          synced_at?: number
          updated_at: number
        }
        Update: {
          address?: string | null
          created_at?: number
          deleted_at?: number | null
          id?: string
          kind?: string
          name?: string
          phone?: string | null
          synced_at?: number
          updated_at?: number
        }
        Relationships: []
      }
      party_payments: {
        Row: {
          amount: number
          created_at: number
          deleted_at: number | null
          id: string
          lot_id: string | null
          method: string
          note: string | null
          paid_at: number
          party_id: string
          synced_at: number
          updated_at: number
        }
        Insert: {
          amount: number
          created_at: number
          deleted_at?: number | null
          id: string
          lot_id?: string | null
          method: string
          note?: string | null
          paid_at: number
          party_id: string
          synced_at?: number
          updated_at: number
        }
        Update: {
          amount?: number
          created_at?: number
          deleted_at?: number | null
          id?: string
          lot_id?: string | null
          method?: string
          note?: string | null
          paid_at?: number
          party_id?: string
          synced_at?: number
          updated_at?: number
        }
        Relationships: [
          {
            foreignKeyName: "party_payments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      pieces: {
        Row: {
          created_at: number
          deleted_at: number | null
          id: string
          lot_id: string
          max_price: number
          min_price: number
          photo_id: string | null
          status: string
          suggested_price: number
          synced_at: number
          tag_ids: string[]
          title: string
          unit_cost: number
          updated_at: number
        }
        Insert: {
          created_at: number
          deleted_at?: number | null
          id: string
          lot_id: string
          max_price: number
          min_price: number
          photo_id?: string | null
          status?: string
          suggested_price: number
          synced_at?: number
          tag_ids?: string[]
          title: string
          unit_cost: number
          updated_at: number
        }
        Update: {
          created_at?: number
          deleted_at?: number | null
          id?: string
          lot_id?: string
          max_price?: number
          min_price?: number
          photo_id?: string | null
          status?: string
          suggested_price?: number
          synced_at?: number
          tag_ids?: string[]
          title?: string
          unit_cost?: number
          updated_at?: number
        }
        Relationships: [
          {
            foreignKeyName: "pieces_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: number
          id: string
          name: string
          phone: string | null
          role: string
          synced_at: number
          updated_at: number
        }
        Insert: {
          active?: boolean
          created_at?: number
          id: string
          name: string
          phone?: string | null
          role: string
          synced_at?: number
          updated_at?: number
        }
        Update: {
          active?: boolean
          created_at?: number
          id?: string
          name?: string
          phone?: string | null
          role?: string
          synced_at?: number
          updated_at?: number
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: number
          deleted_at: number | null
          id: string
          lot_id: string
          payment_method: string
          photo_id: string | null
          piece_id: string | null
          qty: number
          sold_at: number
          sold_by: string
          synced_at: number
          total: number
          unit_cost_snapshot: number
          unit_sale_price: number
          updated_at: number
        }
        Insert: {
          created_at: number
          deleted_at?: number | null
          id: string
          lot_id: string
          payment_method: string
          photo_id?: string | null
          piece_id?: string | null
          qty: number
          sold_at: number
          sold_by?: string
          synced_at?: number
          total: number
          unit_cost_snapshot?: number
          unit_sale_price: number
          updated_at: number
        }
        Update: {
          created_at?: number
          deleted_at?: number | null
          id?: string
          lot_id?: string
          payment_method?: string
          photo_id?: string | null
          piece_id?: string | null
          qty?: number
          sold_at?: number
          sold_by?: string
          synced_at?: number
          total?: number
          unit_cost_snapshot?: number
          unit_sale_price?: number
          updated_at?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_piece_id_fkey"
            columns: ["piece_id"]
            isOneToOne: false
            referencedRelation: "pieces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          synced_at: number
          updated_at: number
          value: Json
        }
        Insert: {
          key: string
          synced_at?: number
          updated_at: number
          value: Json
        }
        Update: {
          key?: string
          synced_at?: number
          updated_at?: number
          value?: Json
        }
        Relationships: []
      }
      tag_groups: {
        Row: {
          created_at: number
          deleted_at: number | null
          id: string
          name: string
          sort: number
          synced_at: number
          updated_at: number
        }
        Insert: {
          created_at: number
          deleted_at?: number | null
          id: string
          name: string
          sort?: number
          synced_at?: number
          updated_at: number
        }
        Update: {
          created_at?: number
          deleted_at?: number | null
          id?: string
          name?: string
          sort?: number
          synced_at?: number
          updated_at?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: number
          deleted_at: number | null
          group_id: string
          id: string
          name: string
          synced_at: number
          updated_at: number
        }
        Insert: {
          created_at: number
          deleted_at?: number | null
          group_id: string
          id: string
          name: string
          synced_at?: number
          updated_at: number
        }
        Update: {
          created_at?: number
          deleted_at?: number | null
          group_id?: string
          id?: string
          name?: string
          synced_at?: number
          updated_at?: number
        }
        Relationships: [
          {
            foreignKeyName: "tags_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tag_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_returns: {
        Row: {
          at: number
          cost_of_items: number
          created_at: number
          deleted_at: number | null
          id: string
          lot_id: string
          note: string | null
          photo_id: string | null
          piece_ids: string[] | null
          qty: number
          settlement: string | null
          synced_at: number
          type: string
          updated_at: number
          value: number
        }
        Insert: {
          at: number
          cost_of_items?: number
          created_at: number
          deleted_at?: number | null
          id: string
          lot_id: string
          note?: string | null
          photo_id?: string | null
          piece_ids?: string[] | null
          qty: number
          settlement?: string | null
          synced_at?: number
          type: string
          updated_at: number
          value: number
        }
        Update: {
          at?: number
          cost_of_items?: number
          created_at?: number
          deleted_at?: number | null
          id?: string
          lot_id?: string
          note?: string | null
          photo_id?: string | null
          piece_ids?: string[] | null
          qty?: number
          settlement?: string | null
          synced_at?: number
          type?: string
          updated_at?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_returns_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      worker_items: {
        Row: {
          lot_id: string | null
          max_price: number | null
          min_price: number | null
          photo_id: string | null
          piece_id: string | null
          qty_remaining: number | null
          suggested_price: number | null
          tag_ids: string[] | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      app_role: { Args: never; Returns: string }
      is_staff_admin: { Args: never; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
