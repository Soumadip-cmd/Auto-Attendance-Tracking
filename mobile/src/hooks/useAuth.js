import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshUser,
    clearError,
    initAuth,
  } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initAuth();
  }, []);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshUser,
    clearError,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    isHod: user?.role === 'hod',
    isTeacher: user?.role === 'teacher' || user?.role === 'staff',
    isManager: user?.role === 'manager',
    isStaff: user?.role === 'staff',
  };
};
