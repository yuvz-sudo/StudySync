-- ============================================================================
-- StudySync: DBMS & Data Visualization project (MySQL 8.0)
-- 3NF schema: 6 tables + 2 views + 3 triggers
-- Usage: mysql -u root < schema.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS studysync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studysync;

DROP VIEW  IF EXISTS v_subject_study_summary;
DROP VIEW  IF EXISTS v_tag_summary;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS session_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS goals;
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

-- 4. goals: weekly target per subject (1:1 per user+subject)
-- Concepts: composite UNIQUE, upsert (INSERT ... ON DUPLICATE KEY UPDATE), CHECK
CREATE TABLE goals (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    user_id               INT NOT NULL,
    subject_id            INT NOT NULL,
    weekly_target_minutes INT NOT NULL,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_subject_goal (user_id, subject_id),
    CONSTRAINT chk_target CHECK (weekly_target_minutes > 0)
) ENGINE=InnoDB;

-- 5. tags + session_tags: many-to-many between sessions and labels
-- Concepts: junction table, composite primary key, M:N resolved into two 1:N
CREATE TABLE tags (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT         NOT NULL,
    name    VARCHAR(30) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_tag (user_id, name)
) ENGINE=InnoDB;

CREATE TABLE session_tags (
    session_id INT NOT NULL,
    tag_id     INT NOT NULL,
    PRIMARY KEY (session_id, tag_id),
    FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id)     REFERENCES tags(id)           ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. audit_log: written only by triggers
-- Concepts: AFTER UPDATE / AFTER DELETE triggers, OLD/NEW row values.
-- No FK on session_id on purpose: the row it describes may no longer exist.
CREATE TABLE audit_log (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT         NOT NULL,
    session_id   INT         NOT NULL,
    action       VARCHAR(10) NOT NULL,
    old_subject_id   INT,
    old_duration     INT,
    new_duration     INT,
    changed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_audit_user ON audit_log(user_id, changed_at);

-- 7. View: per-subject totals
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

-- 8. Trigger: reject non-positive durations and sessions filed under another user's subject
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

-- 9. Triggers: audit trail of edits and deletions
DELIMITER //

CREATE TRIGGER tr_audit_session_update
AFTER UPDATE ON study_sessions
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user_id, session_id, action, old_subject_id, old_duration, new_duration)
    VALUES (OLD.user_id, OLD.id, 'UPDATE', OLD.subject_id, OLD.duration_minutes, NEW.duration_minutes);
END //

CREATE TRIGGER tr_audit_session_delete
AFTER DELETE ON study_sessions
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user_id, session_id, action, old_subject_id, old_duration, new_duration)
    VALUES (OLD.user_id, OLD.id, 'DELETE', OLD.subject_id, OLD.duration_minutes, NULL);
END //

DELIMITER ;

-- 10. View: hours per tag (JOIN across the M:N junction)
CREATE VIEW v_tag_summary AS
SELECT
    t.user_id,
    t.id AS tag_id,
    t.name AS tag_name,
    COUNT(ss.id) AS total_sessions,
    COALESCE(SUM(ss.duration_minutes), 0) AS total_minutes
FROM tags t
LEFT JOIN session_tags st ON st.tag_id = t.id
LEFT JOIN study_sessions ss ON ss.id = st.session_id
GROUP BY t.user_id, t.id, t.name;