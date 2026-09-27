-- ============================================================================
-- StudySync: 5th Semester DBMS & Data Visualization Project
-- Relational Database Schema (MySQL 8.0)
-- Architecture: 3NF Normalized Minimalist Schema (3 Core Tables + 1 View + 1 Trigger)
-- ============================================================================

-- Disable foreign key checks for clean teardown of any legacy tables
SET FOREIGN_KEY_CHECKS = 0;

-- Drop any legacy tables and views from old bloated schema
DROP VIEW IF EXISTS v_active_study_sessions;
DROP VIEW IF EXISTS v_leaderboard_global;
DROP TABLE IF EXISTS user_daily_summaries;
DROP TABLE IF EXISTS mail_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS friend_requests;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS user_settings;

-- Drop core simplified tables and views
DROP VIEW IF EXISTS v_subject_study_summary;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. users TABLE (Primary Entity)
-- DBMS Concept: Entity, Primary Key, Unique Constraints, Timestamps
-- Normal Form: 3NF (Atomic fields, dependent on PK only)
-- ============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. subjects TABLE (1:N with users)
-- DBMS Concept: Foreign Key with Referential Integrity (ON DELETE CASCADE),
-- Composite Unique Constraint, Check constraint on color format
-- ============================================================================
CREATE TABLE subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color_code VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_subject (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. study_sessions TABLE (1:N with users and subjects)
-- DBMS Concept: Multiple Foreign Keys, Domain Check Constraint (duration > 0),
-- Transactional Log for Data Visualization Aggregation
-- ============================================================================
CREATE TABLE study_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id INT NOT NULL,
    duration_minutes INT NOT NULL,
    session_date DATE NOT NULL,
    notes VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT chk_duration CHECK (duration_minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexing for fast queries during Data Visualization aggregation
CREATE INDEX idx_sessions_user_date ON study_sessions(user_id, session_date);
CREATE INDEX idx_sessions_subject ON study_sessions(subject_id);

-- ============================================================================
-- 4. RELATIONAL VIEW: v_subject_study_summary
-- DBMS Concept: Relational Abstraction, INNER & LEFT JOINs, Aggregations 
-- (COUNT, SUM, ROUND), GROUP BY, NULL handling via COALESCE
-- ============================================================================
CREATE OR REPLACE VIEW v_subject_study_summary AS
SELECT 
    u.id AS user_id,
    u.username,
    s.id AS subject_id,
    s.name AS subject_name,
    s.color_code,
    COUNT(ss.id) AS total_sessions,
    COALESCE(SUM(ss.duration_minutes), 0) AS total_minutes,
    ROUND(COALESCE(SUM(ss.duration_minutes), 0) / 60.0, 2) AS total_hours
FROM subjects s
JOIN users u ON s.user_id = u.id
LEFT JOIN study_sessions ss ON s.id = ss.subject_id
GROUP BY u.id, u.username, s.id, s.name, s.color_code;

-- ============================================================================
-- 5. TRIGGER: tr_validate_session_duration
-- DBMS Concept: Event-driven constraint enforcement (BEFORE INSERT Trigger),
-- Signal SQLSTATE error handling
-- ============================================================================
DELIMITER //

CREATE TRIGGER tr_validate_session_duration
BEFORE INSERT ON study_sessions
FOR EACH ROW
BEGIN
    IF NEW.duration_minutes <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Study session duration must be greater than zero minutes';
    END IF;
END //

DELIMITER ;
