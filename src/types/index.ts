export type UserRole = 'teacher' | 'student' | 'parent'
export type AssignmentStatus = 'pending' | 'submitted' | 'reviewed'
export type ChatRoomType = 'teacher_student' | 'teacher_parent'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  avatar_url: string | null
  created_at: string
}

export interface Textbook {
  id: string
  teacher_id: string
  subject: string
  title: string
  publisher: string | null
  created_at: string
}

export interface Assignment {
  id: string
  teacher_id: string
  student_id: string
  title: string
  description: string | null
  due_date: string | null
  status: AssignmentStatus
  created_at: string
  updated_at: string
  textbook_id: string | null
  page_range: string | null
  profiles?: Profile
  textbooks?: Textbook
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  file_url: string
  file_type: string
  submitted_at: string
  feedback_comment: string | null
  feedback_at: string | null
  feedback_file_url: string | null
  feedback_file_type: string | null
}

export interface Lecture {
  id: string
  teacher_id: string
  student_id: string
  title: string
  scheduled_at: string
  meeting_url: string | null
  preparation_notes: string | null
  created_at: string
}

export interface NoticeBoardPost {
  id: string
  author_id: string
  student_id: string
  title: string
  content: string
  is_visible_to_student: boolean
  created_at: string
  updated_at: string
  profiles?: Profile
  notice_board_replies?: NoticeBoardReply[]
}

export interface NoticeBoardReply {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export interface CurriculumMaterial {
  id: string
  teacher_id: string
  student_id: string
  subject: string
  title: string
  total_units: number
  created_at: string
  curriculum_units?: CurriculumUnit[]
}

export interface CurriculumUnit {
  id: string
  material_id: string
  unit_number: number
  unit_title: string
  is_completed: boolean
  completed_at: string | null
  notes: string | null
}

export interface ChatRoom {
  id: string
  room_type: ChatRoomType
  teacher_id: string
  student_id: string | null
  parent_id: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
  profiles?: Profile
}
