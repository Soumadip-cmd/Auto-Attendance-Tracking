import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  profile: 'person'
};
export function TabBar({
  state,
  descriptors,
  navigation
}) {
  const {
    theme
  } = useTheme();
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter(route => {
    const {
      options
    } = descriptors[route.key];
    return options.href !== null;
  });

  // Many tabs won't fit with labels — drop labels once the bar gets crowded
  // so every tab stays reachable on screen instead of overflowing off-screen.
  const compact = visibleRoutes.length > 6;
  return <View style={[styles.wrapper, {
    backgroundColor: theme.colors.card,
    borderTopColor: theme.colors.border,
    paddingBottom: Math.max(insets.bottom, 10),
    ...theme.shadows.lg
  }]}>
      <View style={styles.bar}>
        {visibleRoutes.map(route => {
        const {
          options
        } = descriptors[route.key];
        const routeIndex = state.routes.findIndex(r => r.key === route.key);
        const isFocused = state.index === routeIndex;
        const label = options.title ?? route.name;
        const iconName = ICONS[route.name] || 'ellipse';
        const onPress = () => {
          Haptics.selectionAsync().catch(() => {});
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return <TouchableOpacity key={route.key} accessibilityRole="button" accessibilityLabel={label} accessibilityState={isFocused ? {
          selected: true
        } : {}} onPress={onPress} activeOpacity={0.7} style={styles.tab}>
              <View style={[styles.iconPill, isFocused && {
            backgroundColor: theme.colors.primary + '1f'
          }]}>
                <Ionicons name={isFocused ? iconName : `${iconName}-outline`} size={compact ? 18 : 20} color={isFocused ? theme.colors.primary : theme.colors.textSecondary} />
              </View>
              {!compact && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.label, {
            color: isFocused ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: isFocused ? '700' : '500',
            fontFamily: isFocused ? theme.fontFamily.bold : theme.fontFamily.medium
          }]}>
                  {label}
                </Text>}
              {compact && isFocused && <View style={[styles.dot, {
            backgroundColor: theme.colors.primary
          }]} />}
            </TouchableOpacity>;
      })}
      </View>
    </View>;
}
const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 4
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch'
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2
  },
  iconPill: {
    minWidth: 30,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
    fontFamily: "Inter_400Regular"
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2
  }
});
