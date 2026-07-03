import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';

const ICONS = {
  index: 'home',
  attendance: 'calendar',
  history: 'time',
  map: 'map',
  movement: 'navigate',
  permits: 'shield-checkmark',
  admin: 'shield',
  reports: 'stats-chart',
  profile: 'person',
};

export function TabBar({ state, descriptors, navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return options.href !== null;
  });

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
          ...theme.shadows.lg,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bar}
      >
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === routeIndex;
          const label = options.title ?? route.name;
          const iconName = ICONS[route.name] || 'ellipse';

          const onPress = () => {
            Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <View
                style={[
                  styles.iconPill,
                  isFocused && {
                    backgroundColor: theme.colors.primary + '1f',
                  },
                ]}
              >
                <Ionicons
                  name={isFocused ? iconName : `${iconName}-outline`}
                  size={20}
                  color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
                />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.label,
                  {
                    color: isFocused ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 4,
  },
  tab: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  iconPill: {
    width: 38,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
});
