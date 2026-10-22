"""
=============================================================================
StudySync - Minimalist Data Visualization (DV) Engine
Technologies: Python 3, Pandas, NumPy, Matplotlib
Curriculum: 5th Semester CS - Data Visualization & DBMS Lab

2 Core Visualizations Demonstrated:
1. Categorical Comparison: Bar Chart (Last 7 days vs weekly goal per subject)
2. Time-Series Trend: Line Plot (Daily Study Volume & Cumulative Momentum)
=============================================================================
"""

import os
import argparse
import pymysql
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from urllib.parse import urlparse

# Directory Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Aesthetic Dark Theme Configuration for Visual Presentation
plt.style.use('dark_background')
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['axes.edgecolor'] = '#3f3f46'
plt.rcParams['axes.linewidth'] = 0.8


def get_db_connection():
    """Connect to the 3NF MySQL database or return None if offline."""
    db_url = os.getenv('DATABASE_URL', '')
    host = os.getenv('DB_HOST', 'localhost')
    port = int(os.getenv('DB_PORT', 3306))
    user = os.getenv('DB_USER', 'root')
    password = os.getenv('DB_PASSWORD', '')
    database = os.getenv('DB_NAME', 'studysync')

    if db_url.startswith('mysql://'):
        parsed = urlparse(db_url)
        host = parsed.hostname or host
        port = parsed.port or port
        user = parsed.username or user
        password = parsed.password or password
        if parsed.path and len(parsed.path) > 1:
            database = parsed.path[1:]

    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            connect_timeout=2,
            cursorclass=pymysql.cursors.DictCursor
        )
        return conn
    except Exception as e:
        return None


def save_empty_chart(user_id: int, name: str, title: str):
    """Placeholder figure for users with no sessions yet."""
    fig, ax = plt.subplots(figsize=(6.5, 3.8), dpi=120)
    fig.patch.set_facecolor('#121216')
    ax.set_facecolor('#121216')
    ax.set_title(title, fontsize=11, fontweight='bold', color='#f4f4f5', pad=12)
    ax.text(0.5, 0.5, 'No study sessions yet', ha='center', va='center', color='#a1a1aa', fontsize=10, transform=ax.transAxes)
    ax.axis('off')
    output_path = os.path.join(OUTPUT_DIR, f'user_{user_id}_{name}.png')
    plt.savefig(output_path, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)
    return output_path


# =============================================================================
# CHART 1: Categorical Comparison (Bar Chart) - this week's hours vs weekly goal
# DBMS Concept: LEFT JOIN of subjects to sessions and goals, GROUP BY, SUM
# DV Concept: Discrete bars, per-category benchmark markers
# =============================================================================
def generate_subject_hours_chart(user_id: int):
    query = """
        SELECT
            s.name AS subject_name,
            s.color_code,
            ROUND(COALESCE(SUM(ss.duration_minutes), 0) / 60.0, 2) AS total_hours,
            ROUND(MAX(g.weekly_target_minutes) / 60.0, 2) AS goal_hours
        FROM subjects s
        LEFT JOIN study_sessions ss
               ON ss.subject_id = s.id AND ss.session_date > DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        LEFT JOIN goals g ON g.subject_id = s.id AND g.user_id = s.user_id
        WHERE s.user_id = %s
        GROUP BY s.id, s.name, s.color_code
        ORDER BY total_hours DESC;
    """
    rows = []
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(query, (user_id,))
                rows = cur.fetchall()
        except Exception:
            pass
        finally:
            conn.close()

    df = pd.DataFrame(rows)
    title = 'Last 7 Days vs Weekly Goal (Bar Chart)'
    if df.empty:
        return save_empty_chart(user_id, 'daily_study', title)
    df['total_hours'] = df['total_hours'].astype(float)
    df['goal_hours'] = pd.to_numeric(df['goal_hours'], errors='coerce')

    fig, ax = plt.subplots(figsize=(6.5, 3.8), dpi=120)
    fig.patch.set_facecolor('#121216')
    ax.set_facecolor('#121216')

    x = np.arange(len(df))
    bars = ax.bar(x, df['total_hours'], color=df['color_code'].tolist(), width=0.45, edgecolor='#27272a', linewidth=1)

    # Per-subject goal markers (only where a goal exists)
    has_goal = df['goal_hours'].notna()
    for i in x[has_goal.to_numpy()]:
        ax.hlines(df['goal_hours'][i], i - 0.32, i + 0.32, color='#10b981', linestyle='--', linewidth=1.6)
    if has_goal.any():
        ax.plot([], [], color='#10b981', linestyle='--', label='Weekly goal')
        ax.legend(loc='upper right', frameon=False, fontsize=8)

    ax.set_xticks(x)
    ax.set_xticklabels(df['subject_name'], rotation=15, ha='right')
    ax.set_title(title, fontsize=11, fontweight='bold', color='#f4f4f5', pad=12)
    ax.set_ylabel('Hours', fontsize=9, color='#a1a1aa')
    ax.tick_params(colors='#a1a1aa', labelsize=8)
    ax.grid(axis='y', linestyle=':', alpha=0.2, color='#71717a')
    top = max(df['total_hours'].max(), df['goal_hours'].max() if has_goal.any() else 0)
    ax.set_ylim(0, max(top + 1.5, 2.0))

    # Direct Data Value Annotations
    for bar in bars:
        h = bar.get_height()
        ax.annotate(f'{h:.1f}h',
                    xy=(bar.get_x() + bar.get_width() / 2, h),
                    xytext=(0, 4), textcoords="offset points",
                    ha='center', va='bottom', fontsize=8, color='#f4f4f5', fontweight='bold')

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, f'user_{user_id}_daily_study.png')
    plt.savefig(output_path, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)
    return output_path


# =============================================================================
# CHART 2: Longitudinal Trend (Line Chart)
# DBMS Concept: Chronological aggregation (GROUP BY session_date, ORDER BY ASC)
# DV Concept: Time-series curve, rate of change, cumulative area visualization
# =============================================================================
def generate_study_trend_chart(user_id: int):
    query = """
        SELECT 
            session_date,
            ROUND(SUM(duration_minutes) / 60.0, 2) as daily_hours
        FROM study_sessions
        WHERE user_id = %s
        GROUP BY session_date
        ORDER BY session_date ASC;
    """
    rows = []
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(query, (user_id,))
                rows = cur.fetchall()
        except Exception:
            pass
        finally:
            conn.close()

    df = pd.DataFrame(rows)
    if df.empty:
        return save_empty_chart(user_id, 'study_trend', 'Cumulative Study Momentum (Line Chart)')
    df['daily_hours'] = df['daily_hours'].astype(float)
    df['session_date'] = df['session_date'].apply(
        lambda d: d.strftime('%b %d') if hasattr(d, 'strftime') else str(d)
    )

    # Compute Cumulative Study Hours (DV cumulative progression concept)
    df['cumulative_hours'] = df['daily_hours'].cumsum()

    fig, ax = plt.subplots(figsize=(6.5, 3.8), dpi=120)
    fig.patch.set_facecolor('#121216')
    ax.set_facecolor('#121216')

    # Plot Trend Line
    ax.plot(df['session_date'], df['cumulative_hours'], color='#38bdf8', marker='o', linewidth=2.2, markersize=5, label='Cumulative Study Hours')
    ax.fill_between(df['session_date'], df['cumulative_hours'], color='#38bdf8', alpha=0.15)

    ax.set_title('Cumulative Study Momentum (Line Chart)', fontsize=11, fontweight='bold', color='#f4f4f5', pad=12)
    ax.set_ylabel('Total Hours', fontsize=9, color='#a1a1aa')
    ax.tick_params(colors='#a1a1aa', labelsize=8)
    plt.xticks(rotation=15, ha='right')
    ax.grid(True, linestyle=':', alpha=0.2, color='#71717a')
    ax.legend(loc='upper left', frameon=False, fontsize=8)

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, f'user_{user_id}_study_trend.png')
    plt.savefig(output_path, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)
    return output_path


def generate_all_charts(user_id: int = 1):
    """Generate the 2 minimal DV visualizations."""
    p1 = generate_subject_hours_chart(user_id)
    p2 = generate_study_trend_chart(user_id)
    print(f"Generated DV charts successfully for user {user_id}:")
    print(f" 1. Bar Chart: {p1}")
    print(f" 2. Line Trend: {p2}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="StudySync Minimalist Data Visualizer")
    parser.add_argument('--user', type=int, default=1, help='User ID to visualize')
    args = parser.parse_args()
    generate_all_charts(args.user)
