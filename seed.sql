-- ============================================================================
-- StudySync Seed Data (Academic Sample Dataset for demo user)
-- 5th Semester DBMS demonstration & Data Visualization plotting
-- ============================================================================

-- 1. Demo user (login: demo / demo1234)
USE studysync;
INSERT INTO users (id, username, email, password_hash) VALUES
(1, 'demo', 'demo@studysync.edu', '$2a$10$ydGDRMlEcwH/jHITMylcnuhGceuULaUMMpkCTPrMWtbA2Cfp/nMiK');

-- 2. Insert 5th Sem CS Subjects
INSERT INTO subjects (id, user_id, name, color_code) VALUES
(1, 1, 'Database Management Systems', '#3B82F6'),
(2, 1, 'Data Visualization', '#8B5CF6'),
(3, 1, 'Computer Networks', '#10B981'),
(4, 1, 'Operating Systems', '#F59E0B'),
(5, 1, 'Web Technologies', '#EC4899');

-- 3. Insert Study Sessions (Spread across recent days for time-series & bar charts)
INSERT INTO study_sessions (id, user_id, subject_id, duration_minutes, session_date, notes) VALUES
(1,  1, 1, 120, DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'ER modeling and Relational Algebra'),
(2,  1, 2, 90,  DATE_SUB(CURDATE(), INTERVAL 6 DAY), 'Matplotlib subplots and custom dark themes'),
(3,  1, 1, 150, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'SQL Normalization 1NF to 3NF'),
(4,  1, 3, 60,  DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'TCP/IP Model and Socket programming'),
(5,  1, 2, 120, DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Donut charts and time-series line plots'),
(6,  1, 4, 90,  DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Process scheduling algorithms (RR, SJF)'),
(7,  1, 1, 180, DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'MySQL Views and Triggers implementation'),
(8,  1, 5, 90,  DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'REST API and client-side visualization'),
(9,  1, 2, 120, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Pandas dataframe aggregations'),
(10, 1, 3, 90,  DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Subnetting and Routing algorithms'),
(11, 1, 1, 120, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Indexing and Query optimization'),
(12, 1, 4, 75,  DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Deadlock detection and Banker algorithm'),
(13, 1, 1, 150, CURDATE(), 'Viva preparation & Schema documentation'),
(14, 1, 2, 120, CURDATE(), 'Generated final charts for presentation');
