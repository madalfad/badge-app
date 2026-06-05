import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export const badgeColors = {
  bg: "#07111F",
  bgOverlay: "#020912E6",
  border: "#26364F",
  borderStrong: "#3A4D6B",
  cardPaper: "#F8FAFC",
  danger: "#F87171",
  inputBg: "#0C1726",
  onPrimary: "#04231D",
  primary: "#2DD4BF",
  primaryDark: "#14B8A6",
  secondary: "#60A5FA",
  success: "#34D399",
  surface: "#101C2E",
  surfaceElevated: "#17243A",
  text: "#F8FAFC",
  textDim: "#64748B",
  textMuted: "#94A3B8",
  warning: "#FBBF24",
} as const;

export const badgeRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 28,
  pill: 999,
} as const;

const badgeSpace = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
} as const;

export function alpha(color: string, opacityHex: string) {
  return `${color}${opacityHex}`;
}

export function useBadgeLayout() {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 700;
  const isCompactHeight = height < 760;
  const isNarrow = width < 370;

  return {
    width,
    height,
    isCompactHeight,
    isNarrow,
    isWide,
    gutter: isNarrow ? badgeSpace[3] : badgeSpace[5],
    contentMaxWidth: isWide ? 430 : undefined,
  };
}

type BadgeScrollScreenProps = Omit<ScrollViewProps, "contentContainerStyle"> & {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  maxWidth?: number;
};

export function BadgeScrollScreen({
  children,
  contentContainerStyle,
  maxWidth,
  style,
  ...scrollProps
}: BadgeScrollScreenProps) {
  const layout = useBadgeLayout();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      style={[styles.screen, style]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          gap: layout.isCompactHeight ? badgeSpace[3] : badgeSpace[4],
          maxWidth: maxWidth ?? layout.contentMaxWidth,
          paddingHorizontal: layout.gutter,
          paddingTop: layout.isCompactHeight ? badgeSpace[3] : badgeSpace[4],
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

type BadgeTopBarProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function BadgeTopBar({
  eyebrow,
  title,
  subtitle,
  left,
  right,
  style,
}: BadgeTopBarProps) {
  return (
    <View style={[styles.topBar, style]}>
      <View style={styles.topBarSide}>{left}</View>
      <View style={styles.topBarCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text numberOfLines={1} style={styles.topBarTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.topBarSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.topBarSide, styles.topBarRight]}>{right}</View>
    </View>
  );
}

type BadgeButtonProps = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

export function BadgeButton({
  disabled,
  label,
  loading,
  onPress,
  style,
  textStyle,
  variant = "secondary",
  ...pressableProps
}: BadgeButtonProps) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      {...pressableProps}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.primaryButton,
        isDanger && styles.dangerButton,
        isGhost && styles.ghostButton,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? badgeColors.onPrimary : badgeColors.text} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isPrimary && styles.primaryButtonText,
            isDanger && styles.dangerButtonText,
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

type BadgePanelProps = {
  children: ReactNode;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BadgePanel({ children, elevated, style }: BadgePanelProps) {
  return (
    <View style={[styles.panel, elevated && styles.elevatedPanel, style]}>
      {children}
    </View>
  );
}

export function BadgeTextField({
  style,
  ...textInputProps
}: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={badgeColors.textDim}
      {...textInputProps}
      style={[styles.textField, style]}
    />
  );
}

type BadgeNoticeProps = {
  title: string;
  text: string;
  tone?: "info" | "warning" | "danger" | "success";
};

export function BadgeNotice({ text, title, tone = "info" }: BadgeNoticeProps) {
  const isWarning = tone === "warning";
  const isDanger = tone === "danger";
  const isSuccess = tone === "success";
  return (
    <View
      style={[
        styles.notice,
        isWarning && styles.warningNotice,
        isDanger && styles.dangerNotice,
        isSuccess && styles.successNotice,
      ]}
    >
      <Text
        style={[
          styles.noticeTitle,
          isWarning && styles.warningText,
          isDanger && styles.dangerText,
          isSuccess && styles.successText,
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.noticeText,
          isWarning && styles.warningText,
          isDanger && styles.dangerText,
          isSuccess && styles.successText,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: badgeColors.bg,
  },
  scrollContent: {
    width: "100%",
    alignSelf: "center",
    paddingBottom: badgeSpace[8],
  },
  topBar: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: badgeSpace[3],
  },
  topBarSide: {
    minWidth: 44,
    alignItems: "flex-start",
  },
  topBarRight: {
    alignItems: "flex-end",
  },
  topBarCopy: {
    flex: 1,
    alignItems: "center",
  },
  eyebrow: {
    color: badgeColors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  topBarTitle: {
    color: badgeColors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  topBarSubtitle: {
    color: badgeColors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  button: {
    minHeight: 42,
    borderRadius: badgeRadius.lg,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: badgeSpace[4],
    paddingVertical: badgeSpace[3],
  },
  primaryButton: {
    backgroundColor: badgeColors.primary,
    borderColor: badgeColors.primary,
  },
  dangerButton: {
    backgroundColor: alpha(badgeColors.danger, "1F"),
    borderColor: alpha(badgeColors.danger, "66"),
  },
  ghostButton: {
    backgroundColor: "transparent",
  },
  buttonText: {
    color: badgeColors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  primaryButtonText: {
    color: badgeColors.onPrimary,
  },
  dangerButtonText: {
    color: "#FCA5A5",
  },
  panel: {
    borderRadius: badgeRadius.xl,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.surface,
    padding: badgeSpace[4],
    gap: badgeSpace[3],
  },
  elevatedPanel: {
    backgroundColor: alpha(badgeColors.surface, "E6"),
  },
  textField: {
    minHeight: 48,
    borderRadius: badgeRadius.lg,
    borderWidth: 1,
    borderColor: badgeColors.border,
    backgroundColor: badgeColors.inputBg,
    color: badgeColors.text,
    fontSize: 15,
    fontWeight: "700",
    paddingHorizontal: badgeSpace[4],
  },
  notice: {
    borderRadius: badgeRadius.lg,
    borderWidth: 1,
    borderColor: alpha(badgeColors.secondary, "66"),
    backgroundColor: alpha(badgeColors.secondary, "17"),
    padding: badgeSpace[3],
    gap: badgeSpace[1],
  },
  warningNotice: {
    borderColor: alpha(badgeColors.warning, "77"),
    backgroundColor: alpha(badgeColors.warning, "1A"),
  },
  dangerNotice: {
    borderColor: alpha(badgeColors.danger, "66"),
    backgroundColor: alpha(badgeColors.danger, "17"),
  },
  successNotice: {
    borderColor: alpha(badgeColors.primary, "66"),
    backgroundColor: alpha(badgeColors.primary, "17"),
  },
  noticeTitle: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "900",
  },
  noticeText: {
    color: "#BFDBFE",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  warningText: {
    color: "#FDE68A",
  },
  dangerText: {
    color: "#FCA5A5",
  },
  successText: {
    color: "#99F6E4",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});
