"""
=============================================================================
StudySync - Minimalist Data Visualization (DV) Engine
Technologies: Python 3, Pandas, NumPy, Matplotlib
Curriculum: 5th Semester CS - Data Visualization & DBMS Lab

3 Core Visualizations Demonstrated:
1. Categorical Comparison: Bar Chart (Subject Study Volume vs Quota)
2. Composition / Proportion: Donut Chart (Time Allocation Across Subjects)
3. Time-Series Trend: Line Plot (Daily Study Volume & Cumulative Momentum)
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
# CHART 1: Categorical Comparison (Bar Chart)
# DBMS Concept: Aggregating by Subject (INNER JOIN, SUM, GROUP BY)
# DV Concept: Discrete bars, categorical comparison against a benchmark line
# =============================================================================
def generate_subject_hours_chart(user_id: int):
    query = """
        SELECT 
            s.name as subject_name,
            s.color_code,
            ROUND(SUM(ss.duration_minutes) / 60.0, 2) as total_hours
        FROM study_sessions ss
        JOIN subjects s ON ss.subject_id = s.id
        WHERE ss.user_id = %s
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
    if df.empty:
        return save_empty_chart(user_id, 'daily_study', 'Subject Study Hours (Bar Chart)')
    df['total_hours'] = df['total_hours'].astype(float)

    fig, ax = plt.subplots(figsize=(6.5, 3.8), dpi=120)
    fig.patch.set_facecolor('#121216')
    ax.set_facecolor('#121216')

    colors = df['color_code'].tolist()
    bars = ax.bar(df['subject_name'], df['total_hours'], color=colors, width=0.45, edgecolor='#27272a', linewidth=1)

    # DV Benchmark target reference line
    target_hours = 5.0
    ax.axhline(y=target_hours, color='#10b981', linestyle='--', linewidth=1.2, label=f'Target ({target_hours}h/subject)')

    ax.set_title('Subject Study Hours (Bar Chart)', fontsize=11, fontweight='bold', color='#f4f4f5', pad=12)
    ax.set_ylabel('Total Hours', fontsize=9, color='#a1a1aa')
    ax.tick_params(colors='#a1a1aa', labelsize=8)
    plt.xticks(rotation=15, ha='right')
    ax.grid(axis='y', linestyle=':', alpha=0.2, color='#71717a')
    ax.set_ylim(0, max(df['total_hours'].max() + 1.5, 6.0))
    ax.legend(loc='upper right', frameon=False, fontsize=8)

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
# CHART 2: Proportional Composition (Donut / Pie Chart)
# DBMS Concept: Relative proportions computed via Relational Aggregation
# DV Concept: Part-to-whole relationship, percentage slices, color semantics
# =============================================================================
def generate_subject_distribution_chart(user_id: int):
    query = """
        SELECT 
            s.name as subject_name,
            s.color_code,
            SUM(ss.duration_minutes) as minutes
        FROM study_sessions ss
        JOIN subjects s ON ss.subject_id = s.id
        WHERE ss.user_id = %s
        GROUP BY s.id, s.name, s.color_code
        ORDER BY minutes DESC;
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
        return save_empty_chart(user_id, 'subject_distribution', 'Study Time Distribution (Donut Chart)')
    df['minutes'] = df['minutes'].astype(float)

    fig, ax = plt.subplots(figsize=(6.0, 3.8), dpi=120)
    fig.patch.set_facecolor('#121216')
    ax.set_facecolor('#121216')

    colors = df['color_code'].tolist()
    wedges, texts, autotexts = ax.pie(
        df['minutes'],
        labels=df['subject_name'],
        autopct='%1.1f%%',
        startangle=140,
        colors=colors,
        pctdistance=0.75,
        wedgeprops=dict(width=0.42, edgecolor='#121216', linewidth=2)
    )

    for t in texts:
        t.set_color('#d4d4d8')
        t.set_fontsize(8)
    for at in autotexts:
        at.set_color('#ffffff')
        at.set_fontsize(7.5)
        at.set_fontweight('bold')

    ax.set_title('Study Time Distribution (Donut Chart)', fontsize=11, fontweight='bold', color='#f4f4f5', pad=12)
    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, f'user_{user_id}_subject_distribution.png')
    plt.savefig(output_path, facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)
    return output_path


# =============================================================================
# CHART 3: Longitudinal Trend (Line Chart)
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
    """Generate all 3 minimal DV visualizations."""
    p1 = generate_subject_hours_chart(user_id)
    p2 = generate_subject_distribution_chart(user_id)
    p3 = generate_study_trend_chart(user_id)
    print(f"Generated DV charts successfully for user {user_id}:")
    print(f" 1. Bar Chart: {p1}")
    print(f" 2. Donut Chart: {p2}")
    print(f" 3. Line Trend: {p3}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="StudySync Minimalist Data Visualizer")
    parser.add_argument('--user', type=int, default=1, help='User ID to visualize')
    args = parser.parse_args()
    generate_all_charts(args.user)
