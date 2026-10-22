-- ============================================================================
-- StudySync: DBMS & Data Visualization project (MySQL 8.0)
-- 3NF schema: 3 tables + 1 view + 1 trigger
-- Usage: mysql -u root < schema.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS studysync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studysync;

DROP VIEW  IF EXISTS v_subject_study_summary;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;

-- 1. users: entity with authentication data
-- Concepts: primary key, UNIQUE constraints (username, email), bcrypt password hash
CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. subjects: 1:N with users
-- Concepts: foreign key with ON DELETE CASCADE, composite UNIQUE (user_id, name)
CREATE TABLE subjects (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL,
    name       VARCHAR(100) NOT NULL,
    color_code VARCHAR(7)   DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_subject (user_id, name)
) ENGINE=InnoDB;

-- 3. study_sessions: 1:N with users and subjects (one row per stopwatch run / manual entry)
-- Concepts: multiple foreign keys, CHECK constraint, indexes for aggregation queries
CREATE TABLE study_sessions (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT  NOT NULL,
    subject_id       INT  NOT NULL,
    duration_minutes INT  NOT NULL,
    session_date     DATE NOT NULL,
    notes            VARCHAR(255) DEFAULT '',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT chk_duration CHECK (duration_minutes > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_sessions_user_date ON study_sessions(user_id, session_date);
CREATE INDEX idx_sessions_subject   ON study_sessions(subject_id);

-- 4. View: per-subject totals
-- Concepts: JOIN, LEFT JOIN, GROUP BY, SUM/COUNT/ROUND, COALESCE
CREATE VIEW v_subject_study_summary AS
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

-- 5. Trigger: reject non-positive durations and sessions filed under another user's subject
DELIMITER //

CREATE TRIGGER tr_validate_session
BEFORE INSERT ON study_sessions
FOR EACH ROW
BEGIN
    IF NEW.duration_minutes <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Study session duration must be greater than zero minutes';
    END IF;
    IF (SELECT user_id FROM subjects WHERE id = NEW.subject_id) <> NEW.user_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject does not belong to this user';
    END IF;
END //

DELIMITER ;
