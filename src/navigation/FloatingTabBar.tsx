import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fonts, radius, shadow } from '../theme/designSystem';
import { useIsDesktopWeb } from '../theme/responsive';
import BrandWordmark from '../components/BrandWordmark';

// iOS-style floating pill nav. Solid card background (not a native blur view)
// so it can't silently fail to render on a device/build where a blur native
// module doesn't resolve - a plain View + shadow always paints something.
const TAB_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Closet: 'shirt-outline',
  StyleProfile: 'sparkles-outline',
  StylistChat: 'chatbubble-ellipses-outline',
  More: 'grid-outline',
};

const TAB_ICON_ACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Closet: 'shirt',
  StyleProfile: 'sparkles',
  StylistChat: 'chatbubble-ellipses',
  More: 'grid',
};

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const isDesktop = useIsDesktopWeb();

  // Desktop web: a standard site header — wordmark on the left, the same five
  // destinations as tracked text links on the right, hairline underneath.
  // The Tab.Navigator flips tabBarPosition to 'top' in step with this, so the
  // navigator lays content out below the bar.
  if (isDesktop) {
    return (
      <View style={styles.topBar}>
        <View style={styles.topBarInner}>
          <BrandWordmark variant="header" />
          <View style={styles.topLinks}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const label = options.tabBarLabel ?? options.title ?? route.name;
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={String(label)}
                  onPress={onPress}
                  activeOpacity={0.7}
                  style={styles.topLink}
                >
                  <Text style={[styles.topLinkText, isFocused && styles.topLinkTextActive]}>
                    {String(label).toUpperCase()}
                  </Text>
                  <View style={[styles.topLinkRule, isFocused && styles.topLinkRuleActive]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel ?? options.title ?? route.name;
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const iconName = (isFocused ? TAB_ICON_ACTIVE[route.name] : TAB_ICON[route.name]) || 'ellipse-outline';

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={String(label)}
                onPress={onPress}
                activeOpacity={0.75}
                style={styles.tab}
              >
                {isFocused && <View style={styles.activeCapsule} />}
                <Ionicons name={iconName} size={18} color={isFocused ? colors.bone : colors.tobacco} />
                <Text
                  style={[styles.label, isFocused && styles.labelActive]}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  {String(label)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: colors.bone,
    borderBottomWidth: 1,
    borderBottomColor: colors.hair,
  },
  topBarInner: {
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    height: 64,
  },
  topLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  topLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  topLinkText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    color: colors.inkMuted,
  },
  topLinkTextActive: {
    color: colors.ink,
  },
  // Active state is the design system's camel rule, not a colour swap alone.
  topLinkRule: {
    marginTop: 4,
    height: 2,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  topLinkRuleActive: {
    backgroundColor: colors.camel,
  },
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    backgroundColor: 'transparent',
  },
  pill: {
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hair,
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    marginHorizontal: 2,
  },
  activeCapsule: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.ink,
    borderRadius: radius.full,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    letterSpacing: 0.2,
    color: colors.tobacco,
    marginLeft: 5,
  },
  labelActive: {
    fontFamily: fonts.sansSemiBold,
    color: colors.bone,
  },
});
