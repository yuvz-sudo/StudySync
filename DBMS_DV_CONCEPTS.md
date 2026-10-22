# StudySync: 5th Semester DBMS & Data Visualization (DV) Concepts Guide

This guide documents the theoretical and practical concepts implemented in the minimalist **StudySync** project. It is structured specifically for 5th-semester academic evaluation, lab records, and viva-voce presentation.

---

## 1. Minimal Relational Database Architecture (DBMS)

The database was reduced from an over-engineered 9-table schema to a **clean, 3NF-compliant 3-table schema** designed to demonstrate all core syllabus requirements without distracting bloat.

### 1.1 Entity-Relationship (ER) Mapping

```
 [ users ]  1 ───────────────< N  [ subjects ]
     │                                   │
     │ 1                                 │ 1
     │                                   │
     └───────────────────< N  [ study_sessions ]
```

### 1.2 Table Specifications & Integrity Constraints

| Table Name | Primary Key | Foreign Keys | Key Constraints & Normalization |
| :--- | :--- | :--- | :--- |
| `users` | `id` (AUTO_INCREMENT) | None | `username UNIQUE`, `email UNIQUE`, `password_hash` (bcrypt), Atomic fields (1NF) |
| `subjects` | `id` (AUTO_INCREMENT) | `user_id` &rarr; `users(id)` | `ON DELETE CASCADE`, Composite Unique `(user_id, name)` |
| `study_sessions` | `id` (AUTO_INCREMENT) | `user_id` &rarr; `users(id)`, `subject_id` &rarr; `subjects(id)` | `ON DELETE CASCADE`, Domain Check `duration_minutes > 0` |

---

## 2. Normalization Analysis (1NF &rarr; 2NF &rarr; 3NF)

### First Normal Form (1NF)
- **Rule**: Every attribute contains only atomic (indivisible) values, and there are no repeating groups.
- **Implementation**: Attributes like `username`, `email`, `duration_minutes`, and `session_date` hold single scalar values.

### Second Normal Form (2NF)
- **Rule**: Must be in 1NF and have **no partial dependencies** (every non-prime attribute must depend on the whole candidate key).
- **Implementation**: Each table uses a single surrogate Primary Key (`id`). Therefore, partial dependency on a subset of a composite key is impossible.

### Third Normal Form (3NF)
- **Rule**: Must be in 2NF and have **no transitive dependencies** ($X \rightarrow Y \rightarrow Z$).
- **Implementation**: In `study_sessions`, only the foreign key `subject_id` is stored. Subject properties (like `name` and `color_code`) are retrieved via relational `JOIN` rather than stored redundantly in `study_sessions`.

---

## 3. SQL Concepts Demonstrated in Code

### 3.1 DDL (Data Definition Language)
- `CREATE TABLE` with constraints:
  ```sql
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
  );
  ```

### 3.2 DML (Data Manipulation Language)
- **INSERT**: Adding a new study session:
  ```sql
  INSERT INTO study_sessions (user_id, subject_id, duration_minutes, session_date, notes)
  VALUES (1, 2, 120, '2026-09-27', 'Matplotlib bar charts and line trends');
  ```
- **SELECT with Relational INNER JOIN**:
  ```sql
  SELECT ss.id, ss.duration_minutes, ss.session_date, s.name AS subject_name, s.color_code
  FROM study_sessions ss
  JOIN subjects s ON ss.subject_id = s.id
  WHERE ss.user_id = 1
  ORDER BY ss.session_date DESC;
  ```
- **UPDATE**: Modifying an existing study session record:
  ```sql
  UPDATE study_sessions 
  SET subject_id = 1, duration_minutes = 90, session_date = '2026-09-27', notes = 'Revised ER model and 3NF proofs'
  WHERE id = 5;
  ```
- **DELETE**: Enforcing referential integrity and transactional cleanup:
  ```sql
  DELETE FROM study_sessions WHERE id = 5;
  ```

### 3.3 Relational VIEW (`v_subject_study_summary`)
Demonstrates database-level abstraction and pre-computed aggregation:
```sql
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
```

### 3.4 Database TRIGGER (`tr_validate_session`)
Demonstrates active server-side constraint enforcement before data entry:
```sql
DELIMITER //
CREATE TRIGGER tr_validate_session
BEFORE INSERT ON study_sessions
FOR EACH ROW
BEGIN
    IF NEW.duration_minutes <= 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Study session duration must be greater than zero minutes';
    END IF;
END //
DELIMITER ;
```

---

## 4. Minimal Data Visualization (DV) Concepts

The Python analytics module (`analytics/visualize.py`) demonstrates the 3 foundational visualization types required by the 5th-semester DV syllabus.

### 4.1 Categorical Comparison: Bar Chart (`user_<id>_daily_study.png`)
- **DV Principle**: Discrete categorical comparison.
- **Implementation**:
  - X-axis: Subject names (categorical).
  - Y-axis: Aggregated study hours (continuous ratio).
  - Benchmark line (`axhline`): Target study quota line (5.0h) for immediate visual thresholding.
  - Data Annotations: Exact hours printed directly above each bar to eliminate visual estimation error.

### 4.2 Proportional Composition: Donut Chart (`user_<id>_subject_distribution.png`)
- **DV Principle**: Part-to-whole ratio analysis.
- **Implementation**:
  - Pie with `width=0.42` wedge cut-out (Donut aesthetic).
  - Percentages formatted via `autopct='%1.1f%%'`.
  - Semantic Color Encoding: Slice colors correspond directly to the subject hex colors stored in MySQL (`color_code`).

### 4.3 Longitudinal Progression: Line Chart (`user_<id>_study_trend.png`)
- **DV Principle**: Time-series momentum and trend analysis.
- **Implementation**:
  - X-axis: Chronological study dates.
  - Y-axis: Cumulative hours (`df['daily_hours'].cumsum()`).
  - Shaded area (`fill_between`): Highlights total study volume accumulation over the semester.

---

## 5. Viva-Voce Cheat Sheet (Common Examiner Questions)

**Q1: Why did you reduce the schema to 3 tables?**  
> *"To eliminate redundant entities (like mail logs and friend requests) that are irrelevant to study analytics. 3 tables (`users`, `subjects`, `study_sessions`) form a canonical 3NF schema that directly demonstrates Primary Keys, Foreign Keys, 1:N relations, Joins, Views, and Triggers without unnecessary complexity."*

**Q2: What is the benefit of using `ON DELETE CASCADE`?**  
> *"It maintains referential integrity. If a student user is deleted, all their subjects and session logs are automatically purged by the database engine, preventing orphaned foreign key rows."*

**Q3: How does your Python script interact with the database?**  
> *"It issues direct SQL queries through `PyMySQL`, loads the tabular result set into a `Pandas DataFrame`, performs vector-based aggregations (e.g., `cumsum()`, `groupby`), and generates figures via `Matplotlib`."*

**Q4: What is the difference between a View and a Table?**  
> *"A Table physically stores data on disk. A View is a virtual table defined by a stored SQL query that computes its contents dynamically upon execution, providing data abstraction and security."*

**Q5: Why is a Bar Chart preferred over a Pie Chart for comparing 10 or more subjects?**  
> *"Humans are much more accurate at comparing linear bar heights along a common axis than judging angular slices and area proportions in circular charts."*

---

## 6. How to Run the Project

See `README.md`.
