/* eslint-disable */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      calendar_events: {
        Row: {
          channel: Database["public"]["Enums"]["channel_kind"] | null;
          conversation_id: string | null;
          created_at: string;
          description: string | null;
          ends_at: string;
          external_id: string | null;
          id: string;
          location: string | null;
          source: string | null;
          starts_at: string;
          title: string;
          workspace_id: string;
        };
        Insert: {
          channel?: Database["public"]["Enums"]["channel_kind"] | null;
          conversation_id?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at: string;
          external_id?: string | null;
          id?: string;
          location?: string | null;
          source?: string | null;
          starts_at: string;
          title: string;
          workspace_id: string;
        };
        Update: {
          channel?: Database["public"]["Enums"]["channel_kind"] | null;
          conversation_id?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string;
          external_id?: string | null;
          id?: string;
          location?: string | null;
          source?: string | null;
          starts_at?: string;
          title?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      channel_accounts: {
        Row: {
          connected_at: string;
          display_name: string | null;
          encrypted_tokens: string | null;
          external_id: string;
          id: string;
          kind: Database["public"]["Enums"]["channel_kind"];
          last_synced_at: string | null;
          status: string;
          workspace_id: string;
        };
        Insert: {
          connected_at?: string;
          display_name?: string | null;
          encrypted_tokens?: string | null;
          external_id: string;
          id?: string;
          kind: Database["public"]["Enums"]["channel_kind"];
          last_synced_at?: string | null;
          status?: string;
          workspace_id: string;
        };
        Update: {
          connected_at?: string;
          display_name?: string | null;
          encrypted_tokens?: string | null;
          external_id?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["channel_kind"];
          last_synced_at?: string | null;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channel_accounts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_handles: {
        Row: {
          contact_id: string;
          handle: string;
          id: string;
          kind: Database["public"]["Enums"]["channel_kind"];
        };
        Insert: {
          contact_id: string;
          handle: string;
          id?: string;
          kind: Database["public"]["Enums"]["channel_kind"];
        };
        Update: {
          contact_id?: string;
          handle?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["channel_kind"];
        };
        Relationships: [
          {
            foreignKeyName: "contact_handles_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          email: string | null;
          id: string;
          notes: string | null;
          phone: string | null;
          starred: boolean;
          workspace_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          email?: string | null;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          starred?: boolean;
          workspace_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          id?: string;
          notes?: string | null;
          phone?: string | null;
          starred?: boolean;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          archived: boolean;
          assigned_to: string | null;
          channel_account_id: string | null;
          contact_id: string | null;
          created_at: string;
          external_thread_id: string | null;
          id: string;
          last_message_at: string;
          preview: string | null;
          starred: boolean;
          subject: string | null;
          unread_count: number;
          workspace_id: string;
        };
        Insert: {
          archived?: boolean;
          assigned_to?: string | null;
          channel_account_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          external_thread_id?: string | null;
          id?: string;
          last_message_at?: string;
          preview?: string | null;
          starred?: boolean;
          subject?: string | null;
          unread_count?: number;
          workspace_id: string;
        };
        Update: {
          archived?: boolean;
          assigned_to?: string | null;
          channel_account_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          external_thread_id?: string | null;
          id?: string;
          last_message_at?: string;
          preview?: string | null;
          starred?: boolean;
          subject?: string | null;
          unread_count?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_channel_account_id_fkey";
            columns: ["channel_account_id"];
            isOneToOne: false;
            referencedRelation: "channel_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_activity_events: {
        Row: {
          actor_id: string | null;
          body: string | null;
          conversation_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          workspace_id: string;
        };
        Insert: {
          actor_id?: string | null;
          body?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          workspace_id: string;
        };
        Update: {
          actor_id?: string | null;
          body?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_activity_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_activity_events_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_activity_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_internal_notes: {
        Row: {
          author_id: string;
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          mention_handles: string[];
          mentioned_user_ids: string[];
          workspace_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          mention_handles?: string[];
          mentioned_user_ids?: string[];
          workspace_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          mention_handles?: string[];
          mentioned_user_ids?: string[];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_internal_notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_internal_notes_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_internal_notes_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      message_attachments: {
        Row: {
          created_at: string;
          filename: string;
          id: string;
          message_id: string;
          mime_type: string | null;
          preview_url: string | null;
          size_bytes: number | null;
          storage_path: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          filename: string;
          id?: string;
          message_id: string;
          mime_type?: string | null;
          preview_url?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          filename?: string;
          id?: string;
          message_id?: string;
          mime_type?: string | null;
          preview_url?: string | null;
          size_bytes?: number | null;
          storage_path?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_attachments_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body_html: string | null;
          body_text: string | null;
          conversation_id: string;
          delivered_at: string | null;
          direction: Database["public"]["Enums"]["message_direction"];
          external_id: string | null;
          id: string;
          metadata: Json | null;
          read_at: string | null;
          sent_at: string;
          workspace_id: string;
        };
        Insert: {
          body_html?: string | null;
          body_text?: string | null;
          conversation_id: string;
          delivered_at?: string | null;
          direction: Database["public"]["Enums"]["message_direction"];
          external_id?: string | null;
          id?: string;
          metadata?: Json | null;
          read_at?: string | null;
          sent_at?: string;
          workspace_id: string;
        };
        Update: {
          body_html?: string | null;
          body_text?: string | null;
          conversation_id?: string;
          delivered_at?: string | null;
          direction?: Database["public"]["Enums"]["message_direction"];
          external_id?: string | null;
          id?: string;
          metadata?: Json | null;
          read_at?: string | null;
          sent_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      mue_memories: {
        Row: {
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          kind: string;
          source_conversation_id: string | null;
          workspace_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          kind: string;
          source_conversation_id?: string | null;
          workspace_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          kind?: string;
          source_conversation_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mue_memories_source_conversation_id_fkey";
            columns: ["source_conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mue_memories_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      mue_chat_messages: {
        Row: {
          content: string;
          conversation_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          role: string;
          workspace_id: string;
        };
        Insert: {
          content: string;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role: string;
          workspace_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mue_chat_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mue_chat_messages_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active_workspace_id: string | null;
          avatar_url: string | null;
          billing_period_end: string | null;
          billing_status: string;
          created_at: string;
          daily_digest_enabled: boolean;
          daily_digest_last_sent_at: string | null;
          email: string;
          full_name: string | null;
          id: string;
          locale: string | null;
          mue_persona: string | null;
          mue_style_profile: string | null;
          mue_style_updated_at: string | null;
          onboarded_at: string | null;
          plan: Database["public"]["Enums"]["plan_tier"];
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          timezone: string | null;
          trial_ends_at: string | null;
          trial_reminder_sent_at: string | null;
          updated_at: string;
        };
        Insert: {
          active_workspace_id?: string | null;
          avatar_url?: string | null;
          billing_period_end?: string | null;
          billing_status?: string;
          created_at?: string;
          daily_digest_enabled?: boolean;
          daily_digest_last_sent_at?: string | null;
          email: string;
          full_name?: string | null;
          id: string;
          locale?: string | null;
          mue_persona?: string | null;
          mue_style_profile?: string | null;
          mue_style_updated_at?: string | null;
          onboarded_at?: string | null;
          plan?: Database["public"]["Enums"]["plan_tier"];
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          timezone?: string | null;
          trial_ends_at?: string | null;
          trial_reminder_sent_at?: string | null;
          updated_at?: string;
        };
        Update: {
          active_workspace_id?: string | null;
          avatar_url?: string | null;
          billing_period_end?: string | null;
          billing_status?: string;
          created_at?: string;
          daily_digest_enabled?: boolean;
          daily_digest_last_sent_at?: string | null;
          email?: string;
          full_name?: string | null;
          id?: string;
          locale?: string | null;
          mue_persona?: string | null;
          mue_style_profile?: string | null;
          mue_style_updated_at?: string | null;
          onboarded_at?: string | null;
          plan?: Database["public"]["Enums"]["plan_tier"];
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          timezone?: string | null;
          trial_ends_at?: string | null;
          trial_reminder_sent_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_active_workspace_id_fkey";
            columns: ["active_workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          ai_generated: boolean;
          completed_at: string | null;
          conversation_id: string | null;
          created_at: string;
          description: string | null;
          due_at: string | null;
          id: string;
          priority: Database["public"]["Enums"]["task_priority"];
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          workspace_id: string;
        };
        Insert: {
          ai_generated?: boolean;
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          workspace_id: string;
        };
        Update: {
          ai_generated?: boolean;
          completed_at?: string | null;
          conversation_id?: string | null;
          created_at?: string;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_counters: {
        Row: {
          count: number;
          created_at: string;
          id: string;
          key: string;
          period_end: string;
          period_start: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          count?: number;
          created_at?: string;
          id?: string;
          key: string;
          period_end: string;
          period_start: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          count?: number;
          created_at?: string;
          id?: string;
          key?: string;
          period_end?: string;
          period_start?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_counters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "usage_counters_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      team_notification_settings: {
        Row: {
          email_digest_enabled: boolean;
          slack_webhook_url: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          email_digest_enabled?: boolean;
          slack_webhook_url?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          email_digest_enabled?: boolean;
          slack_webhook_url?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_notification_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_notification_settings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      team_notifications: {
        Row: {
          actor_id: string | null;
          body: string;
          conversation_id: string | null;
          created_at: string;
          digest_sent_at: string | null;
          id: string;
          kind: string;
          read_at: string | null;
          recipient_id: string;
          workspace_id: string;
        };
        Insert: {
          actor_id?: string | null;
          body: string;
          conversation_id?: string | null;
          created_at?: string;
          digest_sent_at?: string | null;
          id?: string;
          kind: string;
          read_at?: string | null;
          recipient_id: string;
          workspace_id: string;
        };
        Update: {
          actor_id?: string | null;
          body?: string;
          conversation_id?: string | null;
          created_at?: string;
          digest_sent_at?: string | null;
          id?: string;
          kind?: string;
          read_at?: string | null;
          recipient_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_notifications_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_notifications_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_invites: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          role: Database["public"]["Enums"]["member_role"];
          token_hash: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          role?: Database["public"]["Enums"]["member_role"];
          token_hash: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          role?: Database["public"]["Enums"]["member_role"];
          token_hash?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_invites_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          added_at: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          added_at?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id: string;
          workspace_id: string;
        };
        Update: {
          added_at?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_permission_settings: {
        Row: {
          assign_roles: Database["public"]["Enums"]["member_role"][];
          connect_channel_roles: Database["public"]["Enums"]["member_role"][];
          invite_roles: Database["public"]["Enums"]["member_role"][];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          assign_roles?: Database["public"]["Enums"]["member_role"][];
          connect_channel_roles?: Database["public"]["Enums"]["member_role"][];
          invite_roles?: Database["public"]["Enums"]["member_role"][];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          assign_roles?: Database["public"]["Enums"]["member_role"][];
          connect_channel_roles?: Database["public"]["Enums"]["member_role"][];
          invite_roles?: Database["public"]["Enums"]["member_role"][];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_permission_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_permission_settings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          slug: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          slug?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          slug?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_usage_counter: {
        Args: {
          p_key: string;
          p_limit?: number | null;
          p_workspace_id: string;
        };
        Returns: {
          current_count: number;
          limited: boolean;
        }[];
      };
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean };
    };
    Enums: {
      channel_kind:
        | "gmail"
        | "outlook"
        | "icloud"
        | "imap"
        | "instagram"
        | "whatsapp"
        | "slack"
        | "discord"
        | "x"
        | "linkedin"
        | "telegram"
        | "messenger"
        | "sms";
      member_role: "owner" | "admin" | "member";
      message_direction: "in" | "out";
      plan_tier: "free" | "pro" | "team";
      task_priority: "low" | "medium" | "high" | "urgent";
      task_status: "todo" | "in_progress" | "awaiting_reply" | "done";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      channel_kind: [
        "gmail",
        "outlook",
        "icloud",
        "imap",
        "instagram",
        "whatsapp",
        "slack",
        "discord",
        "x",
        "linkedin",
        "telegram",
        "messenger",
        "sms",
      ],
      member_role: ["owner", "admin", "member"],
      message_direction: ["in", "out"],
      plan_tier: ["free", "pro", "team"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "awaiting_reply", "done"],
    },
  },
} as const;
