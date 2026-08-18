-- ==========================================
-- StudySync Database DDL Schema (MySQL 8.0)
-- ==========================================

-- ------------------------------------------
-- 1. Users Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    xp INT NOT NULL DEFAULT 0,
    coins INT NOT NULL DEFAULT 0,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_active_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_xp CHECK (xp >= 0),
    CONSTRAINT chk_users_coins CHECK (coins >= 0),
    CONSTRAINT chk_users_current_streak CHECK (current_streak >= 0),
    CONSTRAINT chk_users_longest_streak CHECK (longest_streak >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leaderboard & sorting indexes
CREATE INDEX idx_users_xp ON users (xp DESC);
CREATE INDEX idx_users_current_streak ON users (current_streak DESC);

-- ------------------------------------------
-- 2. User Settings Table (1:1 with Users)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
    user_id BIGINT NOT NULL,
    daily_study_goal_seconds INT NOT NULL DEFAULT 7200, -- Default: 2 hours
    is_email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    theme VARCHAR(20) NOT NULL DEFAULT 'dark',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_settings_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_settings_goal CHECK (daily_study_goal_seconds >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------
-- 3. Subjects Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id BIGINT AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color_code CHAR(7) NOT NULL DEFAULT '#3B82F6', -- Hex color code, e.g. #3B82F6
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_subjects_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_subject_name UNIQUE (user_id, name),
    CONSTRAINT chk_subjects_color CHECK (color_code REGEXP '^#[0-9A-Fa-f]{6}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_subjects_user_id ON subjects (user_id);

-- ------------------------------------------
-- 4. Study Sessions Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS study_sessions (
    id BIGINT AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL DEFAULT NULL,
    duration_seconds INT NULL DEFAULT NULL,
    status ENUM('ACTIVE', 'PAUSED', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_study_sessions_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_study_sessions_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT,
    CONSTRAINT chk_sessions_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    CONSTRAINT chk_sessions_end_time CHECK (end_time IS NULL OR end_time >= start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sessions_user_time ON study_sessions (user_id, start_time);
CREATE INDEX idx_sessions_subject_id ON study_sessions (subject_id);
CREATE INDEX idx_sessions_active ON study_sessions (user_id, status);

-- ------------------------------------------
-- 5. Groups Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS `groups` (
    id BIGINT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    creator_id BIGINT NOT NULL,
    invite_code VARCHAR(10) NOT NULL,
    max_members INT NOT NULL DEFAULT 50,
    current_members_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_groups_creator FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT uq_groups_invite_code UNIQUE (invite_code),
    CONSTRAINT chk_groups_max_members CHECK (max_members > 0),
    CONSTRAINT chk_groups_member_bounds CHECK (current_members_count >= 1 AND current_members_count <= max_members)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_groups_invite_code ON `groups` (invite_code);

-- ------------------------------------------
-- 6. Group Members Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS group_members (
    id BIGINT AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role ENUM('LEADER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_group_members_groups FOREIGN KEY (group_id) REFERENCES `groups` (id) ON DELETE CASCADE,
    CONSTRAINT fk_group_members_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_group_member UNIQUE (group_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_group_members_user_id ON group_members (user_id);
CREATE INDEX idx_group_members_group_id ON group_members (group_id);

-- ------------------------------------------
-- 7. Friends Table (Bidirectional representation with user_id_1 < user_id_2)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS friends (
    user_id_1 BIGINT NOT NULL,
    user_id_2 BIGINT NOT NULL,
    established_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id_1, user_id_2),
    CONSTRAINT fk_friends_user_1 FOREIGN KEY (user_id_1) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_friends_user_2 FOREIGN KEY (user_id_2) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT chk_friends_order CHECK (user_id_1 < user_id_2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for searching from the opposite side
CREATE INDEX idx_friends_reversed ON friends (user_id_2, user_id_1);

-- ------------------------------------------
-- 8. Friend Requests Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS friend_requests (
    id BIGINT AUTO_INCREMENT,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    status ENUM('PENDING', 'ACCEPTED', 'DECLINED') NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_friend_requests_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_friend_requests_receiver FOREIGN KEY (receiver_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_sender_receiver UNIQUE (sender_id, receiver_id),
    CONSTRAINT chk_friend_req_not_self CHECK (sender_id <> receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_friend_req_receiver ON friend_requests (receiver_id, status);

-- ------------------------------------------
-- 9. Notifications Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);

-- ------------------------------------------
-- 10. Achievements Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
    id BIGINT AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NOT NULL,
    xp_reward INT NOT NULL DEFAULT 0,
    coin_reward INT NOT NULL DEFAULT 0,
    icon_url VARCHAR(255) NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT uq_achievements_code UNIQUE (code),
    CONSTRAINT chk_achievements_xp CHECK (xp_reward >= 0),
    CONSTRAINT chk_achievements_coins CHECK (coin_reward >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------
-- 11. User Achievements Table (M:N Junction)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id BIGINT NOT NULL,
    achievement_id BIGINT NOT NULL,
    unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, achievement_id),
    CONSTRAINT fk_user_achievements_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_achievements_achievements FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_achievements_ach_id ON user_achievements (achievement_id);

-- ------------------------------------------
-- 12. Rewards Table (Shop Items)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS rewards (
    id BIGINT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    cost_coins INT NOT NULL,
    item_type ENUM('THEME', 'AVATAR_FRAME', 'SOUND') NOT NULL,
    resource_identifier VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT chk_rewards_cost CHECK (cost_coins >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------
-- 13. User Rewards Table (M:N Inventory)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS user_rewards (
    id BIGINT AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    reward_id BIGINT NOT NULL,
    purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_user_rewards_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_rewards_rewards FOREIGN KEY (reward_id) REFERENCES rewards (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_reward UNIQUE (user_id, reward_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_rewards_user ON user_rewards (user_id);

-- ------------------------------------------
-- 14. Ambient Sounds Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS ambient_sounds (
    id BIGINT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    audio_url VARCHAR(255) NOT NULL,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    reward_id BIGINT NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_ambient_sounds_rewards FOREIGN KEY (reward_id) REFERENCES rewards (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ambient_sounds_premium ON ambient_sounds (is_premium);

-- ------------------------------------------
-- 15. Quotes Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
    id INT AUTO_INCREMENT,
    content TEXT NOT NULL,
    author VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------
-- 16. Mail Logs Table
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS mail_logs (
    id BIGINT AUTO_INCREMENT,
    user_id BIGINT NULL DEFAULT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_name VARCHAR(50) NOT NULL,
    status ENUM('SENT', 'FAILED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL DEFAULT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_mail_logs_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_mail_recipient ON mail_logs (recipient_email);
CREATE INDEX idx_mail_sent_at ON mail_logs (sent_at);

-- ------------------------------------------
-- 17. User Daily Summaries Table (Analytics Roll-up)
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS user_daily_summaries (
    id BIGINT AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    study_date DATE NOT NULL,
    total_duration_seconds INT NOT NULL DEFAULT 0,
    sessions_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    CONSTRAINT fk_daily_summary_users FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_daily_summary_subjects FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_subject_date UNIQUE (user_id, subject_id, study_date),
    CONSTRAINT chk_summary_duration CHECK (total_duration_seconds >= 0),
    CONSTRAINT chk_summary_sessions CHECK (sessions_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_daily_summary_user_date ON user_daily_summaries (user_id, study_date);
CREATE INDEX idx_daily_summary_date ON user_daily_summaries (study_date);


-- ==========================================
-- VIEWS
-- ==========================================

-- Global Leaderboard View (Rank by XP)
CREATE OR REPLACE VIEW v_leaderboard_global AS
SELECT 
    RANK() OVER (ORDER BY xp DESC) AS global_rank,
    id AS user_id, 
    username, 
    xp, 
    current_streak
FROM users;

-- Live Active Study Sessions View
CREATE OR REPLACE VIEW v_active_study_sessions AS
SELECT 
    u.id AS user_id,
    u.username,
    s.id AS session_id,
    sub.name AS subject_name,
    s.start_time
FROM study_sessions s
JOIN users u ON s.user_id = u.id
JOIN subjects sub ON s.subject_id = sub.id
WHERE s.status = 'ACTIVE';


-- ==========================================
-- STORED PROCEDURES
-- ==========================================

DELIMITER //

-- Stored Procedure to purchase rewards with full ACID validation
CREATE PROCEDURE sp_purchase_reward(
    IN p_user_id BIGINT,
    IN p_reward_id BIGINT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_cost INT;
    DECLARE v_user_coins INT;
    DECLARE v_already_owned INT;
    
    -- Transaction error handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Database error occurred. Purchase rolled back.';
    END;

    START TRANSACTION;
    
    -- 1. Check if user already owns this reward
    SELECT COUNT(*) INTO v_already_owned 
    FROM user_rewards 
    WHERE user_id = p_user_id AND reward_id = p_reward_id;
    
    IF v_already_owned > 0 THEN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Reward already unlocked.';
    ELSE
        -- 2. Fetch reward cost
        SELECT cost_coins INTO v_cost FROM rewards WHERE id = p_reward_id;
        
        -- 3. Fetch user coin balance
        SELECT coins INTO v_user_coins FROM users WHERE id = p_user_id;
        
        IF v_user_coins < v_cost THEN
            ROLLBACK;
            SET p_success = FALSE;
            SET p_message = 'Insufficient coins.';
        ELSE
            -- 4. Deduct coins
            UPDATE users SET coins = coins - v_cost WHERE id = p_user_id;
            
            -- 5. Add to user inventory
            INSERT INTO user_rewards (user_id, reward_id) VALUES (p_user_id, p_reward_id);
            
            COMMIT;
            SET p_success = TRUE;
            SET p_message = 'Reward purchased successfully.';
        END IF;
    END IF;
END //

DELIMITER ;


-- ==========================================
-- TRIGGERS
-- ==========================================

DELIMITER //

-- Group Membership Count Triggers
CREATE TRIGGER tr_after_group_member_insert
AFTER INSERT ON group_members
FOR EACH ROW
BEGIN
    UPDATE `groups` 
    SET current_members_count = current_members_count + 1 
    WHERE id = NEW.group_id;
END //

CREATE TRIGGER tr_after_group_member_delete
AFTER DELETE ON group_members
FOR EACH ROW
BEGIN
    UPDATE `groups` 
    SET current_members_count = current_members_count - 1 
    WHERE id = OLD.group_id;
END //

-- Auto-Aggregate Study Sessions trigger
CREATE TRIGGER tr_after_study_session_completed
AFTER UPDATE ON study_sessions
FOR EACH ROW
BEGIN
    IF OLD.status != 'COMPLETED' AND NEW.status = 'COMPLETED' AND NEW.duration_seconds IS NOT NULL THEN
        INSERT INTO user_daily_summaries (user_id, subject_id, study_date, total_duration_seconds, sessions_count)
        VALUES (
            NEW.user_id, 
            NEW.subject_id, 
            DATE(NEW.start_time), 
            NEW.duration_seconds, 
            1
        )
        ON DUPLICATE KEY UPDATE 
            total_duration_seconds = total_duration_seconds + NEW.duration_seconds,
            sessions_count = sessions_count + 1;
    END IF;
END //

DELIMITER ;
