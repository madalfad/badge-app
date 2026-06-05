import {
  Archive,
  ArrowLeft,
  Badge,
  Camera,
  Check,
  ChevronRight,
  Circle,
  FileText,
  HeartPulse,
  Home,
  Image as ImageIcon,
  Layers3,
  Link,
  MoreVertical,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Stethoscope,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react-native";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

export type BadgeIconName =
  | "archive"
  | "arrow-left"
  | "badge"
  | "camera"
  | "check"
  | "chevron-right"
  | "circle"
  | "file-text"
  | "heart-pulse"
  | "home"
  | "image"
  | "layers"
  | "link"
  | "more-vertical"
  | "plus"
  | "refresh"
  | "rotate"
  | "search"
  | "settings"
  | "sliders"
  | "star"
  | "stethoscope"
  | "trash"
  | "upload"
  | "x";

const ICONS: Record<BadgeIconName, LucideIcon> = {
  archive: Archive,
  "arrow-left": ArrowLeft,
  badge: Badge,
  camera: Camera,
  check: Check,
  "chevron-right": ChevronRight,
  circle: Circle,
  "file-text": FileText,
  "heart-pulse": HeartPulse,
  home: Home,
  image: ImageIcon,
  layers: Layers3,
  link: Link,
  "more-vertical": MoreVertical,
  plus: Plus,
  refresh: RefreshCw,
  rotate: RotateCw,
  search: Search,
  settings: Settings,
  sliders: SlidersHorizontal,
  star: Star,
  stethoscope: Stethoscope,
  trash: Trash2,
  upload: Upload,
  x: X,
};

type BadgeIconProps = {
  name: BadgeIconName;
  color?: ColorValue;
  size?: number;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function BadgeIcon({
  name,
  color = "#F8FAFC",
  size = 20,
  strokeWidth = 2.35,
  style,
}: BadgeIconProps) {
  const Icon = ICONS[name];
  return (
    <Icon
      color={color}
      pointerEvents="none"
      size={size}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
}
