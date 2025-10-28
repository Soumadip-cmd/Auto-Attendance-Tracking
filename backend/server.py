from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "edutrack_secret_key_change_in_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ====================
# PYDANTIC MODELS
# ====================

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: str
    role: str  # student, teacher, admin

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class CreateClassRequest(BaseModel):
    name: str
    schedule_time: str  # e.g., "12:30"
    schedule_days: List[str]  # e.g., ["Monday", "Wednesday"]
    latitude: float
    longitude: float
    radius: float  # in meters

class MarkAttendanceRequest(BaseModel):
    class_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    method: str  # "geo" or "qr"
    qr_code: Optional[str] = None

class ApproveAttendanceRequest(BaseModel):
    attendance_id: str
    status: str  # "approved", "rejected"
    remarks: Optional[str] = None

class GeofenceLogEntry(BaseModel):
    student_id: str
    class_id: str
    entry_time: datetime
    exit_time: Optional[datetime] = None
    flagged: bool = False
    reason: Optional[str] = None

# ====================
# HELPER FUNCTIONS
# ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["_id"] = str(user["_id"])
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two coordinates using Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371000  # Earth radius in meters
    
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    
    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    
    distance = R * c
    return distance

import random
import string

def generate_qr_code() -> str:
    """Generate a random QR code string"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))

# ====================
# AUTH ROUTES
# ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    # Check if username exists
    existing_user = await db.users.find_one({"username": request.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user
    user_data = {
        "username": request.username,
        "password_hash": hash_password(request.password),
        "name": request.name,
        "email": request.email,
        "role": request.role,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_data)
    user_id = str(result.inserted_id)
    
    # Generate token
    token = create_access_token({"user_id": user_id})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "_id": user_id,
            "username": request.username,
            "name": request.name,
            "email": request.email,
            "role": request.role
        }
    }

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"username": request.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    token = create_access_token({"user_id": user_id})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "_id": user_id,
            "username": user["username"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ====================
# CLASS ROUTES
# ====================

@api_router.post("/class/create")
async def create_class(request: CreateClassRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can create classes")
    
    class_data = {
        "name": request.name,
        "teacher_id": current_user["_id"],
        "teacher_name": current_user["name"],
        "schedule": {
            "time": request.schedule_time,
            "days": request.schedule_days
        },
        "geofence": {
            "latitude": request.latitude,
            "longitude": request.longitude,
            "radius": request.radius
        },
        "qr_code": generate_qr_code(),
        "created_at": datetime.utcnow()
    }
    
    result = await db.classes.insert_one(class_data)
    class_data["_id"] = str(result.inserted_id)
    
    return class_data

@api_router.get("/class/list")
async def list_classes(current_user: dict = Depends(get_current_user)):
    classes = await db.classes.find().to_list(1000)
    for cls in classes:
        cls["_id"] = str(cls["_id"])
    return classes

@api_router.get("/class/{class_id}")
async def get_class(class_id: str, current_user: dict = Depends(get_current_user)):
    cls = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    cls["_id"] = str(cls["_id"])
    return cls

@api_router.post("/class/{class_id}/qr")
async def regenerate_qr(class_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can regenerate QR codes")
    
    new_qr = generate_qr_code()
    await db.classes.update_one(
        {"_id": ObjectId(class_id)},
        {"$set": {"qr_code": new_qr}}
    )
    
    return {"qr_code": new_qr}

@api_router.delete("/class/{class_id}")
async def delete_class(class_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can delete classes")
    
    # Check if class exists
    cls = await db.classes.find_one({"_id": ObjectId(class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Teachers can only delete their own classes, admins can delete any
    if current_user["role"] == "teacher" and cls["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own classes")
    
    # Delete the class
    await db.classes.delete_one({"_id": ObjectId(class_id)})
    
    # Optionally delete all attendance records for this class
    await db.attendance.delete_many({"class_id": class_id})
    
    return {"message": "Class deleted successfully"}

# ====================
# ATTENDANCE ROUTES
# ====================

@api_router.post("/attendance/mark")
async def mark_attendance(request: MarkAttendanceRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can mark attendance")
    
    # Get class details
    cls = await db.classes.find_one({"_id": ObjectId(request.class_id)})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Check if already marked today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    existing_attendance = await db.attendance.find_one({
        "student_id": current_user["_id"],
        "class_id": request.class_id,
        "timestamp": {"$gte": today_start}
    })
    
    if existing_attendance:
        raise HTTPException(status_code=400, detail="Attendance already marked today")
    
    is_valid = False
    flagged = False
    reason = None
    
    if request.method == "geo":
        # Verify geofence
        if request.latitude is None or request.longitude is None:
            raise HTTPException(status_code=400, detail="Location required for geo-based attendance")
        
        distance = calculate_distance(
            cls["geofence"]["latitude"],
            cls["geofence"]["longitude"],
            request.latitude,
            request.longitude
        )
        
        if distance <= cls["geofence"]["radius"]:
            is_valid = True
        else:
            raise HTTPException(status_code=400, detail=f"You are {int(distance)}m away from the class location")
    
    elif request.method == "qr":
        # Verify QR code
        if request.qr_code != cls["qr_code"]:
            raise HTTPException(status_code=400, detail="Invalid QR code")
        is_valid = True
    
    if is_valid:
        # Anti-bunking check: Check if student entered geofence recently
        class_time_str = cls["schedule"]["time"]  # e.g., "12:30"
        class_hour, class_minute = map(int, class_time_str.split(":"))
        
        current_time = datetime.utcnow()
        current_hour = current_time.hour
        current_minute = current_time.minute
        
        # Calculate minutes difference
        class_minutes_from_midnight = class_hour * 60 + class_minute
        current_minutes_from_midnight = current_hour * 60 + current_minute
        minutes_diff = current_minutes_from_midnight - class_minutes_from_midnight
        
        # Flag if marking attendance > 15 mins before class or > 30 mins after class start
        if minutes_diff < -15 or minutes_diff > 30:
            flagged = True
            reason = f"Attendance marked {abs(minutes_diff)} minutes {'before' if minutes_diff < 0 else 'after'} class time"
        
        # Mark attendance - now requires teacher approval
        attendance_data = {
            "student_id": current_user["_id"],
            "student_name": current_user["name"],
            "class_id": request.class_id,
            "class_name": cls["name"],
            "teacher_id": cls["teacher_id"],
            "timestamp": datetime.utcnow(),
            "location": {
                "latitude": request.latitude,
                "longitude": request.longitude
            } if request.latitude else None,
            "method": request.method,
            "status": "pending",  # Changed to pending - requires teacher approval
            "approved": False,  # New field
            "flagged": flagged,
            "flag_reason": reason,
            "teacher_remarks": None,
            "approved_at": None,
            "approved_by": None
        }
        
        result = await db.attendance.insert_one(attendance_data)
        attendance_data["_id"] = str(result.inserted_id)
        
        return attendance_data

@api_router.get("/attendance/student/{student_id}")
async def get_student_attendance(student_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "student" and current_user["_id"] != student_id:
        raise HTTPException(status_code=403, detail="You can only view your own attendance")
    
    attendance_records = await db.attendance.find({"student_id": student_id}).sort("timestamp", -1).to_list(1000)
    for record in attendance_records:
        record["_id"] = str(record["_id"])
    
    return attendance_records

@api_router.get("/attendance/class/{class_id}")
async def get_class_attendance(class_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can view class attendance")
    
    attendance_records = await db.attendance.find({"class_id": class_id}).sort("timestamp", -1).to_list(1000)
    for record in attendance_records:
        record["_id"] = str(record["_id"])
    
    return attendance_records

@api_router.post("/attendance/approve")
async def approve_attendance(request: ApproveAttendanceRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can approve attendance")
    
    # Get attendance record
    attendance = await db.attendance.find_one({"_id": ObjectId(request.attendance_id)})
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    # Teachers can only approve attendance for their own classes
    if current_user["role"] == "teacher" and attendance["teacher_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="You can only approve attendance for your own classes")
    
    # Update attendance status
    update_data = {
        "status": "present" if request.status == "approved" else "absent",
        "approved": request.status == "approved",
        "approved_at": datetime.utcnow(),
        "approved_by": current_user["_id"],
        "teacher_remarks": request.remarks
    }
    
    await db.attendance.update_one(
        {"_id": ObjectId(request.attendance_id)},
        {"$set": update_data}
    )
    
    return {"message": f"Attendance {request.status} successfully"}

@api_router.get("/attendance/pending")
async def get_pending_attendance(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Only teachers and admins can view pending attendance")
    
    # Filter based on role
    query = {"status": "pending"}
    if current_user["role"] == "teacher":
        query["teacher_id"] = current_user["_id"]
    
    pending_records = await db.attendance.find(query).sort("timestamp", -1).to_list(1000)
    for record in pending_records:
        record["_id"] = str(record["_id"])
    
    return pending_records

# ====================
# ADMIN ROUTES
# ====================

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access dashboard")
    
    # Get statistics
    total_students = await db.users.count_documents({"role": "student"})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_classes = await db.classes.count_documents({})
    total_attendance = await db.attendance.count_documents({})
    flagged_attendance = await db.attendance.count_documents({"flagged": True})
    
    # Get recent flagged attendance
    recent_flagged = await db.attendance.find({"flagged": True}).sort("timestamp", -1).limit(20).to_list(20)
    for record in recent_flagged:
        record["_id"] = str(record["_id"])
    
    # Get attendance by class
    attendance_by_class = await db.attendance.aggregate([
        {"$group": {
            "_id": "$class_name",
            "count": {"$sum": 1},
            "flagged": {"$sum": {"$cond": ["$flagged", 1, 0]}}
        }}
    ]).to_list(100)
    
    return {
        "statistics": {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_classes": total_classes,
            "total_attendance": total_attendance,
            "flagged_attendance": flagged_attendance
        },
        "recent_flagged": recent_flagged,
        "attendance_by_class": attendance_by_class
    }

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all users")
    
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    for user in users:
        user["_id"] = str(user["_id"])
    
    return users

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
