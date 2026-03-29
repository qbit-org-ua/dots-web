export interface User {
  user_id: number;
  email: string;
  nickname: string;
  access: number;
  messages: number;
  is_activated: number;
}

export interface UserProfile {
  user_id: number;
  email: string;
  nickname: string;
  birthday: string;
  access: number;
  created: number;
  lastlogin: number;
  options: number;
  messages: number;
  avatar: string;
  city_name: string;
  region_name: string;
  country_name: string;
  fio: string;
  job: string;
  is_activated: number;
  near: string;
  u_region: string;
  u_institution_type: string;
  u_institution_name: string;
  u_specialty: string;
  u_kurs: string;
  u_teachers: string;
  u_about: string;
  u_near: string;
  u_certificate: string;
  o_region: string;
  o_district: string;
  o_full_name: string;
  o_short_name: string;
  o_grade: string;
  o_teacher: string;
  o_cert: string;
}

export type UserFull = UserProfile;

export interface Contest {
  contest_id: number;
  title: string;
  contest_type: string;
  start_time: number;
  visible: number;
  status: string;
  reg_status: string | null;
  user_count: number;
}

export interface ContestDetail {
  contest_id: number;
  title: string;
  contest_type: string;
  start_time: number;
  options: number;
  data: string;
  info: string;
  visible: number;
  author_id: number;
  allow_languages: string;
}

export interface ContestData {
  duration_time: number | null;
  frozen_time: number | null;
  allow_unfreeze: boolean | null;
  absolute_time: boolean | null;
  form_before_reg: string | null;
}

export interface ContestPage {
  name: string;
  status: string;
  title: string;
}

export interface ContestProblem {
  problem_id: number;
  short_name: string;
  title: string;
  max_score: number;
  complexity?: number;
  user_result?: number | null;
  user_score?: string | null;
}

export interface ContestParticipant {
  user_id: number;
  nickname: string;
  fio: string;
  u_institution_name: string;
  reg_status: number;
}

export interface Problem {
  problem_id: number;
  title: string;
  description: string;
  attachment: string;
  complexity: number;
  user_id: number;
  posted_time: number;
  tex: string | null;
  type: string | null;
  answer_options_count: number;
}

export interface Solution {
  solution_id: number;
  problem_id: number;
  user_id: number;
  contest_id: number | null;
  filename: string;
  checksum: string;
  lang_id: number;
  check_type: string;
  posted_time: number;
  checked_time: number;
  contest_time: number;
  test_result: number;
  test_score: string;
  score: string;
  module_val: number;
  compile_error: string | null;
  is_passed: number;
  // Legacy aliases used by some frontend code
  result?: number;
  language_name?: string;
  language_id?: number;
  problem_title?: string;
  short_name?: string;
  nickname?: string;
}

export interface TestResult {
  test_id: number;
  solution_id: number;
  test_no: number;
  test_result: number;
  test_score: string;
  test_time: number;
  test_mem: number;
}

export interface Message {
  message_id: number;
  from_user_id: number;
  to_user_id: number;
  in_reply_to: number;
  message_state: number;
  message_date: number;
  message_subj: string;
  message_text: string;
  from_nickname?: string;
  to_nickname?: string;
}

export interface Language {
  id: number;
  name: string;
}

export interface Group {
  group_id: number;
  group_name: string;
  teacher_id: number;
  group_description: string | null;
}

// Standings types - match the actual API response
export interface ProblemScore {
  problem_id: number;
  score: string;
  attempts: number;
  is_solved: boolean;
  time: number;
  is_first_solve: boolean;
}

export interface StandingsUser {
  place: number;
  user_id: number;
  nickname: string;
  fio: string;
  scores: ProblemScore[];
  total_score: string;
  total_solved: number;
  penalty: number;
}

export interface ProblemInfo {
  problem_id: number;
  short_name: string;
  title: string;
  tried: number;
  solved: number;
}

export interface SummaryRow {
  problem_id: number;
  tried: number;
  solved: number;
  avg_score: string;
}

export interface StandingsData {
  problems: ProblemInfo[];
  users: StandingsUser[];
  summary: SummaryRow[];
}
