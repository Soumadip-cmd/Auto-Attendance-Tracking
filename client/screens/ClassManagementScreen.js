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
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { Colors, CommonStyles } from '../theme/Colors';

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

  const getCapacityColor = (enrolled, capacity) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return Colors.error;
    if (percentage >= 75) return Colors.warning;
    return Colors.success;
  };

  const renderClassCard = (classItem) => (
    <View key={classItem.id} style={styles.classCard}>
      <View style={styles.classHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.className}>{classItem.name}</Text>
          <View style={styles.classDetailRow}>
            <FontAwesome5 name="chalkboard-teacher" size={14} color={Colors.textSecondary} />
            <Text style={styles.classDetailText}>{classItem.teacher}</Text>
          </View>
          <View style={styles.classDetailRow}>
            <FontAwesome5 name="map-marker-alt" size={14} color={Colors.textSecondary} />
            <Text style={styles.classDetailText}>{classItem.room}</Text>
          </View>
          <View style={styles.classDetailRow}>
            <FontAwesome5 name="clock" size={14} color={Colors.textSecondary} />
            <Text style={styles.classDetailText}>{classItem.time}</Text>
          </View>
          <View style={styles.classDetailRow}>
            <FontAwesome5 name="calendar-alt" size={14} color={Colors.textSecondary} />
            <Text style={styles.classDetailText}>{classItem.days}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: classItem.status === 'active' ? Colors.success : Colors.error }
        ]}>
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
          style={[styles.actionButton, { backgroundColor: Colors.primary }]}
          onPress={() => handleEditClass(classItem)}
        >
          <FontAwesome5 name="edit" size={14} color={Colors.surface} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.warning }]}
          onPress={() => handleToggleStatus(classItem.id)}
        >
          <FontAwesome5 
            name={classItem.status === 'active' ? 'pause' : 'play'} 
            size={14} 
            color={Colors.surface} 
          />
          <Text style={styles.actionButtonText}>
            {classItem.status === 'active' ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors.error }]}
          onPress={() => handleDeleteClass(classItem.id)}
        >
          <FontAwesome5 name="trash" size={14} color={Colors.surface} />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Class Management"
        subtitle="Manage your classes and schedules"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleAddClass} style={styles.headerAddButton}>
            <FontAwesome5 name="plus" size={20} color={Colors.surface} />
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <FontAwesome5 name="book-open" size={24} color={Colors.primary} />
            <Text style={styles.summaryNumber}>{classes.length}</Text>
            <Text style={styles.summaryLabel}>Total Classes</Text>
          </View>
          <View style={styles.summaryCard}>
            <FontAwesome5 name="play-circle" size={24} color={Colors.success} />
            <Text style={styles.summaryNumber}>{classes.filter(cls => cls.status === 'active').length}</Text>
            <Text style={styles.summaryLabel}>Active Classes</Text>
          </View>
          <View style={styles.summaryCard}>
            <FontAwesome5 name="users" size={24} color={Colors.info} />
            <Text style={styles.summaryNumber}>{classes.reduce((sum, cls) => sum + cls.enrolled, 0)}</Text>
            <Text style={styles.summaryLabel}>Total Students</Text>
          </View>
        </View>

        {/* Add Class Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
          <FontAwesome5 name="plus" size={20} color={Colors.surface} />
          <Text style={styles.addButtonText}>Add New Class</Text>
        </TouchableOpacity>

        {/* Classes List */}
        <ScrollView style={styles.classesList} showsVerticalScrollIndicator={false}>
          {classes.map(renderClassCard)}
        </ScrollView>
      </View>

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
                <FontAwesome5 name="times" size={20} color={Colors.textSecondary} />
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
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerAddButton: {
    padding: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    ...CommonStyles.shadow,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  addButton: {
    ...CommonStyles.primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  classesList: {
    flex: 1,
  },
  classCard: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    ...CommonStyles.shadow,
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
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  classDetailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  classStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 15,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
    color: Colors.textPrimary,
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 2,
  },
  actionButtonText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 25,
    width: width - 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
