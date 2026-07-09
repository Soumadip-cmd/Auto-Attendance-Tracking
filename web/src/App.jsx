import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import WorkSchedule from './pages/WorkSchedule';
import Geofences from './pages/Geofences';
import LiveTracking from './pages/LiveTracking';
import MovementPermissions from './pages/MovementPermissions';
import Departments from './pages/Departments';
import { isPathAllowedForRole, HOD_DEFAULT_PATH } from './utils/roleAccess';

// You may want to define ProtectedRoute here if needed
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

// Blocks direct URL navigation to pages outside a restricted role's allowed
// set (the Sidebar already hides these links, but hiding a link doesn't stop
// someone typing the URL directly).
function RoleRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!isPathAllowedForRole(user?.role, location.pathname)) {
    return <Navigate to={HOD_DEFAULT_PATH} replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              className: 'dark:bg-gray-800 dark:text-white',
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary:  '#fff',
                },
              },
              error: {
                duration:  4000,
                iconTheme:  {
                  primary: '#ef4444',
                  secondary:  '#fff',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleRoute><Dashboard /></RoleRoute>} />
              <Route path="employees" element={<Employees />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="live-tracking" element={<LiveTracking />} />
              <Route path="departments" element={<RoleRoute><Departments /></RoleRoute>} />
              <Route path="movement-permissions" element={<MovementPermissions />} />
              <Route path="geofences" element={<Geofences />} />
              <Route path="reports" element={<RoleRoute><Reports /></RoleRoute>} />
              <Route path="work-schedule" element={<RoleRoute><WorkSchedule /></RoleRoute>} />
              <Route path="settings" element={<RoleRoute><Settings /></RoleRoute>} />
            </Route>
            {/* Redirect any unknown route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
