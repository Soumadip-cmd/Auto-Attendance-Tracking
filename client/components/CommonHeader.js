import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';

const CommonHeader = ({ 
  title, 
  subtitle, 
  showBack = false, 
  onBack, 
  rightIcon, 
  onRightPress, 
  backgroundColor = '#6C63FF' 
}) => {
  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={backgroundColor} 
        translucent={false}
      />
      <View style={[styles.header, { backgroundColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            {showBack && (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={onBack}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            )}
            <View style={styles.titleSection}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          
          {rightIcon && (
            <TouchableOpacity 
              style={styles.rightButton} 
              onPress={onRightPress}
              activeOpacity={0.7}
            >
              {rightIcon}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  titleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  rightButton: {
    padding: 5,
  },
});

export default CommonHeader;