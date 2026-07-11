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
      analytics_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          meta: Json
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          meta?: Json
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: number
          meta?: Json
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          company_id: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          end_at: string | null
          id: string
          notes: string | null
          service_name: string
          start_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          notes?: string | null
          service_name: string
          start_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          notes?: string | null
          service_name?: string
          start_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean
          alt: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string
          link_url: string | null
          placement: string
          priority: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          alt?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          placement: string
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          alt?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          placement?: string
          priority?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts_legacy: {
        Row: {
          author_name: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          keywords: string[]
          meta_description: string | null
          published: boolean
          published_at: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          content: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          keywords?: string[]
          meta_description?: string | null
          published?: boolean
          published_at?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          keywords?: string[]
          meta_description?: string | null
          published?: boolean
          published_at?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      cities: {
        Row: {
          banner_url: string | null
          created_at: string
          featured_category_ids: string[]
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          og_image_url: string | null
          primary_color: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          state: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          featured_category_ids?: string[]
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          og_image_url?: string | null
          primary_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          state?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          featured_category_ids?: string[]
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          og_image_url?: string | null
          primary_color?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          state?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          badges: string[] | null
          banner_url: string | null
          catalog_url: string | null
          certifications: Json | null
          city_id: string | null
          clients_served: number | null
          coverage_cities: string[] | null
          created_at: string
          description: string | null
          differentials: string[] | null
          email: string | null
          facebook: string | null
          featured: boolean
          financing_info: Json | null
          founded_year: number | null
          hours: Json | null
          id: string
          instagram: string | null
          is_verified: boolean
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          plan: string
          plan_expires_at: string | null
          portfolio_pdf_url: string | null
          price_range: number | null
          pricebook_url: string | null
          promotions: Json | null
          quality_scores: Json | null
          rating: number
          reputation_score: number | null
          response_rate: number | null
          response_time_minutes: number | null
          review_count: number
          services_completed: number | null
          slug: string
          status: string
          tagline: string | null
          tiktok: string | null
          tour_360_url: string | null
          updated_at: string
          video_url: string | null
          views_count: number
          website: string | null
          whatsapp: string | null
          years_experience: number | null
          youtube: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          badges?: string[] | null
          banner_url?: string | null
          catalog_url?: string | null
          certifications?: Json | null
          city_id?: string | null
          clients_served?: number | null
          coverage_cities?: string[] | null
          created_at?: string
          description?: string | null
          differentials?: string[] | null
          email?: string | null
          facebook?: string | null
          featured?: boolean
          financing_info?: Json | null
          founded_year?: number | null
          hours?: Json | null
          id?: string
          instagram?: string | null
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          portfolio_pdf_url?: string | null
          price_range?: number | null
          pricebook_url?: string | null
          promotions?: Json | null
          quality_scores?: Json | null
          rating?: number
          reputation_score?: number | null
          response_rate?: number | null
          response_time_minutes?: number | null
          review_count?: number
          services_completed?: number | null
          slug: string
          status?: string
          tagline?: string | null
          tiktok?: string | null
          tour_360_url?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number
          website?: string | null
          whatsapp?: string | null
          years_experience?: number | null
          youtube?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          badges?: string[] | null
          banner_url?: string | null
          catalog_url?: string | null
          certifications?: Json | null
          city_id?: string | null
          clients_served?: number | null
          coverage_cities?: string[] | null
          created_at?: string
          description?: string | null
          differentials?: string[] | null
          email?: string | null
          facebook?: string | null
          featured?: boolean
          financing_info?: Json | null
          founded_year?: number | null
          hours?: Json | null
          id?: string
          instagram?: string | null
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          portfolio_pdf_url?: string | null
          price_range?: number | null
          pricebook_url?: string | null
          promotions?: Json | null
          quality_scores?: Json | null
          rating?: number
          reputation_score?: number | null
          response_rate?: number | null
          response_time_minutes?: number | null
          review_count?: number
          services_completed?: number | null
          slug?: string
          status?: string
          tagline?: string | null
          tiktok?: string | null
          tour_360_url?: string | null
          updated_at?: string
          video_url?: string | null
          views_count?: number
          website?: string | null
          whatsapp?: string | null
          years_experience?: number | null
          youtube?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      company_categories: {
        Row: {
          category_id: string
          company_id: string
        }
        Insert: {
          category_id: string
          company_id: string
        }
        Update: {
          category_id?: string
          company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_faqs: {
        Row: {
          answer: string
          company_id: string
          created_at: string
          id: string
          question: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer: string
          company_id: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string
          company_id?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_faqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_media: {
        Row: {
          caption: string | null
          company_id: string
          created_at: string
          id: string
          sort: number
          type: string
          url: string
        }
        Insert: {
          caption?: string | null
          company_id: string
          created_at?: string
          id?: string
          sort?: number
          type?: string
          url: string
        }
        Update: {
          caption?: string | null
          company_id?: string
          created_at?: string
          id?: string
          sort?: number
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_media_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_projects: {
        Row: {
          after_url: string | null
          before_url: string | null
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          after_url?: string | null
          before_url?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          after_url?: string | null
          before_url?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_views: {
        Row: {
          company_id: string
          id: number
          ip_hash: string | null
          viewed_at: string
        }
        Insert: {
          company_id: string
          id?: number
          ip_hash?: string | null
          viewed_at?: string
        }
        Update: {
          company_id?: string
          id?: number
          ip_hash?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          active: boolean
          city_id: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          phone: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          city_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          phone: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          city_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          phone?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          category_id: string | null
          city_id: string | null
          company_id: string | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          event_type: string | null
          id: string
          location: string | null
          price_max: number | null
          price_min: number | null
          slug: string
          start_at: string
          status: Database["public"]["Enums"]["publish_status"]
          ticket_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          city_id?: string | null
          company_id?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          price_max?: number | null
          price_min?: number | null
          slug: string
          start_at: string
          status?: Database["public"]["Enums"]["publish_status"]
          ticket_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          city_id?: string | null
          company_id?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: string | null
          id?: string
          location?: string | null
          price_max?: number | null
          price_min?: number | null
          slug?: string
          start_at?: string
          status?: Database["public"]["Enums"]["publish_status"]
          ticket_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          company_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_planos: {
        Row: {
          city: string | null
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          plan: string
          status: string
        }
        Insert: {
          city?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          plan: string
          status?: string
        }
        Update: {
          city?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          plan?: string
          status?: string
        }
        Relationships: []
      }
      listing_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      listing_messages: {
        Row: {
          body: string
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          read_at: string | null
          seller_id: string
          sender_id: string
        }
        Insert: {
          body: string
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          read_at?: string | null
          seller_id: string
          sender_id: string
        }
        Update: {
          body?: string
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          read_at?: string | null
          seller_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_reports: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category_slug: string
          city_id: string | null
          condition: Database["public"]["Enums"]["listing_condition"]
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          images: Json
          neighborhood: string | null
          price: number | null
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          user_id: string
          views_count: number
        }
        Insert: {
          category_slug: string
          city_id?: string | null
          condition?: Database["public"]["Enums"]["listing_condition"]
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          neighborhood?: string | null
          price?: number | null
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          user_id: string
          views_count?: number
        }
        Update: {
          category_slug?: string
          city_id?: string | null
          condition?: Database["public"]["Enums"]["listing_condition"]
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          neighborhood?: string | null
          price?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "listing_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_items: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          images: Json
          price: number | null
          slug: string
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          price?: number | null
          slug: string
          status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          price?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          kind: string
          meta: Json
          owner_id: string | null
          url: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          owner_id?: string | null
          url: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          owner_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          city_slug: string | null
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          city_slug?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          city_slug?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          atualizacoes: boolean
          blog: boolean
          empresas: boolean
          eventos: boolean
          marketplace: boolean
          novidades: boolean
          promocoes: boolean
          quiet_end: number
          quiet_hours_enabled: boolean
          quiet_start: number
          som: boolean
          updated_at: string
          user_id: string
          vibracao: boolean
        }
        Insert: {
          atualizacoes?: boolean
          blog?: boolean
          empresas?: boolean
          eventos?: boolean
          marketplace?: boolean
          novidades?: boolean
          promocoes?: boolean
          quiet_end?: number
          quiet_hours_enabled?: boolean
          quiet_start?: number
          som?: boolean
          updated_at?: string
          user_id: string
          vibracao?: boolean
        }
        Update: {
          atualizacoes?: boolean
          blog?: boolean
          empresas?: boolean
          eventos?: boolean
          marketplace?: boolean
          novidades?: boolean
          promocoes?: boolean
          quiet_end?: number
          quiet_hours_enabled?: boolean
          quiet_start?: number
          som?: boolean
          updated_at?: string
          user_id?: string
          vibracao?: boolean
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body_template: string
          category: string
          color: string | null
          created_at: string
          default_url: string | null
          emoji: string | null
          icon_url: string | null
          id: string
          name: string
          slug: string
          sort: number
          title_template: string
        }
        Insert: {
          body_template: string
          category: string
          color?: string | null
          created_at?: string
          default_url?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name: string
          slug: string
          sort?: number
          title_template: string
        }
        Update: {
          body_template?: string
          category?: string
          color?: string | null
          created_at?: string
          default_url?: string | null
          emoji?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
          sort?: number
          title_template?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plans_config: {
        Row: {
          duration_days: number
          features: Json
          max_photos: number
          name: string
          price_cents: number
          slug: string
          sort: number
          updated_at: string
        }
        Insert: {
          duration_days?: number
          features?: Json
          max_photos?: number
          name: string
          price_cents?: number
          slug: string
          sort?: number
          updated_at?: string
        }
        Update: {
          duration_days?: number
          features?: Json
          max_photos?: number
          name?: string
          price_cents?: number
          slug?: string
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      post_categories: {
        Row: {
          category_id: string
          post_id: string
        }
        Insert: {
          category_id: string
          post_id: string
        }
        Update: {
          category_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          auto_generated: boolean
          city_id: string | null
          company_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          gallery: Json
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          published_at: string | null
          scheduled_at: string | null
          slug: string
          status: Database["public"]["Enums"]["publish_status"]
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          auto_generated?: boolean
          city_id?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          gallery?: Json
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["publish_status"]
          tags?: string[]
          title: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          auto_generated?: boolean
          city_id?: string | null
          company_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          gallery?: Json
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["publish_status"]
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          company_id: string
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          price_from: number | null
          price_to: number | null
          slug: string
          status: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          company_id: string
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          price_from?: number | null
          price_to?: number | null
          slug: string
          status?: Database["public"]["Enums"]["publish_status"]
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          company_id?: string
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          price_from?: number | null
          price_to?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      public_services: {
        Row: {
          active: boolean
          address: string | null
          category: Database["public"]["Enums"]["public_service_category"]
          city_id: string
          created_at: string
          description: string | null
          email: string | null
          featured: boolean
          hours: string | null
          id: string
          is_24h: boolean
          lat: number | null
          lng: number | null
          name: string
          neighborhood: string | null
          phone: string | null
          phone_secondary: string | null
          subtype: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          category: Database["public"]["Enums"]["public_service_category"]
          city_id: string
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          hours?: string | null
          id?: string
          is_24h?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          phone_secondary?: string | null
          subtype?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          category?: Database["public"]["Enums"]["public_service_category"]
          city_id?: string
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          hours?: string | null
          id?: string
          is_24h?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          phone_secondary?: string | null
          subtype?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_services_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_deliveries: {
        Row: {
          browser: string | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          device: string | null
          error: string | null
          id: number
          notification_id: string
          opened_at: string | null
          sent_at: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          device?: string | null
          error?: string | null
          id?: number
          notification_id: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          device?: string | null
          error?: string | null
          id?: number
          notification_id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "push_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_inbox: {
        Row: {
          archived_at: string | null
          favorite_at: string | null
          id: number
          notification_id: string
          read_at: string | null
          received_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          favorite_at?: string | null
          id?: number
          notification_id: string
          read_at?: string | null
          received_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          favorite_at?: string | null
          id?: number
          notification_id?: string
          read_at?: string | null
          received_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_inbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "push_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notifications: {
        Row: {
          audience: Json
          body: string
          buttons: Json | null
          category: string
          clicked_count: number
          color: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          emoji: string | null
          failed_count: number
          icon_url: string | null
          id: string
          image_url: string | null
          opened_count: number
          priority: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          template_id: string | null
          title: string
          unsubscribed_count: number
          updated_at: string
          url: string | null
        }
        Insert: {
          audience?: Json
          body: string
          buttons?: Json | null
          category?: string
          clicked_count?: number
          color?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          emoji?: string | null
          failed_count?: number
          icon_url?: string | null
          id?: string
          image_url?: string | null
          opened_count?: number
          priority?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          template_id?: string | null
          title: string
          unsubscribed_count?: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          audience?: Json
          body?: string
          buttons?: Json | null
          category?: string
          clicked_count?: number
          color?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          emoji?: string | null
          failed_count?: number
          icon_url?: string | null
          id?: string
          image_url?: string | null
          opened_count?: number
          priority?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          template_id?: string | null
          title?: string
          unsubscribed_count?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_pwa: boolean
          last_seen_at: string
          p256dh: string
          platform: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_pwa?: boolean
          last_seen_at?: string
          p256dh: string
          platform?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_pwa?: boolean
          last_seen_at?: string
          p256dh?: string
          platform?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qa_ticket_comments: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "qa_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_ticket_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: string
          payload: Json
          ticket_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          ticket_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "qa_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_tickets: {
        Row: {
          assigned_to: string | null
          city_id: string | null
          console_logs: Json
          created_at: string
          description: string
          device: Json
          extra: Json
          fingerprint: string | null
          id: string
          ip: string | null
          network_logs: Json
          page_title: string | null
          page_url: string | null
          priority: Database["public"]["Enums"]["qa_priority"]
          resolved_at: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["qa_status"]
          ticket_number: string
          type: Database["public"]["Enums"]["qa_type"]
          updated_at: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
          video_url: string | null
        }
        Insert: {
          assigned_to?: string | null
          city_id?: string | null
          console_logs?: Json
          created_at?: string
          description: string
          device?: Json
          extra?: Json
          fingerprint?: string | null
          id?: string
          ip?: string | null
          network_logs?: Json
          page_title?: string | null
          page_url?: string | null
          priority?: Database["public"]["Enums"]["qa_priority"]
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["qa_status"]
          ticket_number?: string
          type?: Database["public"]["Enums"]["qa_type"]
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          video_url?: string | null
        }
        Update: {
          assigned_to?: string | null
          city_id?: string | null
          console_logs?: Json
          created_at?: string
          description?: string
          device?: Json
          extra?: Json
          fingerprint?: string | null
          id?: string
          ip?: string | null
          network_logs?: Json
          page_title?: string | null
          page_url?: string | null
          priority?: Database["public"]["Enums"]["qa_priority"]
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["qa_status"]
          ticket_number?: string
          type?: Database["public"]["Enums"]["qa_type"]
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_tickets_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_name: string | null
          comment: string | null
          company_id: string
          created_at: string
          id: string
          rating: number
          review_date: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          comment?: string | null
          company_id: string
          created_at?: string
          id?: string
          rating: number
          review_date?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          comment?: string | null
          company_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_date?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          artist_name: string
          cover_image: string | null
          created_at: string
          description: string | null
          end_at: string | null
          event_id: string
          id: string
          sort: number
          stage: string | null
          start_at: string
          ticket_price: number | null
          ticket_url: string | null
          updated_at: string
        }
        Insert: {
          artist_name: string
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          event_id: string
          id?: string
          sort?: number
          stage?: string | null
          start_at: string
          ticket_price?: number | null
          ticket_url?: string | null
          updated_at?: string
        }
        Update: {
          artist_name?: string
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          event_id?: string
          id?: string
          sort?: number
          stage?: string | null
          start_at?: string
          ticket_price?: number | null
          ticket_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shows_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      blog_posts: {
        Row: {
          author_name: string | null
          content: string | null
          cover_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string | null
          keywords: string[] | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          published: boolean | null
          published_at: string | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string | null
          keywords?: never
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published?: never
          published_at?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string | null
          keywords?: never
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          published?: never
          published_at?: string | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_weekly_ranking: {
        Args: never
        Returns: {
          activity: number
          avg_rating: number
          city_id: string
          company_id: string
          is_self: boolean
          logo_url: string
          name: string
          rank_position: number
          reviews: number
          score: number
          slug: string
          visits: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      nearest_city: {
        Args: { _lat: number; _lng: number }
        Returns: {
          distance_km: number
          id: string
          name: string
          slug: string
        }[]
      }
      refresh_company_rating: {
        Args: { _company_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "company_owner" | "user" | "editor" | "publisher"
      appointment_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      listing_condition: "novo" | "seminovo" | "usado"
      listing_status: "ativo" | "vendido" | "pausado" | "removido"
      post_type: "article" | "news" | "blog" | "promo" | "event"
      public_service_category:
        | "saude"
        | "educacao"
        | "seguranca"
        | "prefeitura"
        | "transporte"
        | "assistencia_social"
        | "emergencia"
        | "outros"
      publish_status: "draft" | "scheduled" | "published" | "archived"
      qa_priority: "baixa" | "media" | "alta" | "critica"
      qa_status:
        | "novo"
        | "em_analise"
        | "reproduzido"
        | "em_desenvolvimento"
        | "corrigido"
        | "publicado"
        | "fechado"
      qa_type:
        | "erro"
        | "bug"
        | "info_incorreta"
        | "empresa"
        | "evento"
        | "noticia"
        | "layout"
        | "lentidao"
        | "funcionalidade"
        | "sugestao"
        | "outro"
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
      app_role: ["admin", "company_owner", "user", "editor", "publisher"],
      appointment_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      listing_condition: ["novo", "seminovo", "usado"],
      listing_status: ["ativo", "vendido", "pausado", "removido"],
      post_type: ["article", "news", "blog", "promo", "event"],
      public_service_category: [
        "saude",
        "educacao",
        "seguranca",
        "prefeitura",
        "transporte",
        "assistencia_social",
        "emergencia",
        "outros",
      ],
      publish_status: ["draft", "scheduled", "published", "archived"],
      qa_priority: ["baixa", "media", "alta", "critica"],
      qa_status: [
        "novo",
        "em_analise",
        "reproduzido",
        "em_desenvolvimento",
        "corrigido",
        "publicado",
        "fechado",
      ],
      qa_type: [
        "erro",
        "bug",
        "info_incorreta",
        "empresa",
        "evento",
        "noticia",
        "layout",
        "lentidao",
        "funcionalidade",
        "sugestao",
        "outro",
      ],
    },
  },
} as const
