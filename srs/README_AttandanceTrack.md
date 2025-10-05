# EduTrack – Smart Geo-based Attendance System

## 📘 Overview
EduTrack is a modern mobile and web-based attendance tracking solution for schools and colleges. 
It combines **GPS geolocation**, **QR code scanning**, and **real-time analytics** to make attendance seamless, secure, and automated.

---

## 👨‍💻 Team
- **Team Leader:** Sandipan Das  
- **Team Members:** Soumadip Santra, Bishak Kitra, Sirdhatto Dey  

---

## 🚀 Core Features
- 🛰 **Geo-based Automatic Attendance** – Detects location within geofence and auto-marks attendance.
- 📱 **QR Code Verification** – Each class generates a dynamic QR code for quick attendance validation.
- 🔒 **Secure Login System** – Role-based authentication (Student, Teacher, Admin) via Firebase Auth.
- 📊 **Admin Dashboard** – Manage classes, users, and generate reports in real-time.
- 🔔 **Push Notifications** – Instant alerts for attendance, reminders, and low-attendance warnings.
- 📂 **Analytics & Reporting** – Export attendance reports in PDF/Excel format.
- 🌐 **LMS/ERP Integration** – Compatible with existing learning management systems.
- 🧭 **Customizable Geofence Radius** – Define boundaries for valid attendance zones.
- ⚙️ **Offline Sync** – Allows attendance logging even without internet, syncs later.
- 🧠 **AI-based Proxy Detection (Future)** – Identify suspicious attendance patterns.
- 📸 **Facial Recognition (Future)** – Enhance security through AI-based identification.

---

## 🧱 Technology Stack
| Layer | Technology |
|-------|-------------|
| **Frontend (Mobile)** | React Native (Expo) |
| **Backend** | Node.js + Express |
| **Database** | Firebase Firestore / MongoDB Atlas |
| **Authentication** | Firebase Auth |
| **Maps/Geo APIs** | Google Maps API / Expo Location |
| **QR Code** | react-native-qrcode-svg & Expo Camera |
| **Push Notifications** | Expo Notifications |
| **Admin Dashboard** | React.js / Next.js |
| **Hosting** | Firebase / AWS / Vercel |

---

## ⚙️ API Endpoints (Example)
| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/api/auth/register` | POST | Register student/teacher |
| `/api/auth/login` | POST | Login user |
| `/api/attendance/mark` | POST | Mark attendance (Geo/QR) |
| `/api/attendance/history/:id` | GET | Get user attendance |
| `/api/class/create` | POST | Create class |
| `/api/report/export` | GET | Download report |

---

## 🔮 Future Enhancements
- Facial recognition and biometric integration  
- Parent and management notification system  
- AI-based pattern analysis for fraud detection  
- Offline data caching and background syncing  

---

## 🏁 Conclusion
EduTrack revolutionizes attendance tracking through smart geolocation and QR-based verification, ensuring transparency, security, and efficiency across educational institutions.
