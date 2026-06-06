import { usePathname, useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BadgeIcon, type BadgeIconName } from "./BadgeIcon";
import { alpha, badgeColors, badgeRadius } from "./badge-ui";
import { emitTabReset } from "@/navigation/tabResetEvents";

type BottomNavRoute = "/" | "/reels" | "/add" | "/search" | "/settings";

type BottomNavItem = {
  href: BottomNavRoute;
  icon: BadgeIconName;
  label: string;
  center?: boolean;
};

const NAV_ITEMS: BottomNavItem[] = [
  { href: "/", icon: "home", label: "Home" },
  { href: "/reels", icon: "layers", label: "Reels" },
  { href: "/add", icon: "plus", label: "Add", center: true },
  { href: "/search", icon: "search", label: "Search" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

function isRouteSelected(pathname: string, href: BottomNavRoute) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/add") {
    return pathname.startsWith("/add");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BadgeBottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handlePress = (item: BottomNavItem) => {
    if (pathname === item.href) {
      emitTabReset(item.href);
      return;
    }

    router.push(item.href as Href);
  };

  return (
    <View style={styles.wrapper}>
      {NAV_ITEMS.map((item) => {
        const selected = isRouteSelected(pathname, item.href);
        return (
          <Pressable
            key={item.href}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => handlePress(item)}
            style={({ pressed }) => [
              styles.navButton,
              item.center && styles.centerButton,
              selected && !item.center && styles.selectedButton,
              selected && item.center && styles.centerButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <BadgeIcon
              name={item.icon}
              color={
                item.center
                  ? badgeColors.onPrimary
                  : selected
                    ? badgeColors.text
                    : badgeColors.textMuted
              }
              size={item.center ? 25 : 20}
            />
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              style={[
                styles.navText,
                item.center && styles.centerText,
                selected && !item.center && styles.selectedText,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    borderRadius: badgeRadius["2xl"],
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: alpha(badgeColors.surface, "F2"),
    padding: 8,
    marginHorizontal: 12,
    marginTop: 8,
  },
  navButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 4,
  },
  selectedButton: {
    backgroundColor: alpha(badgeColors.primary, "22"),
  },
  centerButton: {
    flex: 1.08,
    minHeight: 60,
    borderRadius: 24,
    backgroundColor: badgeColors.primary,
  },
  centerButtonSelected: {
    backgroundColor: badgeColors.primaryDark,
  },
  navText: {
    width: "100%",
    color: badgeColors.textMuted,
    fontSize: 10.5,
    fontWeight: "900",
    textAlign: "center",
  },
  selectedText: {
    color: badgeColors.text,
  },
  centerText: {
    color: badgeColors.onPrimary,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
