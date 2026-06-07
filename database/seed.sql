USE moodle_web;

-- ============================================================
--  USERS
--  password for all accounts: password123
-- ============================================================
INSERT INTO users (id, name, email, password, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dr. Lukman Heryawan',   'lukman@ugm.ac.id',  '$2a$10$UCsDY/OUDO5aGoqhlA/Pp.9R02hDnBsZYpZtuJl5xkC.kxDebCAvG', 'lecturer'),
  ('00000000-0000-0000-0000-000000000002', 'Adam Rizky',             'adam@mail.ugm.ac.id',   '$2a$10$UCsDY/OUDO5aGoqhlA/Pp.9R02hDnBsZYpZtuJl5xkC.kxDebCAvG', 'student'),
  ('00000000-0000-0000-0000-000000000003', 'I Ketut Ezra',           'ezra@mail.ugm.ac.id',   '$2a$10$UCsDY/OUDO5aGoqhlA/Pp.9R02hDnBsZYpZtuJl5xkC.kxDebCAvG', 'student'),
  ('00000000-0000-0000-0000-000000000004', 'Panji Merah Balakosa',   'panji@mail.ugm.ac.id',  '$2a$10$UCsDY/OUDO5aGoqhlA/Pp.9R02hDnBsZYpZtuJl5xkC.kxDebCAvG', 'student'),
  ('00000000-0000-0000-0000-000000000005', 'Raihan Yudhistira',      'raihan@mail.ugm.ac.id', '$2a$10$UCsDY/OUDO5aGoqhlA/Pp.9R02hDnBsZYpZtuJl5xkC.kxDebCAvG', 'student'),
  ('00000000-0000-0000-0000-000000000006', 'Zidni Dziaulhaq',        'zidni@mail.ugm.ac.id',  '$2a$10$UCsDY/OUDO5aGoqhlA/Pp.9R02hDnBsZYpZtuJl5xkC.kxDebCAvG', 'student'),
  ('00000000-0000-0000-0000-000000000007', 'Budi Santoso',           'budi@mail.ugm.ac.id',   '$2a$10$UCsDY/OUDO5aGoqhlA/Pp.9R02hDnBsZYpZtuJl5xkC.kxDebCAvG', 'student'),
  ('00000000-0000-0000-0000-000000000008', 'Admin UGM',              'admin@ugm.ac.id',        '$2a$10$UCsDY/OUDO5aGoqhlA/Pp.9R02hDnBsZYpZtuJl5xkC.kxDebCAvG', 'admin');

-- ============================================================
--  FACULTY & DEPARTMENT
-- ============================================================
INSERT INTO faculties (id, name, code, dean_id) VALUES
  ('F0000000-0000-0000-0000-000000000001', 'Faculty of Mathematics and Natural Sciences', 'FMIPA', '00000000-0000-0000-0000-000000000008');

INSERT INTO departments (id, faculty_id, name, code, head_id) VALUES
  ('D0000000-0000-0000-0000-000000000001', 'F0000000-0000-0000-0000-000000000001', 'Department of Computer Science', 'ILKOM', '00000000-0000-0000-0000-000000000001');

-- ============================================================
--  COURSES
-- ============================================================
INSERT INTO courses (id, department_id, lecturer_id, title, code, description, credits) VALUES
  ('10000000-0000-0000-0000-000000000001', 'D0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Cloud Computing',   'MII212607', 'Containerisation, REST APIs, and cloud deployment.', 3),
  ('10000000-0000-0000-0000-000000000002', 'D0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Database Systems',  'MII211504', 'Relational database design, SQL, and transactions.', 3),
  ('10000000-0000-0000-0000-000000000003', 'D0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Web Programming',   'MII213602', 'Frontend and backend web development using modern tooling.', 3);

-- ============================================================
--  COURSE SECTIONS
-- ============================================================
INSERT INTO course_sections (id, course_id, title, position) VALUES
  ('S1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Week 1 — Introduction to Cloud', 1),
  ('S1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Week 2 — Docker & Containers',   2),
  ('S1000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Week 3 — REST API Design',       3),
  ('S1000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Week 1 — ER Diagrams',           1),
  ('S1000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Week 2 — Normalisation',         2),
  ('S1000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'Week 1 — HTML & CSS',            1),
  ('S1000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'Week 2 — JavaScript & Fetch',   2);

-- ============================================================
--  COURSE MATERIALS
-- ============================================================
INSERT INTO course_materials (section_id, title, type, content, position) VALUES
  ('S1000000-0000-0000-0000-000000000001', 'Cloud Computing Overview Slides', 'file',  '/uploads/cloud-intro.pdf', 1),
  ('S1000000-0000-0000-0000-000000000001', 'AWS Free Tier Guide',             'link',  'https://aws.amazon.com/free/', 2),
  ('S1000000-0000-0000-0000-000000000002', 'Docker Official Docs',            'link',  'https://docs.docker.com', 1),
  ('S1000000-0000-0000-0000-000000000002', 'Docker Compose Lab Worksheet',    'file',  '/uploads/docker-lab.pdf', 2),
  ('S1000000-0000-0000-0000-000000000004', 'ER Diagram Lecture Notes',        'file',  '/uploads/er-notes.pdf', 1),
  ('S1000000-0000-0000-0000-000000000006', 'HTML5 Cheatsheet',                'link',  'https://htmlreference.io', 1);

-- ============================================================
--  ENROLLMENTS
-- ============================================================
INSERT INTO enrollments (student_id, course_id) VALUES
  ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000003');

-- ============================================================
--  ASSIGNMENTS
-- ============================================================
INSERT INTO assignments (id, course_id, section_id, title, description, type, due_at) VALUES
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','S1000000-0000-0000-0000-000000000002',
   'Docker Compose Lab',      'Containerise a Node.js + MySQL app using Docker Compose.','upload','2026-05-20 23:59:00'),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','S1000000-0000-0000-0000-000000000004',
   'ER Diagram Design',       'Design a normalised ER diagram for a library management system.','upload','2026-05-27 23:59:00'),
  ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','S1000000-0000-0000-0000-000000000007',
   'REST API Implementation', 'Build a CRUD REST API using Express.js and document it in Postman.','upload','2026-06-03 23:59:00'),
  ('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','S1000000-0000-0000-0000-000000000003',
   'Cloud Concepts Quiz',     'Multiple-choice quiz on IaaS, PaaS, and SaaS.','quiz','2026-05-18 23:59:00');

-- ============================================================
--  QUIZ (for assignment 4)
-- ============================================================
INSERT INTO quizzes (id, assignment_id, time_limit_min, max_attempts) VALUES
  ('Q0000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004', 30, 2);

INSERT INTO quiz_questions (id, quiz_id, body, type, points, position) VALUES
  ('QQ000000-0000-0000-0000-000000000001','Q0000000-0000-0000-0000-000000000001','Which service model provides virtual machines?','multiple_choice',2,1),
  ('QQ000000-0000-0000-0000-000000000002','Q0000000-0000-0000-0000-000000000001','Docker containers share the host OS kernel.','true_false',1,2),
  ('QQ000000-0000-0000-0000-000000000003','Q0000000-0000-0000-0000-000000000001','What does REST stand for?','short_answer',2,3);

INSERT INTO quiz_options (question_id, body, is_correct, position) VALUES
  ('QQ000000-0000-0000-0000-000000000001','SaaS',0,1),
  ('QQ000000-0000-0000-0000-000000000001','PaaS',0,2),
  ('QQ000000-0000-0000-0000-000000000001','IaaS',1,3),
  ('QQ000000-0000-0000-0000-000000000001','FaaS',0,4),
  ('QQ000000-0000-0000-0000-000000000002','True', 1,1),
  ('QQ000000-0000-0000-0000-000000000002','False',0,2);

-- ============================================================
--  ANNOUNCEMENTS  +  NOTIFICATIONS
-- ============================================================
INSERT INTO announcements (id, course_id, author_id, title, body, is_pinned) VALUES
  ('A0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',
   'Welcome to Cloud Computing',
   'Please make sure Docker Desktop is installed before the first lab session next week.',1),
  ('A0000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',
   'ER Diagram Submission Extended',
   'The deadline for the ER Diagram assignment has been extended by three days.',0);

-- Inbox entries for all enrolled students
INSERT INTO notifications (user_id, announcement_id, type, title, body) VALUES
  ('00000000-0000-0000-0000-000000000002','A0000000-0000-0000-0000-000000000001','announcement','Welcome to Cloud Computing','Please make sure Docker Desktop is installed before the first lab session next week.'),
  ('00000000-0000-0000-0000-000000000003','A0000000-0000-0000-0000-000000000001','announcement','Welcome to Cloud Computing','Please make sure Docker Desktop is installed before the first lab session next week.'),
  ('00000000-0000-0000-0000-000000000004','A0000000-0000-0000-0000-000000000001','announcement','Welcome to Cloud Computing','Please make sure Docker Desktop is installed before the first lab session next week.'),
  ('00000000-0000-0000-0000-000000000005','A0000000-0000-0000-0000-000000000001','announcement','Welcome to Cloud Computing','Please make sure Docker Desktop is installed before the first lab session next week.'),
  ('00000000-0000-0000-0000-000000000006','A0000000-0000-0000-0000-000000000001','announcement','Welcome to Cloud Computing','Please make sure Docker Desktop is installed before the first lab session next week.'),
  ('00000000-0000-0000-0000-000000000007','A0000000-0000-0000-0000-000000000001','announcement','Welcome to Cloud Computing','Please make sure Docker Desktop is installed before the first lab session next week.'),
  ('00000000-0000-0000-0000-000000000002','A0000000-0000-0000-0000-000000000002','announcement','ER Diagram Submission Extended','The deadline for the ER Diagram assignment has been extended by three days.'),
  ('00000000-0000-0000-0000-000000000003','A0000000-0000-0000-0000-000000000002','announcement','ER Diagram Submission Extended','The deadline for the ER Diagram assignment has been extended by three days.');

-- ============================================================
--  DISCUSSION FORUMS
-- ============================================================
INSERT INTO discussion_forums (id, course_id, title, description) VALUES
  ('DF000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','General Q&A','Ask anything about the Cloud Computing course here.'),
  ('DF000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','SQL Help Forum','Post your SQL questions and help each other out.');

-- Explicit IDs so the lecturer's answer threads as a reply to the student's question.
INSERT INTO discussion_posts (id, forum_id, author_id, parent_id, subject, body) VALUES
  ('DP000000-0000-0000-0000-000000000001','DF000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',NULL,'Docker port mapping question','How do I map port 3000 inside a container to port 8080 on my host?'),
  ('DP000000-0000-0000-0000-000000000002','DF000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','DP000000-0000-0000-0000-000000000001',NULL,'Great question! Use the ports mapping in docker-compose.yml: "8080:3000".'),
  ('DP000000-0000-0000-0000-000000000003','DF000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',NULL,'JOIN vs subquery','When should I use a JOIN instead of a subquery for performance?');

-- ============================================================
--  ATTENDANCE
-- ============================================================
INSERT INTO attendance_sessions (id, course_id, title, held_at) VALUES
  ('AS000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Lab Session 1 — Docker Intro','2026-05-05 08:00:00'),
  ('AS000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Lab Session 2 — Docker Compose','2026-05-12 08:00:00');

INSERT INTO attendance_records (session_id, student_id, status) VALUES
  ('AS000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','present'),
  ('AS000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','present'),
  ('AS000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','absent'),
  ('AS000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','present'),
  ('AS000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','late'),
  ('AS000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000007','present'),
  ('AS000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','present'),
  ('AS000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','excused'),
  ('AS000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','present'),
  ('AS000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','present'),
  ('AS000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000006','present'),
  ('AS000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000007','absent');

-- ============================================================
--  GRADE COMPONENTS
-- ============================================================
INSERT INTO grade_components (id, course_id, name, weight) VALUES
  ('GC000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Assignments', 30.00),
  ('GC000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Midterm Exam',35.00),
  ('GC000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Final Exam',  35.00),
  ('GC000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002','Assignments', 40.00),
  ('GC000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','Final Exam',  60.00);

-- Sample grade entries
INSERT INTO grade_entries (component_id, student_id, score, entered_by) VALUES
  ('GC000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',85.00,'00000000-0000-0000-0000-000000000001'),
  ('GC000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',78.00,'00000000-0000-0000-0000-000000000001'),
  ('GC000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',90.00,'00000000-0000-0000-0000-000000000001'),
  ('GC000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',82.00,'00000000-0000-0000-0000-000000000001');

-- ============================================================
--  AUDIT LOG  (sample entries)
-- ============================================================
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES
  ('00000000-0000-0000-0000-000000000001','create_assignment','assignment','20000000-0000-0000-0000-000000000001','127.0.0.1'),
  ('00000000-0000-0000-0000-000000000002','submit_assignment','submission','20000000-0000-0000-0000-000000000001','127.0.0.1');
