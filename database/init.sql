

CREATE DATABASE IF NOT EXISTS moodle_web
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE moodle_web;

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            CHAR(36)      NOT NULL DEFAULT (UUID()),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password      VARCHAR(255)  NOT NULL,
  role          ENUM('student','lecturer','admin') NOT NULL DEFAULT 'student',
  avatar_url    VARCHAR(500)  NULL,
  bio           TEXT          NULL,
  phone         VARCHAR(30)   NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  last_login_at DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. faculties
-- ---------------------------------------------------------------------------
CREATE TABLE faculties (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  name       VARCHAR(200) NOT NULL,
  code       VARCHAR(20)  NOT NULL,
  dean_id    CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_faculties_code (code)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 3. departments
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  faculty_id CHAR(36)     NOT NULL,
  name       VARCHAR(200) NOT NULL,
  code       VARCHAR(20)  NOT NULL,
  head_id    CHAR(36)     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dept_code (code),
  CONSTRAINT fk_dept_faculty FOREIGN KEY (faculty_id) REFERENCES faculties (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 4. courses
-- ---------------------------------------------------------------------------
CREATE TABLE courses (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  department_id CHAR(36)     NOT NULL,
  lecturer_id   CHAR(36)     NOT NULL,
  title         VARCHAR(200) NOT NULL,
  code          VARCHAR(30)  NOT NULL,
  description   TEXT         NULL,
  credits       TINYINT      NOT NULL DEFAULT 3,
  semester      TINYINT      NOT NULL DEFAULT 1,
  academic_year CHAR(9)      NOT NULL DEFAULT '2025/2026',
  max_students  SMALLINT     NOT NULL DEFAULT 40,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_course_code_year (code, academic_year, semester),
  CONSTRAINT fk_courses_dept     FOREIGN KEY (department_id) REFERENCES departments (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_courses_lecturer FOREIGN KEY (lecturer_id)   REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 5. course_sections
-- ---------------------------------------------------------------------------
CREATE TABLE course_sections (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  course_id   CHAR(36)     NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT         NULL,
  position    TINYINT      NOT NULL DEFAULT 1,
  visible     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_sections_course FOREIGN KEY (course_id) REFERENCES courses (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 6. course_materials
-- ---------------------------------------------------------------------------
CREATE TABLE course_materials (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  section_id CHAR(36)     NOT NULL,
  title      VARCHAR(200) NOT NULL,
  type       ENUM('file','link','text') NOT NULL DEFAULT 'file',
  content    TEXT         NULL,
  file_size  INT UNSIGNED NULL,
  mime_type  VARCHAR(100) NULL,
  position   TINYINT      NOT NULL DEFAULT 1,
  visible    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_materials_section FOREIGN KEY (section_id) REFERENCES course_sections (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 7. enrollments
-- ---------------------------------------------------------------------------
CREATE TABLE enrollments (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  student_id  CHAR(36)     NOT NULL,
  course_id   CHAR(36)     NOT NULL,
  status      ENUM('active','dropped','completed') NOT NULL DEFAULT 'active',
  enrolled_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dropped_at  DATETIME     NULL,
  final_grade DECIMAL(5,2) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollment (student_id, course_id),
  CONSTRAINT fk_enr_student FOREIGN KEY (student_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_enr_course  FOREIGN KEY (course_id)  REFERENCES courses (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 8. assignments
-- ---------------------------------------------------------------------------
CREATE TABLE assignments (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  course_id     CHAR(36)     NOT NULL,
  section_id    CHAR(36)     NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT         NULL,
  type          ENUM('upload','quiz','text') NOT NULL DEFAULT 'upload',
  max_score     DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  passing_score DECIMAL(5,2) NOT NULL DEFAULT 60.00,
  allow_late    TINYINT(1)   NOT NULL DEFAULT 0,
  late_penalty  DECIMAL(5,2) NOT NULL DEFAULT 0,
  due_at        DATETIME     NOT NULL,
  open_at       DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_asgn_course  FOREIGN KEY (course_id)  REFERENCES courses (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_asgn_section FOREIGN KEY (section_id) REFERENCES course_sections (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 9. submissions
-- ---------------------------------------------------------------------------
CREATE TABLE submissions (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  assignment_id CHAR(36)     NOT NULL,
  student_id    CHAR(36)     NOT NULL,
  file_path     VARCHAR(500) NULL,
  text_response TEXT         NULL,
  status        ENUM('draft','submitted','graded','returned') NOT NULL DEFAULT 'submitted',
  is_late       TINYINT(1)   NOT NULL DEFAULT 0,
  score         DECIMAL(5,2) NULL,
  feedback      TEXT         NULL,
  graded_by     CHAR(36)     NULL,
  graded_at     DATETIME     NULL,
  submitted_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_submission (assignment_id, student_id),
  CONSTRAINT fk_sub_assignment FOREIGN KEY (assignment_id) REFERENCES assignments (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sub_student    FOREIGN KEY (student_id)    REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sub_grader     FOREIGN KEY (graded_by)     REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 10. quizzes
-- ---------------------------------------------------------------------------
CREATE TABLE quizzes (
  id                 CHAR(36)    NOT NULL DEFAULT (UUID()),
  assignment_id      CHAR(36)    NOT NULL,
  time_limit_min     SMALLINT    NOT NULL DEFAULT 60,
  shuffle_questions  TINYINT(1)  NOT NULL DEFAULT 1,
  shuffle_answers    TINYINT(1)  NOT NULL DEFAULT 1,
  max_attempts       TINYINT     NOT NULL DEFAULT 1,
  show_answers_after ENUM('immediately','after_due','never') NOT NULL DEFAULT 'after_due',
  PRIMARY KEY (id),
  UNIQUE KEY uq_quiz_assignment (assignment_id),
  CONSTRAINT fk_quiz_assignment FOREIGN KEY (assignment_id) REFERENCES assignments (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 11. quiz_questions
-- ---------------------------------------------------------------------------
CREATE TABLE quiz_questions (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  quiz_id    CHAR(36)     NOT NULL,
  body       TEXT         NOT NULL,
  type       ENUM('multiple_choice','true_false','short_answer') NOT NULL DEFAULT 'multiple_choice',
  points     DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  position   SMALLINT     NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_qq_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 12. quiz_options
-- ---------------------------------------------------------------------------
CREATE TABLE quiz_options (
  id          CHAR(36)   NOT NULL DEFAULT (UUID()),
  question_id CHAR(36)   NOT NULL,
  body        TEXT       NOT NULL,
  is_correct  TINYINT(1) NOT NULL DEFAULT 0,
  position    TINYINT    NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  CONSTRAINT fk_opt_question FOREIGN KEY (question_id) REFERENCES quiz_questions (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 13. quiz_attempts
-- ---------------------------------------------------------------------------
CREATE TABLE quiz_attempts (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  submission_id CHAR(36)     NOT NULL,
  student_id    CHAR(36)     NOT NULL,
  quiz_id       CHAR(36)     NOT NULL,
  attempt_no    TINYINT      NOT NULL DEFAULT 1,
  score         DECIMAL(5,2) NULL,
  started_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at  DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attempt (submission_id, attempt_no),
  CONSTRAINT fk_attempt_sub     FOREIGN KEY (submission_id) REFERENCES submissions (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_attempt_student FOREIGN KEY (student_id)    REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_attempt_quiz    FOREIGN KEY (quiz_id)       REFERENCES quizzes (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 14. quiz_responses
-- ---------------------------------------------------------------------------
CREATE TABLE quiz_responses (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  attempt_id    CHAR(36)     NOT NULL,
  question_id   CHAR(36)     NOT NULL,
  option_id     CHAR(36)     NULL,
  text_answer   TEXT         NULL,
  is_correct    TINYINT(1)   NULL,
  points_earned DECIMAL(5,2) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_response (attempt_id, question_id),
  CONSTRAINT fk_resp_attempt  FOREIGN KEY (attempt_id)  REFERENCES quiz_attempts (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_resp_question FOREIGN KEY (question_id) REFERENCES quiz_questions (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_resp_option   FOREIGN KEY (option_id)   REFERENCES quiz_options (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 15. announcements
-- ---------------------------------------------------------------------------
CREATE TABLE announcements (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  course_id  CHAR(36)     NOT NULL,
  author_id  CHAR(36)     NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       TEXT         NOT NULL,
  is_pinned  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_ann_course FOREIGN KEY (course_id) REFERENCES courses (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ann_author FOREIGN KEY (author_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 16. notifications   (per-user inbox)
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id              CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id         CHAR(36)     NOT NULL,
  announcement_id CHAR(36)     NULL,
  type            ENUM('announcement','grade','system','reminder') NOT NULL DEFAULT 'announcement',
  title           VARCHAR(200) NOT NULL,
  body            TEXT         NOT NULL,
  is_read         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)         REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_notif_ann  FOREIGN KEY (announcement_id) REFERENCES announcements (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 17. discussion_forums
-- ---------------------------------------------------------------------------
CREATE TABLE discussion_forums (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  course_id   CHAR(36)     NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT         NULL,
  is_locked   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_forum_course FOREIGN KEY (course_id) REFERENCES courses (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 18. discussion_posts
-- ---------------------------------------------------------------------------
CREATE TABLE discussion_posts (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  forum_id   CHAR(36)     NOT NULL,
  author_id  CHAR(36)     NOT NULL,
  parent_id  CHAR(36)     NULL,
  subject    VARCHAR(200) NULL,
  body       TEXT         NOT NULL,
  is_pinned  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_post_forum  FOREIGN KEY (forum_id)  REFERENCES discussion_forums (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_post_author FOREIGN KEY (author_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_post_parent FOREIGN KEY (parent_id) REFERENCES discussion_posts (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 19. attendance_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE attendance_sessions (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()),
  course_id    CHAR(36)     NOT NULL,
  title        VARCHAR(200) NOT NULL DEFAULT 'Class Session',
  held_at      DATETIME     NOT NULL,
  duration_min SMALLINT     NOT NULL DEFAULT 100,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_att_ses_course FOREIGN KEY (course_id) REFERENCES courses (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 20. attendance_records
-- ---------------------------------------------------------------------------
CREATE TABLE attendance_records (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  session_id  CHAR(36)     NOT NULL,
  student_id  CHAR(36)     NOT NULL,
  status      ENUM('present','absent','excused','late') NOT NULL DEFAULT 'absent',
  note        VARCHAR(300) NULL,
  recorded_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_att_record (session_id, student_id),
  CONSTRAINT fk_att_rec_session FOREIGN KEY (session_id) REFERENCES attendance_sessions (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_att_rec_student FOREIGN KEY (student_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 21. grade_components
-- ---------------------------------------------------------------------------
CREATE TABLE grade_components (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  course_id   CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  weight      DECIMAL(5,2) NOT NULL,
  description VARCHAR(300) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_gc_course FOREIGN KEY (course_id) REFERENCES courses (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 22. grade_entries
-- ---------------------------------------------------------------------------
CREATE TABLE grade_entries (
  id           CHAR(36)     NOT NULL DEFAULT (UUID()),
  component_id CHAR(36)     NOT NULL,
  student_id   CHAR(36)     NOT NULL,
  score        DECIMAL(5,2) NOT NULL,
  max_score    DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  note         TEXT         NULL,
  entered_by   CHAR(36)     NOT NULL,
  entered_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grade_entry (component_id, student_id),
  CONSTRAINT fk_ge_component FOREIGN KEY (component_id) REFERENCES grade_components (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ge_student   FOREIGN KEY (student_id)   REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ge_entered   FOREIGN KEY (entered_by)   REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 23. user_sessions   (JWT revocation log)
-- ---------------------------------------------------------------------------
CREATE TABLE user_sessions (
  id         CHAR(36)     NOT NULL DEFAULT (UUID()),
  user_id    CHAR(36)     NOT NULL,
  token_hash CHAR(64)     NOT NULL,
  ip_address VARCHAR(45)  NULL,
  user_agent VARCHAR(300) NULL,
  expires_at DATETIME     NOT NULL,
  revoked    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token_hash (token_hash),
  CONSTRAINT fk_ses_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 24. audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     CHAR(36)        NULL,
  action      VARCHAR(100)    NOT NULL,
  entity_type VARCHAR(50)     NULL,
  entity_id   CHAR(36)        NULL,
  metadata    JSON            NULL,
  ip_address  VARCHAR(45)     NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_user   (user_id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_time   (created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 25. system_settings
-- ---------------------------------------------------------------------------
CREATE TABLE system_settings (
  setting_key   VARCHAR(100) NOT NULL,
  setting_value TEXT         NULL,
  description   VARCHAR(300) NULL,
  updated_by    CHAR(36)     NULL,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB;

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('site_name',        'Moodle Web — UGM', 'Displayed in the browser tab and header'),
  ('max_upload_mb',    '20',               'Maximum file upload size in MB'),
  ('session_ttl_hours','24',               'JWT session lifetime in hours'),
  ('allow_late_submit','0',               'Global late-submission toggle (0=off, 1=on)');
