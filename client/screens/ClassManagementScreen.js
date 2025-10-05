import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ClassManagementScreen({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    teacher: '',
    room: '',
    time: '',
    days: '',
    capacity: '',
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = () => {
    // Dummy class data
    const dummyClasses = [
      {
        id: 1,
        name: 'Mathematics 101',
        teacher: 'Prof. Smith',
        room: 'Room 101',
        time: '09:00 AM - 10:30 AM',
        days: 'Mon, Wed, Fri',
        capacity: 40,
        enrolled: 35,
        status: 'active',
        qrCode: 'MATH101_2024',
      },
      {
        id: 2,
        name: 'Physics 201',
        teacher: 'Dr. Johnson',
        room: 'Lab 201',
        time: '11:30 AM - 01:00 PM',
        days: 'Tue, Thu',
        capacity: 30,
        enrolled: 28,
        status: 'active',
        qrCode: 'PHYS201_2024',
      },
      {
        id: 3,
        name: 'Chemistry 301',
        teacher: 'Prof. Brown',
        room: 'Lab 301',
        time: '02:00 PM - 03:30 PM',
        days: 'Mon, Wed, Fri',
        capacity: 25,
        enrolled: 22,
        status: 'active',
        qrCode: 'CHEM301_2024',
      },
      {
        id: 4,
        name: 'Computer Science 401',
        teacher: 'Dr. Williams',
        room: 'Lab 401',
        time: '10:00 AM - 11:30 AM',
        days: 'Tue, Thu, Sat',
        capacity: 35,
        enrolled: 32,
        status: 'inactive',
        qrCode: 'CS401_2024',
      },
    ];
    setClasses(dummyClasses);
  };

  const handleAddClass = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      teacher: '',
      room: '',
      time: '',
      days: '',
      capacity: '',
    });
    setModalVisible(true);
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      teacher: classItem.teacher,
      room: classItem.room,
      time: classItem.time,
      days: classItem.days,
      capacity: classItem.capacity.toString(),
    });
    setModalVisible(true);
  };

  const handleSaveClass = () => {
    if (!formData.name || !formData.teacher || !formData.room) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (editingClass) {
      // Update existing class
      const updatedClasses = classes.map(cls =>
        cls.id === editingClass.id
          ? {
              ...cls,
              ...formData,
              capacity: parseInt(formData.capacity) || 0,
            }
          : cls
      );
      setClasses(updatedClasses);
      Alert.alert('Success', 'Class updated successfully!');
    } else {
      // Add new class
      const newClass = {
        id: Date.now(),
        ...formData,
        capacity: parseInt(formData.capacity) || 0,
        enrolled: 0,
        status: 'active',
        qrCode: `${formData.name.replace(/\s+/g, '').toUpperCase()}_2024`,
      };
      setClasses([...classes, newClass]);
      Alert.alert('Success', 'New class created successfully!');
    }

    setModalVisible(false);
  };

  const handleDeleteClass = (classId) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setClasses(classes.filter(cls => cls.id !== classId));
            Alert.alert('Success', 'Class deleted successfully!');
          },
        },
      ]
    );
  };

  const handleToggleStatus = (classId) => {
    const updatedClasses = classes.map(cls =>
      cls.id === classId
        ? { ...cls, status: cls.status === 'active' ? 'inactive' : 'active' }
        : cls
    );
    setClasses(updatedClasses);
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#4CAF50' : '#F44336';
  };

  const getCapacityColor = (enrolled, capacity) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return '#F44336';
    if (percentage >= 75) return '#FF9800';
    return '#4CAF50';
  };

  const renderClassCard = (classItem) => (
    <View key={classItem.id} style={styles.classCard}>
      <View style={styles.classHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{classItem.name}</Text>
          <Text style={styles.classTeacher}>👨‍🏫 {classItem.teacher}</Text>
          <Text style={styles.classDetails}>📍 {classItem.room} • 🕐 {classItem.time}</Text>
          <Text style={styles.classDays}>📅 {classItem.days}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(classItem.status) }]}>
          <Text style={styles.statusText}>{classItem.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.classStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Enrollment</Text>
          <Text style={[styles.statValue, { color: getCapacityColor(classItem.enrolled, classItem.capacity) }]}>
            {classItem.enrolled}/{classItem.capacity}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>QR Code</Text>
          <Text style={styles.statValue}>{classItem.qrCode}</Text>
        </View>
      </View>

      <View style={styles.classActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditClass(classItem)}
        >
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => handleToggleStatus(classItem.id)}
        >
          <Text style={styles.actionButtonText}>
            {classItem.status === 'active' ? '⏸️ Deactivate' : '▶️ Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteClass(classItem.id)}
        >
          <Text style={styles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Management</Text>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{classes.length}</Text>
          <Text style={styles.summaryLabel}>Total Classes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{classes.filter(cls => cls.status === 'active').length}</Text>
          <Text style={styles.summaryLabel}>Active Classes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{classes.reduce((sum, cls) => sum + cls.enrolled, 0)}</Text>
          <Text style={styles.summaryLabel}>Total Students</Text>
        </View>
      </View>

      {/* Add Class Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
          <Text style={styles.addButtonText}>➕ Add New Class</Text>
        </TouchableOpacity>
      </View>

      {/* Classes List */}
      <ScrollView style={styles.classesList} showsVerticalScrollIndicator={false}>
        {classes.map(renderClassCard)}
      </ScrollView>

      {/* Add/Edit Class Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingClass ? 'Edit Class' : 'Add New Class'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Class Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                  placeholder="e.g., Mathematics 101"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Teacher *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.teacher}
                  onChangeText={(text) => setFormData({...formData, teacher: text})}
                  placeholder="e.g., Prof. Smith"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Room *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.room}
                  onChangeText={(text) => setFormData({...formData, room: text})}
                  placeholder="e.g., Room 101"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Time</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.time}
                  onChangeText={(text) => setFormData({...formData, time: text})}
                  placeholder="e.g., 09:00 AM - 10:30 AM"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Days</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.days}
                  onChangeText={(text) => setFormData({...formData, days: text})}
                  placeholder="e.g., Mon, Wed, Fri"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Capacity</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({...formData, capacity: text})}
                  placeholder="e.g., 40"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveClass}
                >
                  <Text style={styles.saveButtonText}>
                    {editingClass ? 'Update' : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  addButtonContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  classesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  classTeacher: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  classDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  classDays: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  classStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  toggleButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: width - 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});