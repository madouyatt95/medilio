-- ═══════════════════════════════════════════════
-- MEDILIO — Supabase Database Schema
-- ═══════════════════════════════════════════════

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Users table (Public profile linked to auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('patient', 'professional', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  street TEXT,
  city TEXT,
  postal_code TEXT,
  avatar_url TEXT, -- Profile photo URL (Supabase Storage)
  specialties TEXT[], -- Pour les pros
  bio TEXT,
  radius INTEGER DEFAULT 10,
  verified BOOLEAN DEFAULT false,
  disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Missions table
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_pro_id UUID REFERENCES public.profiles(id),
  care_type TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  patient_name TEXT NOT NULL,
  patient_age INTEGER,
  patient_conditions TEXT,
  description TEXT,
  estimated_duration INTEGER DEFAULT 30,
  estimated_cost NUMERIC,
  recurrence TEXT DEFAULT 'none',
  documents JSONB DEFAULT '[]'::jsonb, -- Store uploaded medical documents {name: str, url: str}
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Mission Applicants table
CREATE TABLE public.mission_applicants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mission_id, pro_id)
);

-- 5. Create Care Notes table
CREATE TABLE public.mission_care_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID REFERENCES public.missions(id),
  patient_id UUID REFERENCES public.profiles(id),
  pro_id UUID REFERENCES public.profiles(id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mission_id, patient_id)
);

-- 7. Create Chats and Messages
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  sender_name TEXT,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create Favorites table
CREATE TABLE public.favorites (
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (patient_id, pro_id)
);

-- ═══════════════════════════════════════════════
-- Row Level Security (RLS) Policies
-- ═══════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_care_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Les profiles sont lisibles par tous les utilisateurs connectés
CREATE POLICY "Profiles viewable by users." ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
-- Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- (Des politiques plus fines pourront être ajoutées, mais pour le moment on garde l'accès ouvert aux connectés)
CREATE POLICY "Authenticated users can select all" ON public.missions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON public.missions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON public.missions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select all" ON public.mission_applicants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON public.mission_applicants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON public.mission_applicants FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select all" ON public.mission_care_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON public.mission_care_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select all" ON public.ratings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON public.ratings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select all" ON public.chats FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON public.chats FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select all" ON public.chat_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update" ON public.chat_messages FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select all" ON public.favorites FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert" ON public.favorites FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete" ON public.favorites FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to create profile when auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'role');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
