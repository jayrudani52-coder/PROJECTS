import streamlit as st
import sqlite3
import matplotlib.pyplot as plt
import hashlib
import secrets
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import json
import os
import time
import logging
from typing import Optional, Dict, List, Tuple
import re

# ================= CONFIGURATION =================
st.set_page_config(
    page_title="Fitness Tracker",
    page_icon="💪",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .main-header {
        font-size: 3rem;
        color: #FF4B4B;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 10px;
        text-align: center;
    }
    .success-text {
        color: #28a745;
        font-weight: bold;
    }
    .warning-text {
        color: #ffc107;
        font-weight: bold;
    }
    .danger-text {
        color: #dc3545;
        font-weight: bold;
    }
    </style>
""", unsafe_allow_html=True)

# ================= LOGGING SETUP =================
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ================= DATABASE SETUP =================
@st.cache_resource
def init_database():
    conn = sqlite3.connect("fitness_pro.db", check_same_thread=False)
    cursor = conn.cursor()
    
    # Users table with enhanced fields
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        salt TEXT,
        email TEXT UNIQUE,
        full_name TEXT,
        age INTEGER,
        weight REAL,
        height REAL,
        gender TEXT,
        fitness_level TEXT DEFAULT 'Beginner',
        daily_calorie_goal INTEGER DEFAULT 2000,
        daily_water_goal INTEGER DEFAULT 8,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        role TEXT DEFAULT 'user'
    )
    """)
    
    # User activities table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activities (
        activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        activity_type TEXT,
        duration INTEGER,
        calories_burned INTEGER,
        distance REAL,
        intensity TEXT,
        notes TEXT,
        activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )
    """)
    
    # Nutrition tracking
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS nutrition (
        entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        meal_type TEXT,
        food_item TEXT,
        calories INTEGER,
        protein REAL,
        carbs REAL,
        fats REAL,
        entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )
    """)
    
    # Water intake
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS water_intake (
        entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        glasses INTEGER,
        entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )
    """)
    
    # Weight history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weight_history (
        entry_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        weight REAL,
        bmi REAL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )
    """)
    
    # Workout plans
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workout_plans (
        plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        plan_name TEXT,
        exercises TEXT,
        schedule TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )
    """)
    
    # Achievements
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS achievements (
        achievement_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        achievement_name TEXT,
        achievement_description TEXT,
        achieved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    )
    """)
    
    conn.commit()
    return conn, cursor

conn, cursor = init_database()

# ================= AI INTEGRATION =================
class AITrainer:
    def __init__(self):
        self.groq_api_key = st.secrets.get("GROQ_API_KEY", os.getenv("GROQ_API_KEY"))
        self.use_ai = self.groq_api_key is not None
        
        if self.use_ai:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.groq_api_key)
                logger.info("Groq AI initialized successfully")
            except ImportError:
                logger.warning("Groq package not installed. Using rule-based responses.")
                self.use_ai = False
    def get_personalized_advice(self, user_data: Dict, query: str) -> str:

        if not self.use_ai:
            return "AI not configured."

        try:
            system_prompt = f"""
You are a professional AI fitness coach.
Give structured and detailed answers.
"""

            messages = [{"role": "system", "content": system_prompt}]

            # Safe chat history formatting
            for msg in st.session_state.chat_history:
                if isinstance(msg, dict) and "role" in msg and "content" in msg:
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })

            messages.append({"role": "user", "content": query})

            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.7,
                max_tokens=700
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"AI DEBUG ERROR: {str(e)}"


# ================= SECURITY FUNCTIONS =================
class SecurityManager:
    @staticmethod
    def hash_password(password: str) -> Tuple[str, str]:
        salt = secrets.token_hex(16)
        hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return salt, hash_obj.hex()
    
    @staticmethod
    def verify_password(stored_salt: str, stored_hash: str, password: str) -> bool:
        hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), stored_salt.encode(), 100000)
        return hash_obj.hex() == stored_hash
    
    @staticmethod
    def validate_email(email: str) -> bool:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_password_strength(password: str) -> Tuple[bool, str]:
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        if not re.search(r"[A-Z]", password):
            return False, "Password must contain at least one uppercase letter"
        if not re.search(r"[a-z]", password):
            return False, "Password must contain at least one lowercase letter"
        if not re.search(r"\d", password):
            return False, "Password must contain at least one number"
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            return False, "Password must contain at least one special character"
        return True, "Password is strong"

# ================= FITNESS TRACKER CORE =================
class FitnessTrackerPro:
    def __init__(self, conn, cursor):
        self.conn = conn
        self.cursor = cursor
        self.ai_trainer = AITrainer()
        self.security = SecurityManager()
    
    # ---------- USER MANAGEMENT ----------
    def create_user(self, username: str, password: str, email: str, full_name: str, 
                   age: int, weight: float, height: float, gender: str) -> Optional[int]:
        try:
            salt, password_hash = self.security.hash_password(password)
            self.cursor.execute("""
                INSERT INTO users 
                (username, password_hash, salt, email, full_name, age, weight, height, gender)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (username, password_hash, salt, email, full_name, age, weight, height, gender))
            self.conn.commit()
            
            # Add initial weight history
            user_id = self.cursor.lastrowid
            bmi = self.calculate_bmi(weight, height)
            self.add_weight_history(user_id, weight, bmi)
            
            return user_id
        except sqlite3.IntegrityError as e:
            logger.error(f"User creation failed: {e}")
            return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        self.cursor.execute("""
            SELECT user_id, username, password_hash, salt, full_name, age, weight, height, 
                   gender, fitness_level, daily_calorie_goal, daily_water_goal, role
            FROM users WHERE username=? AND is_active=1
        """, (username,))
        user = self.cursor.fetchone()
        
        if user and self.security.verify_password(user[3], user[2], password):
            # Update last login
            self.cursor.execute("UPDATE users SET last_login=? WHERE user_id=?", 
                              (datetime.now(), user[0]))
            self.conn.commit()
            
            return {
                'user_id': user[0],
                'username': user[1],
                'full_name': user[4],
                'age': user[5],
                'weight': user[6],
                'height': user[7],
                'gender': user[8],
                'fitness_level': user[9],
                'daily_calorie_goal': user[10],
                'daily_water_goal': user[11],
                'role': user[12]
            }
        return None
    
    def get_user_profile(self, user_id: int) -> Optional[Dict]:
        self.cursor.execute("""
            SELECT user_id, username, full_name, age, weight, height, gender, 
                   fitness_level, daily_calorie_goal, daily_water_goal, created_at
            FROM users WHERE user_id=?
        """, (user_id,))
        user = self.cursor.fetchone()
        
        if user:
            return {
                'user_id': user[0],
                'username': user[1],
                'full_name': user[2],
                'age': user[3],
                'weight': user[4],
                'height': user[5],
                'gender': user[6],
                'fitness_level': user[7],
                'daily_calorie_goal': user[8],
                'daily_water_goal': user[9],
                'member_since': user[10]
            }
        return None
    
    def update_profile(self, user_id: int, **kwargs) -> bool:
        try:
            allowed_fields = ['weight', 'height', 'fitness_level', 'daily_calorie_goal', 'daily_water_goal']
            updates = []
            values = []
            
            for field, value in kwargs.items():
                if field in allowed_fields:
                    updates.append(f"{field}=?")
                    values.append(value)
            
            if updates:
                values.append(user_id)
                query = f"UPDATE users SET {', '.join(updates)} WHERE user_id=?"
                self.cursor.execute(query, values)
                self.conn.commit()
                
                # If weight updated, add to history
                if 'weight' in kwargs:
                    bmi = self.calculate_bmi(kwargs['weight'], kwargs.get('height', 0))
                    self.add_weight_history(user_id, kwargs['weight'], bmi)
                
                return True
        except Exception as e:
            logger.error(f"Profile update failed: {e}")
        return False
    
    # ---------- BMI CALCULATIONS ----------
    def calculate_bmi(self, weight: float, height: float) -> float:
        if height <= 0:
            return 0
        return round(weight / ((height / 100) ** 2), 2)
    
    def get_bmi_category(self, bmi: float) -> Tuple[str, str, str]:
        if bmi < 18.5:
            return "Underweight", "🔵", "Focus on nutrient-dense foods and strength training"
        elif bmi < 25:
            return "Normal", "🟢", "Maintain healthy habits with balanced diet and exercise"
        elif bmi < 30:
            return "Overweight", "🟠", "Consider portion control and regular cardio exercise"
        else:
            return "Obese", "🔴", "Consult healthcare provider for personalized plan"
    
    # ---------- WEIGHT TRACKING ----------
    def add_weight_history(self, user_id: int, weight: float, bmi: float):
        self.cursor.execute("""
            INSERT INTO weight_history (user_id, weight, bmi)
            VALUES (?, ?, ?)
        """, (user_id, weight, bmi))
        self.conn.commit()
    
    def get_weight_history(self, user_id: int, days: int = 30) -> List[Tuple]:
        self.cursor.execute("""
            SELECT weight, bmi, recorded_at
            FROM weight_history
            WHERE user_id=? AND recorded_at >= datetime('now', ?)
            ORDER BY recorded_at
        """, (user_id, f'-{days} days'))
        return self.cursor.fetchall()
    
    # ---------- ACTIVITY TRACKING ----------
    def log_activity(self, user_id: int, activity_type: str, duration: int, 
                    calories: int, distance: float = None, intensity: str = "Moderate", 
                    notes: str = "") -> bool:
        try:
            self.cursor.execute("""
                INSERT INTO activities 
                (user_id, activity_type, duration, calories_burned, distance, intensity, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, activity_type, duration, calories, distance, intensity, notes))
            self.conn.commit()
            
            # Check for achievements
            self.check_achievements(user_id)
            
            return True
        except Exception as e:
            logger.error(f"Activity logging failed: {e}")
            return False
    
    def get_user_activities(self, user_id: int, days: int = 7) -> List[Tuple]:
        self.cursor.execute("""
            SELECT activity_type, duration, calories_burned, distance, intensity, activity_date
            FROM activities
            WHERE user_id=? AND activity_date >= datetime('now', ?)
            ORDER BY activity_date DESC
        """, (user_id, f'-{days} days'))
        return self.cursor.fetchall()
    
    def get_activity_summary(self, user_id: int, days: int = 7) -> Dict:
        self.cursor.execute("""
            SELECT 
                COUNT(*) as total_activities,
                SUM(duration) as total_duration,
                SUM(calories_burned) as total_calories,
                AVG(calories_burned) as avg_calories
            FROM activities
            WHERE user_id=? AND activity_date >= datetime('now', ?)
        """, (user_id, f'-{days} days'))
        result = self.cursor.fetchone()
        
        return {
            'total_activities': result[0] or 0,
            'total_duration': result[1] or 0,
            'total_calories': result[2] or 0,
            'avg_calories': round(result[3] or 0, 2)
        }
    
    # ---------- NUTRITION TRACKING ----------
    def log_meal(self, user_id: int, meal_type: str, food_item: str, 
                calories: int, protein: float, carbs: float, fats: float) -> bool:
        try:
            self.cursor.execute("""
                INSERT INTO nutrition (user_id, meal_type, food_item, calories, protein, carbs, fats)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, meal_type, food_item, calories, protein, carbs, fats))
            self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Meal logging failed: {e}")
            return False
    
    def get_daily_nutrition(self, user_id: int, date: str = None) -> Dict:
        if not date:
            date = datetime.now().strftime('%Y-%m-%d')
        
        self.cursor.execute("""
            SELECT 
                SUM(calories) as total_calories,
                SUM(protein) as total_protein,
                SUM(carbs) as total_carbs,
                SUM(fats) as total_fats,
                COUNT(*) as meals_count
            FROM nutrition
            WHERE user_id=? AND DATE(entry_date) = ?
        """, (user_id, date))
        
        result = self.cursor.fetchone()
        return {
            'calories': result[0] or 0,
            'protein': result[1] or 0,
            'carbs': result[2] or 0,
            'fats': result[3] or 0,
            'meals': result[4] or 0
        }
    
    # ---------- WATER INTAKE ----------
    def log_water(self, user_id: int, glasses: int) -> bool:
        try:
            self.cursor.execute("""
                INSERT INTO water_intake (user_id, glasses)
                VALUES (?, ?)
            """, (user_id, glasses))
            self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Water logging failed: {e}")
            return False
    
    def get_daily_water(self, user_id: int) -> int:
        today = datetime.now().strftime('%Y-%m-%d')
        self.cursor.execute("""
            SELECT SUM(glasses) FROM water_intake
            WHERE user_id=? AND DATE(entry_date) = ?
        """, (user_id, today))
        result = self.cursor.fetchone()
        return result[0] or 0
    
    # ---------- WORKOUT PLANS ----------
    def create_workout_plan(self, user_id: int, plan_name: str, exercises: List, schedule: Dict) -> bool:
        try:
            exercises_json = json.dumps(exercises)
            schedule_json = json.dumps(schedule)
            
            self.cursor.execute("""
                INSERT INTO workout_plans (user_id, plan_name, exercises, schedule)
                VALUES (?, ?, ?, ?)
            """, (user_id, plan_name, exercises_json, schedule_json))
            self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Workout plan creation failed: {e}")
            return False
    
    def get_workout_plans(self, user_id: int) -> List[Dict]:
        self.cursor.execute("""
            SELECT plan_id, plan_name, exercises, schedule, created_at
            FROM workout_plans WHERE user_id=?
        """, (user_id,))
        plans = []
        for plan in self.cursor.fetchall():
            plans.append({
                'plan_id': plan[0],
                'plan_name': plan[1],
                'exercises': json.loads(plan[2]),
                'schedule': json.loads(plan[3]),
                'created_at': plan[4]
            })
        return plans
    
    # ---------- ACHIEVEMENTS ----------
    def check_achievements(self, user_id: int):
        """Check and award achievements"""
        achievements = []
        
        # First workout achievement
        self.cursor.execute("SELECT COUNT(*) FROM activities WHERE user_id=?", (user_id,))
        if self.cursor.fetchone()[0] == 1:
            achievements.append(("First Workout", "Completed your first workout!"))
        
        # 10 workouts achievement
        self.cursor.execute("SELECT COUNT(*) FROM activities WHERE user_id=?", (user_id,))
        if self.cursor.fetchone()[0] >= 10:
            achievements.append(("Getting Serious", "Completed 10 workouts!"))
        
        # Perfect week achievement
        self.cursor.execute("""
            SELECT COUNT(DISTINCT DATE(activity_date)) 
            FROM activities 
            WHERE user_id=? AND activity_date >= datetime('now', '-7 days')
        """, (user_id,))
        if self.cursor.fetchone()[0] >= 5:
            achievements.append(("Consistency King", "Worked out 5 days in a week!"))
        
        # Award achievements
        for achievement in achievements:
            self.cursor.execute("""
                INSERT OR IGNORE INTO achievements (user_id, achievement_name, achievement_description)
                VALUES (?, ?, ?)
            """, (user_id, achievement[0], achievement[1]))
        
        self.conn.commit()
    
    def get_achievements(self, user_id: int) -> List[Dict]:
        self.cursor.execute("""
            SELECT achievement_name, achievement_description, achieved_date
            FROM achievements WHERE user_id=?
            ORDER BY achieved_date DESC
        """, (user_id,))
        
        achievements = []
        for ach in self.cursor.fetchall():
            achievements.append({
                'name': ach[0],
                'description': ach[1],
                'date': ach[2]
            })
        return achievements
    
    # ---------- AI ADVICE ----------
    def get_ai_coaching(self, user_id: int, query: str) -> str:
        user = self.get_user_profile(user_id)
        if user:
            user['bmi'] = self.calculate_bmi(user['weight'], user['height'])
            return self.ai_trainer.get_personalized_advice(user, query)
        return "Unable to provide advice at this moment."
    
    # ---------- PROGRESS REPORTS ----------
    def generate_progress_report(self, user_id: int) -> Dict:
        """Generate comprehensive progress report"""
        user = self.get_user_profile(user_id)
        if not user:
            return {}
        
        # Get weight history
        weight_history = self.get_weight_history(user_id, 90)  # Last 90 days
        
        # Get activity summary
        activity_summary = self.get_activity_summary(user_id, 30)
        
        # Calculate trends
        weight_trend = "stable"
        if len(weight_history) >= 2:
            first_weight = weight_history[0][0]
            last_weight = weight_history[-1][0]
            if last_weight < first_weight - 1:
                weight_trend = "decreasing"
            elif last_weight > first_weight + 1:
                weight_trend = "increasing"
        
        return {
            'user': user,
            'weight_history': weight_history,
            'activity_summary': activity_summary,
            'weight_trend': weight_trend,
            'report_date': datetime.now().strftime('%Y-%m-%d %H:%M')
        }

# ================= INITIALIZE TRACKER =================
tracker = FitnessTrackerPro(conn, cursor)

# ================= SESSION STATE MANAGEMENT =================
def init_session_state():
    if 'user_id' not in st.session_state:
        st.session_state.user_id = None
    if 'page' not in st.session_state:
        st.session_state.page = 'login'
    if 'last_activity' not in st.session_state:
        st.session_state.last_activity = time.time()
    if 'theme' not in st.session_state:
        st.session_state.theme = 'light'
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []


init_session_state()

# ================= SESSION TIMEOUT CHECK =================
def check_session_timeout():
    if st.session_state.user_id:
        if time.time() - st.session_state.last_activity > 1800:  # 30 minutes
            st.session_state.clear()
            st.warning("Session expired. Please login again.")
            return True
    st.session_state.last_activity = time.time()
    return False

# ================= UI COMPONENTS =================
def render_header():
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown("<h1 class='main-header'>💪 AI Fitness Tracker Pro</h1>", unsafe_allow_html=True)

def render_sidebar():
    with st.sidebar:
        if st.session_state.user_id:
            user = tracker.get_user_profile(st.session_state.user_id)
            if user:
                st.image("https://via.placeholder.com/150", caption=f"Welcome, {user['full_name']}!")
                
                # Navigation
                st.markdown("---")
                pages = {
                    "🏠 Dashboard": "dashboard",
                    "📊 Progress Tracking": "progress",
                    "🏃 Activities": "activities",
                    "🥗 Nutrition": "nutrition",
                    "💧 Water Intake": "water",
                    "🎯 Workout Plans": "workouts",
                    "🏆 Achievements": "achievements",
                    "🤖 AI Coach": "ai_coach",
                    "📈 Reports": "reports",
                    "⚙️ Settings": "settings"
                }
                
                for page_name, page_key in pages.items():
                    if st.button(page_name, key=f"nav_{page_key}", use_container_width=True):
                        st.session_state.page = page_key
                
                st.markdown("---")
                if st.button("🚪 Logout", use_container_width=True):
                    st.session_state.clear()
                    st.rerun()
        else:
            st.markdown("### Welcome to AI Fitness Tracker")
            st.markdown("Track your fitness journey with AI-powered insights!")
            st.markdown("---")
            if st.button("🔐 Login", use_container_width=True):
                st.session_state.page = 'login'
            if st.button("📝 Sign Up", use_container_width=True):
                st.session_state.page = 'signup'

# ================= PAGE RENDERERS =================
def render_login_page():
    render_header()
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.markdown("### 🔐 Login to Your Account")
        with st.form("login_form"):
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            
            if st.form_submit_button("Login", use_container_width=True):
                if not username or not password:
                    st.error("Please fill in all fields")
                else:
                    user = tracker.authenticate_user(username, password)
                    if user:
                        st.session_state.user_id = user['user_id']
                        st.session_state.page = 'dashboard'
                        st.success(f"Welcome back, {user['full_name']}!")
                        st.rerun()
                    else:
                        st.error("Invalid username or password")
        
        st.markdown("---")
        st.markdown("Don't have an account? ")
        if st.button("Create Account", use_container_width=True):
            st.session_state.page = 'signup'
            st.rerun()

def render_signup_page():
    render_header()
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.markdown("### 📝 Create Your Account")
        with st.form("signup_form"):
            username = st.text_input("Username*", help="Minimum 6 characters")
            email = st.text_input("Email*", help="Valid email address")
            password = st.text_input("Password*", type="password", 
                                    help="8+ chars with uppercase, lowercase, number, and special char")
            confirm_password = st.text_input("Confirm Password*", type="password")
            
            col_a, col_b = st.columns(2)
            with col_a:
                full_name = st.text_input("Full Name*")
            with col_b:
                age = st.number_input("Age*", min_value=13, max_value=120, value=25)
            
            col_c, col_d = st.columns(2)
            with col_c:
                weight = st.number_input("Weight (kg)*", min_value=20.0, max_value=300.0, value=70.0)
            with col_d:
                height = st.number_input("Height (cm)*", min_value=100.0, max_value=250.0, value=170.0)
            
            gender = st.selectbox("Gender*", ["Male", "Female", "Other"])
            
            st.markdown("---")
            if st.form_submit_button("Create Account", use_container_width=True):
                # Validation
                if not all([username, email, password, full_name]):
                    st.error("Please fill in all required fields")
                elif len(username) < 6:
                    st.error("Username must be at least 6 characters")
                elif not tracker.security.validate_email(email):
                    st.error("Invalid email format")
                elif password != confirm_password:
                    st.error("Passwords do not match")
                else:
                    is_strong, msg = tracker.security.validate_password_strength(password)
                    if not is_strong:
                        st.error(msg)
                    else:
                        user_id = tracker.create_user(username, password, email, full_name, 
                                                     age, weight, height, gender)
                        if user_id:
                            st.success("Account created successfully! Please login.")
                            st.session_state.page = 'login'
                            st.rerun()
                        else:
                            st.error("Username or email already exists")

def render_dashboard():
    if check_session_timeout():
        return

    user = tracker.get_user_profile(st.session_state.user_id)
    if not user:
        st.session_state.clear()
        st.rerun()
        return

    render_header()
    st.markdown(f"### 👋 Welcome back, {user['full_name']}!")

    # Quick stats
    col1, col2, col3 = st.columns(3)

    bmi = tracker.calculate_bmi(user['weight'], user['height'])
    category, icon, advice = tracker.get_bmi_category(bmi)

    with col1:
        st.metric("BMI", bmi)
        st.caption(f"{icon} {category}")

    with col2:
        activity_summary = tracker.get_activity_summary(
            st.session_state.user_id, 7
        )
        st.metric("Weekly Activities", activity_summary['total_activities'])
        st.metric("Total Calories Burned",
                  f"{activity_summary['total_calories']:.0f}")

    with col3:
        daily_nutrition = tracker.get_daily_nutrition(
            st.session_state.user_id
        )
        goal_percentage = (
            daily_nutrition['calories'] / user['daily_calorie_goal'] * 100
        ) if user['daily_calorie_goal'] > 0 else 0

        st.metric("Today's Calories",
                  f"{daily_nutrition['calories']:.0f}")
        st.progress(min(goal_percentage / 100, 1.0))
        st.caption(f"{goal_percentage:.1f}% of daily goal")

    # AI Coach Quick Advice
    st.markdown("### 🤖 AI Coach Says")
    with st.expander("Get Quick Advice", expanded=True):
        query = st.text_input(
            "Ask me anything about fitness, diet, or exercise:"
        )
        if query:
            with st.spinner("Getting personalized advice..."):
                advice = tracker.get_ai_coaching(
                    st.session_state.user_id, query
                )
                st.info(advice)

    # Recent Activities
    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 🏃 Your Recent Activities")
        activities = tracker.get_user_activities(
            st.session_state.user_id, 7
        )
        if activities:
            for act in activities[:5]:
                st.write(
                    f"• {act[0]} - {act[1]}min ({act[2]} cal) - {act[4]}"
                )
        else:
            st.info("No activities logged this week")

    with col2:
        st.markdown("### 🏆 Your Recent Achievements")
        achievements = tracker.get_achievements(
            st.session_state.user_id
        )
        if achievements:
            for ach in achievements[:3]:
                st.success(
                    f"**{ach['name']}**: {ach['description']}"
                )
        else:
            st.info("Complete activities to earn achievements!")
def render_activities():
    if check_session_timeout():
        return
    
    st.markdown("## 🏃 Log Your Activity")
    
    col1, col2 = st.columns(2)
    
    with col1:
        with st.form("activity_form"):
            activity_type = st.selectbox("Activity Type", [
                "Walking", "Running", "Cycling", "Swimming", "Gym Workout", 
                "Yoga", "HIIT", "Dancing", "Sports", "Other"
            ])
            duration = st.number_input("Duration (minutes)", min_value=1, max_value=480, value=30)
            intensity = st.select_slider("Intensity", ["Light", "Moderate", "High", "Very High"])
            distance = st.number_input("Distance (km) - optional", min_value=0.0, max_value=100.0, value=0.0)
            calories = st.number_input("Calories Burned (estimated)", min_value=0, max_value=2000, value=100)
            notes = st.text_area("Notes (optional)")
            
            if st.form_submit_button("Log Activity"):
                if tracker.log_activity(st.session_state.user_id, activity_type, duration, 
                                      calories, distance if distance > 0 else None, intensity, notes):
                    st.success("Activity logged successfully!")
                    st.balloons()
                else:
                    st.error("Failed to log activity")
    
    with col2:
        st.markdown("### Activity History")
        activities = tracker.get_user_activities(st.session_state.user_id, 30)
        if activities:
            df = pd.DataFrame(activities, columns=['Type', 'Duration', 'Calories', 'Distance', 'Intensity', 'Date'])
            df['Date'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m-%d %H:%M')
            st.dataframe(df, use_container_width=True)
            
            # Summary chart
            fig = px.bar(df, x='Date', y='Calories', color='Type', 
                        title='Calories Burned Over Time')
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No activities logged yet")

def render_nutrition():
    if check_session_timeout():
        return
    
    st.markdown("## 🥗 Nutrition Tracking")
    
    col1, col2 = st.columns(2)
    
    with col1:
        with st.form("meal_form"):
            meal_type = st.selectbox("Meal Type", ["Breakfast", "Lunch", "Dinner", "Snack", "Post-Workout"])
            food_item = st.text_input("Food Item")
            
            col_a, col_b, col_c, col_d = st.columns(4)
            with col_a:
                calories = st.number_input("Calories", min_value=0, max_value=2000, value=300)
            with col_b:
                protein = st.number_input("Protein (g)", min_value=0.0, max_value=100.0, value=15.0)
            with col_c:
                carbs = st.number_input("Carbs (g)", min_value=0.0, max_value=200.0, value=30.0)
            with col_d:
                fats = st.number_input("Fats (g)", min_value=0.0, max_value=100.0, value=10.0)
            
            if st.form_submit_button("Log Meal"):
                if tracker.log_meal(st.session_state.user_id, meal_type, food_item, 
                                  calories, protein, carbs, fats):
                    st.success("Meal logged successfully!")
                else:
                    st.error("Failed to log meal")
    
    with col2:
        st.markdown("### Today's Nutrition Summary")
        daily_nutrition = tracker.get_daily_nutrition(st.session_state.user_id)
        
        user = tracker.get_user_profile(st.session_state.user_id)
        
        # Progress bars
        st.markdown("#### Calories")
        cal_percentage = (daily_nutrition['calories'] / user['daily_calorie_goal'] * 100) if user['daily_calorie_goal'] > 0 else 0
        st.progress(min(cal_percentage/100, 1.0))
        st.caption(f"{daily_nutrition['calories']:.0f} / {user['daily_calorie_goal']} kcal")
        
        st.markdown("#### Protein")
        protein_goal = user['weight'] * 1.6  # 1.6g per kg bodyweight
        protein_percentage = (daily_nutrition['protein'] / protein_goal * 100) if protein_goal > 0 else 0
        st.progress(min(protein_percentage/100, 1.0), text=f"{daily_nutrition['protein']:.0f} / {protein_goal:.0f} g")
        
        st.markdown("#### Carbs")
        carbs_goal = user['weight'] * 3  # 3g per kg bodyweight
        carbs_percentage = (daily_nutrition['carbs'] / carbs_goal * 100) if carbs_goal > 0 else 0
        st.progress(min(carbs_percentage/100, 1.0), text=f"{daily_nutrition['carbs']:.0f} / {carbs_goal:.0f} g")
        
        st.markdown("#### Fats")
        fats_goal = user['weight'] * 0.8  # 0.8g per kg bodyweight
        fats_percentage = (daily_nutrition['fats'] / fats_goal * 100) if fats_goal > 0 else 0
        st.progress(min(fats_percentage/100, 1.0), text=f"{daily_nutrition['fats']:.0f} / {fats_goal:.0f} g")
        
        # Macronutrient pie chart
        if daily_nutrition['calories'] > 0:
            fig = go.Figure(data=[go.Pie(
                labels=['Protein', 'Carbs', 'Fats'],
                values=[daily_nutrition['protein']*4, daily_nutrition['carbs']*4, daily_nutrition['fats']*9],
                hole=.3
            )])
            fig.update_layout(title="Macronutrient Distribution (calories)")
            st.plotly_chart(fig, use_container_width=True)

def render_water_intake():
    if check_session_timeout():
        return
    
    st.markdown("## 💧 Water Intake Tracker")
    
    user = tracker.get_user_profile(st.session_state.user_id)
    current_water = tracker.get_daily_water(st.session_state.user_id)
    goal = user['daily_water_goal']
    
    # Large water progress display
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        percentage = (current_water / goal * 100) if goal > 0 else 0
        st.markdown(f"### Today's Progress: {current_water}/{goal} glasses")
        st.progress(min(percentage/100, 1.0))
        
        if percentage >= 100:
            st.success("🎉 Great job! You've met your water goal!")
        
        # Quick add buttons
        st.markdown("### Add Water")
        col_a, col_b, col_c = st.columns(3)
        with col_a:
            if st.button("💧 +1", use_container_width=True):
                if tracker.log_water(st.session_state.user_id, 1):
                    st.rerun()
        with col_b:
            if st.button("💧💧 +2", use_container_width=True):
                if tracker.log_water(st.session_state.user_id, 2):
                    st.rerun()
        with col_c:
            if st.button("💧💧💧 +3", use_container_width=True):
                if tracker.log_water(st.session_state.user_id, 3):
                    st.rerun()
    
    # Water intake history chart
    st.markdown("### Weekly Water Intake")
    
    # Get last 7 days data
    water_data = []
    for i in range(6, -1, -1):
        date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
        tracker.cursor.execute("""
            SELECT SUM(glasses) FROM water_intake
            WHERE user_id=? AND DATE(entry_date) = ?
        """, (st.session_state.user_id, date))
        result = tracker.cursor.fetchone()
        water_data.append(result[0] or 0)
    
    fig = go.Figure(data=[
        go.Bar(name='Water Intake', x=[f"Day {i}" for i in range(7)], y=water_data,
              marker_color='lightblue')
    ])
    fig.add_hline(y=goal, line_dash="dash", line_color="red", annotation_text="Goal")
    fig.update_layout(title="Water Intake - Last 7 Days")
    st.plotly_chart(fig, use_container_width=True)

def render_workouts():
    if check_session_timeout():
        return
    
    st.markdown("## 🎯 Workout Plans")
    
    tab1, tab2 = st.tabs(["Create Plan", "My Plans"])
    
    with tab1:
        with st.form("workout_plan_form"):
            plan_name = st.text_input("Plan Name", placeholder="e.g., Summer Shred, Strength Building")
            
            st.markdown("### Add Exercises")
            exercises = []
            
            for i in range(5):  # Allow up to 5 exercises
                col1, col2, col3, col4 = st.columns([3, 1, 1, 1])
                with col1:
                    exercise = st.text_input(f"Exercise {i+1}", key=f"ex_name_{i}")
                with col2:
                    sets = st.number_input(f"Sets", min_value=1, value=3, key=f"sets_{i}")
                with col3:
                    reps = st.number_input(f"Reps", min_value=1, value=10, key=f"reps_{i}")
                with col4:
                    rest = st.number_input(f"Rest (sec)", min_value=0, value=60, key=f"rest_{i}")
                
                if exercise:
                    exercises.append({
                        'name': exercise,
                        'sets': sets,
                        'reps': reps,
                        'rest': rest
                    })
            
            st.markdown("### Weekly Schedule")
            schedule = {}
            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            
            for day in days:
                schedule[day] = st.selectbox(day, ["Rest Day", "Full Body", "Upper Body", 
                                                  "Lower Body", "Cardio", "HIIT"], key=f"day_{day}")
            
            if st.form_submit_button("Create Workout Plan"):
                if plan_name and exercises:
                    if tracker.create_workout_plan(st.session_state.user_id, plan_name, exercises, schedule):
                        st.success("Workout plan created successfully!")
                    else:
                        st.error("Failed to create workout plan")
                else:
                    st.error("Please enter a plan name and at least one exercise")
    
    with tab2:
        plans = tracker.get_workout_plans(st.session_state.user_id)
        if plans:
            for plan in plans:
                with st.expander(f"📋 {plan['plan_name']} (Created: {plan['created_at'][:10]})"):
                    st.markdown("#### Exercises")
                    for ex in plan['exercises']:
                        st.write(f"• **{ex['name']}** - {ex['sets']} sets × {ex['reps']} reps (rest: {ex['rest']}s)")
                    
                    st.markdown("#### Weekly Schedule")
                    for day, workout in plan['schedule'].items():
                        st.write(f"**{day}:** {workout}")
        else:
            st.info("No workout plans created yet")

def render_achievements():
    if check_session_timeout():
        return
    
    st.markdown("## 🏆 Your Achievements")
    
    achievements = tracker.get_achievements(st.session_state.user_id)
    
    if achievements:
        col1, col2, col3 = st.columns(3)
        cols = [col1, col2, col3]
        
        for i, ach in enumerate(achievements):
            with cols[i % 3]:
                st.markdown("""
                <div style='border: 2px solid gold; border-radius: 10px; padding: 1rem; margin: 0.5rem 0; text-align: center;'>
                    <h3>🏅 {}</h3>
                    <p>{}</p>
                    <small>{}</small>
                </div>
                """.format(ach['name'], ach['description'], ach['date'][:10]), unsafe_allow_html=True)
    else:
        st.info("Complete activities to earn achievements!")
        
        # Show locked achievements
        st.markdown("### 🔒 Locked Achievements")
        locked = [
            ("First Workout", "Complete your first workout"),
            ("Getting Serious", "Complete 10 workouts"),
            ("Consistency King", "Work out 5 days in a week"),
            ("Century Club", "Burn 1000 total calories"),
            ("Marathon Runner", "Run a total of 42km"),
        ]
        
        for name, desc in locked:
            st.markdown(f"• **{name}** - {desc}")

def render_ai_coach():
    if check_session_timeout():
        return

    st.markdown("## 🤖 AI Personal Coach")

    user = tracker.get_user_profile(st.session_state.user_id)
    bmi = tracker.calculate_bmi(user['weight'], user['height'])
    category, icon, _ = tracker.get_bmi_category(bmi)

    st.markdown(f"### 👤 Your BMI: {bmi} ({category})")

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    if "followups" not in st.session_state:
        st.session_state.followups = []

    # -------- DISPLAY CHAT --------
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # -------- FOLLOW UP BUTTONS --------
    if st.session_state.followups:
        st.markdown("### 🔎 Suggested Follow-Up Questions")
        for i, q in enumerate(st.session_state.followups):
            if st.button(q, key=f"follow_{i}"):

                st.session_state.chat_history.append(
                    {"role": "user", "content": q}
                )

                with st.chat_message("assistant"):
                    with st.spinner("Coach is thinking..."):
                        response = tracker.get_ai_coaching(
                            st.session_state.user_id,
                            q
                        )
                        st.markdown(response)

                st.session_state.chat_history.append(
                    {"role": "assistant", "content": response}
                )

                st.session_state.followups = []
                st.rerun()

    # -------- CHAT INPUT --------
    user_input = st.chat_input("Ask your AI coach anything...")

    if user_input:

        st.session_state.chat_history.append(
            {"role": "user", "content": user_input}
        )

        with st.chat_message("assistant"):
            with st.spinner("Coach is thinking..."):
                response = tracker.get_ai_coaching(
                    st.session_state.user_id,
                    user_input
                )
                st.markdown(response)

        st.session_state.chat_history.append(
            {"role": "assistant", "content": response}
        )

        # Extract follow-ups
        if "FOLLOW_UP:" in response:
            parts = response.split("FOLLOW_UP:")
            main_answer = parts[0]
            follow_section = parts[1]

            questions = [
                q.strip("1234567890. ").strip()
                for q in follow_section.strip().split("\n")
                if q.strip()
            ]

            st.session_state.chat_history[-1]["content"] = main_answer
            st.session_state.followups = questions[:3]

        else:
            st.session_state.followups = []

        st.rerun()

    # -------- CLEAR CHAT --------
    if st.button("🗑 Clear Chat"):
        st.session_state.chat_history = []
        st.session_state.followups = []
        st.rerun()



def render_progress():
    if check_session_timeout():
        return
    
    st.markdown("## 📊 Progress Tracking")
    
    user = tracker.get_user_profile(st.session_state.user_id)
    
    # Time range selector
    time_range = st.selectbox("Select Time Range", ["Last 7 Days", "Last 30 Days", "Last 90 Days"])
    days = {"Last 7 Days": 7, "Last 30 Days": 30, "Last 90 Days": 90}[time_range]
    
    # Weight Progress
    st.markdown("### 📈 Weight Progress")
    weight_history = tracker.get_weight_history(st.session_state.user_id, days)
    
    if weight_history:
        df = pd.DataFrame(weight_history, columns=['Weight', 'BMI', 'Date'])
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=df['Date'], y=df['Weight'], mode='lines+markers', 
                                name='Weight', line=dict(color='blue')))
        fig.update_layout(title=f"Weight Progress - Last {days} Days",
                         xaxis_title="Date", yaxis_title="Weight (kg)")
        st.plotly_chart(fig, use_container_width=True)
        
        # Stats
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Starting Weight", f"{df.iloc[0]['Weight']}kg")
        with col2:
            st.metric("Current Weight", f"{df.iloc[-1]['Weight']}kg")
        with col3:
            change = df.iloc[-1]['Weight'] - df.iloc[0]['Weight']
            delta_color = "inverse" if change < 0 else "normal"
            st.metric("Change", f"{change:+.1f}kg", delta_color=delta_color)
    
    # Activity Progress
    st.markdown("### 🏃 Activity Progress")
    activities = tracker.get_user_activities(st.session_state.user_id, days)
    
    if activities:
        df_act = pd.DataFrame(activities, columns=['Type', 'Duration', 'Calories', 'Distance', 'Intensity', 'Date'])
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Calories over time
            fig_cal = px.bar(df_act, x='Date', y='Calories', color='Type',
                           title='Calories Burned Over Time')
            st.plotly_chart(fig_cal, use_container_width=True)
        
        with col2:
            # Activity distribution
            activity_dist = df_act['Type'].value_counts()
            fig_dist = px.pie(values=activity_dist.values, names=activity_dist.index,
                            title='Activity Distribution')
            st.plotly_chart(fig_dist, use_container_width=True)
        
        # Summary stats
        st.markdown("### 📊 Summary Statistics")
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Workouts", len(df_act))
        with col2:
            st.metric("Total Duration", f"{df_act['Duration'].sum()} min")
        with col3:
            st.metric("Total Calories", f"{df_act['Calories'].sum():.0f}")
        with col4:
            avg_cal = df_act['Calories'].mean()
            st.metric("Avg Calories/Workout", f"{avg_cal:.0f}")
    else:
        st.info(f"No activities logged in the last {days} days")

def render_reports():
    if check_session_timeout():
        return
    
    st.markdown("## 📈 Progress Reports")
    
    if st.button("Generate Comprehensive Report"):
        with st.spinner("Generating your report..."):
            report = tracker.generate_progress_report(st.session_state.user_id)
            
            if report:
                st.markdown(f"### Progress Report - {report['report_date']}")
                
                # User Info
                st.markdown("#### 👤 User Information")
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.write(f"**Name:** {report['user']['full_name']}")
                with col2:
                    st.write(f"**Age:** {report['user']['age']}")
                with col3:
                    st.write(f"**Member Since:** {report['user']['member_since'][:10]}")
                
                # Weight Trend
                st.markdown("#### ⚖️ Weight Trend")
                st.write(f"**Trend:** {report['weight_trend'].title()}")
                
                if report['weight_history']:
                    df_weight = pd.DataFrame(report['weight_history'], 
                                           columns=['Weight', 'BMI', 'Date'])
                    fig = px.line(df_weight, x='Date', y='Weight', 
                                 title='Weight History (Last 90 Days)')
                    st.plotly_chart(fig, use_container_width=True)
                
                # Activity Summary
                st.markdown("#### 🏃 Activity Summary (Last 30 Days)")
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Total Workouts", report['activity_summary']['total_activities'])
                with col2:
                    st.metric("Total Duration", f"{report['activity_summary']['total_duration']} min")
                with col3:
                    st.metric("Total Calories", f"{report['activity_summary']['total_calories']:.0f}")
                with col4:
                    st.metric("Avg Calories/Workout", report['activity_summary']['avg_calories'])
                
                # Recommendations
                st.markdown("#### 💡 AI Recommendations")
                bmi = tracker.calculate_bmi(report['user']['weight'], report['user']['height'])
                category, _, advice = tracker.get_bmi_category(bmi)
                
                st.info(f"Based on your BMI ({bmi} - {category}): {advice}")
                
                if report['weight_trend'] == 'decreasing':
                    st.success("You're on track with your weight loss goals! Keep it up!")
                elif report['weight_trend'] == 'increasing':
                    st.warning("Your weight is increasing. Consider reviewing your diet and exercise routine.")
                
                # Download Report
                report_text = f"""
                FITNESS PROGRESS REPORT
                Generated: {report['report_date']}
                
                USER INFORMATION
                Name: {report['user']['full_name']}
                Age: {report['user']['age']}
                Weight: {report['user']['weight']} kg
                Height: {report['user']['height']} cm
                
                ACTIVITY SUMMARY (Last 30 Days)
                Total Workouts: {report['activity_summary']['total_activities']}
                Total Duration: {report['activity_summary']['total_duration']} minutes
                Total Calories Burned: {report['activity_summary']['total_calories']}
                
                WEIGHT TREND: {report['weight_trend'].upper()}
                """
                
                st.download_button(
                    label="📥 Download Report",
                    data=report_text,
                    file_name=f"fitness_report_{datetime.now().strftime('%Y%m%d')}.txt",
                    mime="text/plain"
                )
            else:
                st.error("Failed to generate report")

def render_settings():
    if check_session_timeout():
        return
    
    st.markdown("## ⚙️ Settings")
    
    user = tracker.get_user_profile(st.session_state.user_id)
    
    tab1, tab2, tab3 = st.tabs(["Profile", "Goals", "Account"])
    
    with tab1:
        st.markdown("### Update Profile")
        
        col1, col2 = st.columns(2)
        with col1:
            new_weight = st.number_input("Weight (kg)", value=float(user['weight']), 
                                        min_value=20.0, max_value=300.0)
        with col2:
            new_height = st.number_input("Height (cm)", value=float(user['height']), 
                                        min_value=100.0, max_value=250.0)
        
        new_fitness_level = st.selectbox("Fitness Level", 
                                        ["Beginner", "Intermediate", "Advanced"],
                                        index=["Beginner", "Intermediate", "Advanced"].index(user['fitness_level']))
        
        if st.button("Update Profile"):
            if tracker.update_profile(st.session_state.user_id, 
                                    weight=new_weight, 
                                    height=new_height,
                                    fitness_level=new_fitness_level):
                st.success("Profile updated successfully!")
                st.rerun()
    
    with tab2:
        st.markdown("### Set Your Goals")
        
        new_calorie_goal = st.number_input("Daily Calorie Goal", 
                                          value=user['daily_calorie_goal'],
                                          min_value=1200, max_value=5000, step=100)
        
        new_water_goal = st.number_input("Daily Water Goal (glasses)", 
                                         value=user['daily_water_goal'],
                                         min_value=4, max_value=20, step=1)
        
        if st.button("Update Goals"):
            if tracker.update_profile(st.session_state.user_id,
                                    daily_calorie_goal=new_calorie_goal,
                                    daily_water_goal=new_water_goal):
                st.success("Goals updated successfully!")
                st.rerun()
    
    with tab3:
        st.markdown("### Account Settings")
        
        st.markdown("#### Change Password")
        with st.form("change_password"):
            current_password = st.text_input("Current Password", type="password")
            new_password = st.text_input("New Password", type="password")
            confirm_password = st.text_input("Confirm New Password", type="password")
            
            if st.form_submit_button("Change Password"):
                if not current_password or not new_password:
                    st.error("Please fill in all fields")
                elif new_password != confirm_password:
                    st.error("New passwords do not match")
                else:
                    # Verify current password
                    tracker.cursor.execute("SELECT password_hash, salt FROM users WHERE user_id=?", 
                                         (st.session_state.user_id,))
                    stored_hash, salt = tracker.cursor.fetchone()
                    
                    if tracker.security.verify_password(salt, stored_hash, current_password):
                        # Update password
                        new_salt, new_hash = tracker.security.hash_password(new_password)
                        tracker.cursor.execute("UPDATE users SET password_hash=?, salt=? WHERE user_id=?", 
                                             (new_hash, new_salt, st.session_state.user_id))
                        tracker.conn.commit()
                        st.success("Password changed successfully!")
                    else:
                        st.error("Current password is incorrect")
        
        st.markdown("---")
        st.markdown("#### Danger Zone")
        
        if st.button("🚨 Delete Account", type="secondary"):
            st.warning("This action cannot be undone!")
            confirm = st.text_input("Type 'DELETE' to confirm")
            if confirm == "DELETE":
                tracker.cursor.execute("UPDATE users SET is_active=0 WHERE user_id=?", 
                                     (st.session_state.user_id,))
                tracker.conn.commit()
                st.session_state.clear()
                st.success("Account deactivated. Redirecting...")
                st.rerun()

# ================= MAIN APP =================
def main():
    render_sidebar()
    
    if st.session_state.user_id:
        # User is logged in
        if st.session_state.page == 'dashboard':
            render_dashboard()
        elif st.session_state.page == 'progress':
            render_progress()
        elif st.session_state.page == 'activities':
            render_activities()
        elif st.session_state.page == 'nutrition':
            render_nutrition()
        elif st.session_state.page == 'water':
            render_water_intake()
        elif st.session_state.page == 'workouts':
            render_workouts()
        elif st.session_state.page == 'achievements':
            render_achievements()
        elif st.session_state.page == 'ai_coach':
            render_ai_coach()
        elif st.session_state.page == 'reports':
            render_reports()
        elif st.session_state.page == 'settings':
            render_settings()
        else:
            render_dashboard()
    else:
        # User not logged in
        if st.session_state.page == 'signup':
            render_signup_page()
        else:
            render_login_page()

if __name__ == "__main__":
    main()