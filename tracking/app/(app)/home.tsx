import React from 'react';
import { useAuth } from '../context/AuthContext';
import StudentDashboard from '../screens/StudentDashboard';
import TeacherDashboard from '../screens/TeacherDashboard';
import AdminDashboard from '../screens/AdminDashboard';

export default function HomePage() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
}
