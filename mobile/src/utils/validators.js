export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

export const validatePhone = (phone) => {
  const regex = /^\+?[\d\s-()]+$/;
  return regex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validateEmployeeId = (employeeId) => {
  return employeeId && employeeId.length >= 3;
};

export const validateName = (name) => {
  return name && name.trim().length >= 2;
};

export const getPasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/. test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[@$! %*?&]/.test(password)) strength++;
  
  if (strength <= 2) return { level: 'weak', color: '#ef4444', text: 'Weak' };
  if (strength <= 4) return { level: 'medium', color: '#f59e0b', text: 'Medium' };
  return { level: 'strong', color: '#10b981', text: 'Strong' };
};