// Dummy data for testing frontend without backend

export const dummyUsers = {
  student: {
    _id: 'student123',
    username: 'john_student',
    name: 'John Doe',
    email: 'john@student.com',
    role: 'student',
  },
  teacher: {
    _id: 'teacher123',
    username: 'jane_teacher',
    name: 'Jane Smith',
    email: 'jane@teacher.com',
    role: 'teacher',
  },
  admin: {
    _id: 'admin123',
    username: 'admin',
    name: 'Admin User',
    email: 'admin@school.com',
    role: 'admin',
  },
};

export const dummyClasses = [
  {
    _id: 'class1',
    name: 'Mathematics 101',
    teacher_id: 'teacher123',
    teacher_name: 'Jane Smith',
    schedule: {
      time: '9:00 AM - 10:30 AM',
      days: ['Monday', 'Wednesday', 'Friday'],
    },
    students: ['student123', 'student456', 'student789'],
    created_at: '2025-01-15T00:00:00Z',
  },
  {
    _id: 'class2',
    name: 'Physics 201',
    teacher_id: 'teacher456',
    teacher_name: 'Dr. Robert Brown',
    schedule: {
      time: '11:00 AM - 12:30 PM',
      days: ['Tuesday', 'Thursday'],
    },
    students: ['student123', 'student456'],
    created_at: '2025-01-16T00:00:00Z',
  },
  {
    _id: 'class3',
    name: 'Computer Science 301',
    teacher_id: 'teacher123',
    teacher_name: 'Jane Smith',
    schedule: {
      time: '2:00 PM - 4:00 PM',
      days: ['Monday', 'Thursday'],
    },
    students: ['student123', 'student789'],
    created_at: '2025-01-17T00:00:00Z',
  },
];

export const dummyAttendanceHistory = [
  {
    _id: 'att1',
    student_id: 'student123',
    student_name: 'John Doe',
    class_id: 'class1',
    class_name: 'Mathematics 101',
    date: '2025-10-28',
    time: '9:15 AM',
    status: 'present',
    location: { latitude: 40.7128, longitude: -74.0060 },
  },
  {
    _id: 'att2',
    student_id: 'student123',
    student_name: 'John Doe',
    class_id: 'class2',
    class_name: 'Physics 201',
    date: '2025-10-27',
    time: '11:10 AM',
    status: 'present',
    location: { latitude: 40.7128, longitude: -74.0060 },
  },
  {
    _id: 'att3',
    student_id: 'student123',
    student_name: 'John Doe',
    class_id: 'class1',
    class_name: 'Mathematics 101',
    date: '2025-10-25',
    time: '9:05 AM',
    status: 'late',
    location: { latitude: 40.7128, longitude: -74.0060 },
  },
  {
    _id: 'att4',
    student_id: 'student123',
    student_name: 'John Doe',
    class_id: 'class3',
    class_name: 'Computer Science 301',
    date: '2025-10-24',
    time: '2:00 PM',
    status: 'present',
    location: { latitude: 40.7128, longitude: -74.0060 },
  },
];

export const dummyAdminDashboard = {
  statistics: {
    total_students: 156,
    total_teachers: 24,
    total_classes: 48,
    flagged_attendance: 12,
  },
  recent_flagged: [
    {
      _id: 'flag1',
      student_name: 'Alice Johnson',
      class_name: 'Biology 101',
      flag_reason: 'Location mismatch - outside campus',
      date: '2025-10-28',
      time: '10:30 AM',
    },
    {
      _id: 'flag2',
      student_name: 'Bob Williams',
      class_name: 'Chemistry 201',
      flag_reason: 'Multiple check-ins detected',
      date: '2025-10-28',
      time: '9:45 AM',
    },
    {
      _id: 'flag3',
      student_name: 'Carol Davis',
      class_name: 'Mathematics 101',
      flag_reason: 'Suspicious timing pattern',
      date: '2025-10-27',
      time: '2:15 PM',
    },
  ],
};

export const dummyTeacherClasses = [
  {
    _id: 'class1',
    name: 'Mathematics 101',
    teacher_id: 'teacher123',
    teacher_name: 'Jane Smith',
    schedule: {
      time: '9:00 AM - 10:30 AM',
      days: ['Monday', 'Wednesday', 'Friday'],
    },
    students: ['student123', 'student456', 'student789'],
    total_students: 35,
    created_at: '2025-01-15T00:00:00Z',
  },
  {
    _id: 'class3',
    name: 'Computer Science 301',
    teacher_id: 'teacher123',
    teacher_name: 'Jane Smith',
    schedule: {
      time: '2:00 PM - 4:00 PM',
      days: ['Monday', 'Thursday'],
    },
    students: ['student123', 'student789'],
    total_students: 28,
    created_at: '2025-01-17T00:00:00Z',
  },
];

export const dummyClassDetails = {
  class_info: {
    _id: 'class1',
    name: 'Mathematics 101',
    teacher_name: 'Jane Smith',
    schedule: {
      time: '9:00 AM - 10:30 AM',
      days: ['Monday', 'Wednesday', 'Friday'],
    },
  },
  attendance_records: [
    {
      date: '2025-10-28',
      students: [
        { student_name: 'John Doe', status: 'present', time: '9:15 AM' },
        { student_name: 'Alice Brown', status: 'present', time: '9:10 AM' },
        { student_name: 'Bob Wilson', status: 'late', time: '9:35 AM' },
        { student_name: 'Carol White', status: 'absent' },
      ],
    },
    {
      date: '2025-10-25',
      students: [
        { student_name: 'John Doe', status: 'late', time: '9:30 AM' },
        { student_name: 'Alice Brown', status: 'present', time: '9:05 AM' },
        { student_name: 'Bob Wilson', status: 'present', time: '9:15 AM' },
        { student_name: 'Carol White', status: 'present', time: '9:12 AM' },
      ],
    },
  ],
};

// Mock login function
export const mockLogin = async (username: string, password: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Accept any credentials for demo
  if (username.includes('student') || password === 'student') {
    return { token: 'dummy-token-student', user: dummyUsers.student };
  } else if (username.includes('teacher') || password === 'teacher') {
    return { token: 'dummy-token-teacher', user: dummyUsers.teacher };
  } else if (username.includes('admin') || password === 'admin') {
    return { token: 'dummy-token-admin', user: dummyUsers.admin };
  } else {
    // Default to student for any other credentials
    return { token: 'dummy-token-student', user: dummyUsers.student };
  }
};

// Mock register function
export const mockRegister = async (
  username: string,
  password: string,
  name: string,
  email: string,
  role: string
) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const user = {
    _id: `${role}${Math.random().toString(36).substr(2, 9)}`,
    username,
    name,
    email,
    role,
  };
  
  return { token: `dummy-token-${role}`, user };
};
