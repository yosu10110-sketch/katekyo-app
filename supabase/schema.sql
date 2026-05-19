-- =====================================================
-- カテキョアプリ データベーススキーマ
-- =====================================================

-- カスタム型
CREATE TYPE user_role AS ENUM ('teacher', 'student', 'parent');
CREATE TYPE assignment_status AS ENUM ('pending', 'submitted', 'reviewed');
CREATE TYPE chat_room_type AS ENUM ('teacher_student', 'teacher_parent');

-- =====================================================
-- profiles（ユーザープロフィール）
-- =====================================================
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  full_name   text NOT NULL,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- teacher_student_relationships（教師↔生徒）
-- =====================================================
CREATE TABLE teacher_student_relationships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id)
);

-- =====================================================
-- parent_student_relationships（保護者↔生徒）
-- =====================================================
CREATE TABLE parent_student_relationships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- =====================================================
-- assignments（課題）
-- =====================================================
CREATE TABLE assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  due_date     timestamptz,
  status       assignment_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- assignment_submissions（提出物）
-- =====================================================
CREATE TABLE assignment_submissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id    uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url         text NOT NULL,
  file_type        text NOT NULL,
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  feedback_comment text,
  feedback_at      timestamptz
);

-- =====================================================
-- lectures（次回講義）
-- =====================================================
CREATE TABLE lectures (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title              text NOT NULL,
  scheduled_at       timestamptz NOT NULL,
  meeting_url        text,
  preparation_notes  text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- notice_board_posts（保護者連絡板）
-- =====================================================
CREATE TABLE notice_board_posts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  content               text NOT NULL,
  is_visible_to_student boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- notice_board_replies（連絡板返信）
-- =====================================================
CREATE TABLE notice_board_replies (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id   uuid NOT NULL REFERENCES notice_board_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- curriculum_materials（教材）
-- =====================================================
CREATE TABLE curriculum_materials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject      text NOT NULL,
  title        text NOT NULL,
  total_units  integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- curriculum_units（単元チェックリスト）
-- =====================================================
CREATE TABLE curriculum_units (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id  uuid NOT NULL REFERENCES curriculum_materials(id) ON DELETE CASCADE,
  unit_number  integer NOT NULL,
  unit_title   text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes        text,
  UNIQUE(material_id, unit_number)
);

-- =====================================================
-- chat_rooms（チャットルーム）
-- =====================================================
CREATE TABLE chat_rooms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type  chat_room_type NOT NULL,
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,  -- teacher_student用
  parent_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,  -- teacher_parent用
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_room_members CHECK (
    (room_type = 'teacher_student' AND student_id IS NOT NULL AND parent_id IS NULL) OR
    (room_type = 'teacher_parent' AND parent_id IS NOT NULL AND student_id IS NULL)
  )
);

-- =====================================================
-- chat_messages（チャットメッセージ）
-- =====================================================
CREATE TABLE chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- updated_at 自動更新トリガー
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notice_board_posts_updated_at
  BEFORE UPDATE ON notice_board_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 新規ユーザー登録時にprofilesを自動作成
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- RLS（行レベルセキュリティ）の有効化
-- =====================================================
ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_relationships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_board_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_board_replies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_materials        ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_units            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages               ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS ポリシー：profiles
-- =====================================================
CREATE POLICY "自分のプロフィールは誰でも参照可" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "教師は担当生徒・保護者を参照可" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_student_relationships tsr
      WHERE tsr.teacher_id = auth.uid() AND tsr.student_id = profiles.id
    ) OR EXISTS (
      SELECT 1 FROM parent_student_relationships psr
      JOIN teacher_student_relationships tsr ON tsr.student_id = psr.student_id
      WHERE tsr.teacher_id = auth.uid() AND psr.parent_id = profiles.id
    )
  );

CREATE POLICY "保護者は自分の子供を参照可" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relationships
      WHERE parent_id = auth.uid() AND student_id = profiles.id
    )
  );

CREATE POLICY "自分のプロフィールのみ更新可" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- RLS ポリシー：assignments
-- =====================================================
CREATE POLICY "教師は自分の課題を全操作可" ON assignments
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "生徒は自分宛の課題を参照可" ON assignments
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "保護者は子供の課題を参照可" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relationships
      WHERE parent_id = auth.uid() AND student_id = assignments.student_id
    )
  );

-- =====================================================
-- RLS ポリシー：assignment_submissions
-- =====================================================
CREATE POLICY "教師は担当生徒の提出物を参照可" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_submissions.assignment_id AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "教師はFBを記入可" ON assignment_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = assignment_submissions.assignment_id AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "生徒は自分の提出物を参照・提出可" ON assignment_submissions
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "保護者は子供の提出物を参照可" ON assignment_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relationships
      WHERE parent_id = auth.uid() AND student_id = assignment_submissions.student_id
    )
  );

-- =====================================================
-- RLS ポリシー：lectures
-- =====================================================
CREATE POLICY "教師は自分の講義を全操作可" ON lectures
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "生徒は自分宛の講義を参照可" ON lectures
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "保護者は子供の講義を参照可" ON lectures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relationships
      WHERE parent_id = auth.uid() AND student_id = lectures.student_id
    )
  );

-- =====================================================
-- RLS ポリシー：notice_board_posts
-- =====================================================
CREATE POLICY "教師は全連絡板を操作可" ON notice_board_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teacher_student_relationships tsr
      WHERE tsr.teacher_id = auth.uid() AND tsr.student_id = notice_board_posts.student_id
    )
  );

CREATE POLICY "保護者は子供に関する連絡板を参照・投稿可" ON notice_board_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM parent_student_relationships
      WHERE parent_id = auth.uid() AND student_id = notice_board_posts.student_id
    )
  );

CREATE POLICY "生徒は公開された連絡板のみ参照可" ON notice_board_posts
  FOR SELECT USING (
    student_id = auth.uid() AND is_visible_to_student = true
  );

-- =====================================================
-- RLS ポリシー：notice_board_replies
-- =====================================================
CREATE POLICY "連絡板を見られる人は返信も見られる" ON notice_board_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notice_board_posts nbp
      WHERE nbp.id = notice_board_replies.post_id
        AND (
          EXISTS (SELECT 1 FROM teacher_student_relationships tsr WHERE tsr.teacher_id = auth.uid() AND tsr.student_id = nbp.student_id)
          OR EXISTS (SELECT 1 FROM parent_student_relationships psr WHERE psr.parent_id = auth.uid() AND psr.student_id = nbp.student_id)
          OR (nbp.student_id = auth.uid() AND nbp.is_visible_to_student = true)
        )
    )
  );

CREATE POLICY "教師・保護者は返信可" ON notice_board_replies
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND EXISTS (
      SELECT 1 FROM notice_board_posts nbp
      WHERE nbp.id = notice_board_replies.post_id
        AND (
          EXISTS (SELECT 1 FROM teacher_student_relationships tsr WHERE tsr.teacher_id = auth.uid() AND tsr.student_id = nbp.student_id)
          OR EXISTS (SELECT 1 FROM parent_student_relationships psr WHERE psr.parent_id = auth.uid() AND psr.student_id = nbp.student_id)
        )
    )
  );

-- =====================================================
-- RLS ポリシー：curriculum_materials
-- =====================================================
CREATE POLICY "教師は教材を全操作可" ON curriculum_materials
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "生徒は自分の教材を参照可" ON curriculum_materials
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "保護者は子供の教材を参照可" ON curriculum_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_student_relationships
      WHERE parent_id = auth.uid() AND student_id = curriculum_materials.student_id
    )
  );

-- =====================================================
-- RLS ポリシー：curriculum_units
-- =====================================================
CREATE POLICY "教材を見られる人は単元も見られる" ON curriculum_units
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM curriculum_materials cm
      WHERE cm.id = curriculum_units.material_id
        AND (
          cm.teacher_id = auth.uid()
          OR cm.student_id = auth.uid()
          OR EXISTS (SELECT 1 FROM parent_student_relationships psr WHERE psr.parent_id = auth.uid() AND psr.student_id = cm.student_id)
        )
    )
  );

CREATE POLICY "教師は単元を全操作可" ON curriculum_units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM curriculum_materials cm
      WHERE cm.id = curriculum_units.material_id AND cm.teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS ポリシー：chat_rooms
-- =====================================================
CREATE POLICY "教師は自分のチャットルームを参照可" ON chat_rooms
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "生徒は自分のチャットルームを参照可" ON chat_rooms
  FOR SELECT USING (
    room_type = 'teacher_student' AND student_id = auth.uid()
  );

CREATE POLICY "保護者は自分のチャットルームを参照可" ON chat_rooms
  FOR SELECT USING (
    room_type = 'teacher_parent' AND parent_id = auth.uid()
  );

CREATE POLICY "教師はチャットルームを作成可" ON chat_rooms
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

-- =====================================================
-- RLS ポリシー：chat_messages
-- =====================================================
CREATE POLICY "ルームメンバーはメッセージを参照可" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_messages.room_id
        AND (
          cr.teacher_id = auth.uid()
          OR (cr.room_type = 'teacher_student' AND cr.student_id = auth.uid())
          OR (cr.room_type = 'teacher_parent' AND cr.parent_id = auth.uid())
        )
    )
  );

CREATE POLICY "ルームメンバーはメッセージを送信可" ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_messages.room_id
        AND (
          cr.teacher_id = auth.uid()
          OR (cr.room_type = 'teacher_student' AND cr.student_id = auth.uid())
          OR (cr.room_type = 'teacher_parent' AND cr.parent_id = auth.uid())
        )
    )
  );

-- =====================================================
-- Supabase Storage バケット（ファイルアップロード用）
-- =====================================================
-- Supabase ダッシュボードで以下のバケットを作成してください:
-- バケット名: submissions
-- 公開設定: false（プライベート）
-- 許可するMIMEタイプ: image/*, application/pdf
