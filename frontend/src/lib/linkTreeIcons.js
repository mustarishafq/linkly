/** Curated Lucide icons for custom Link Tree blocks. */
import {
  Activity,
  Award,
  BadgeCheck,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  Car,
  ClipboardList,
  Coffee,
  Crown,
  Download,
  ExternalLink,
  FileText,
  Gift,
  Globe,
  HandHeart,
  Headphones,
  Heart,
  Home,
  Image,
  Leaf,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  Moon,
  Music,
  Phone,
  Plane,
  Play,
  Send,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Sun,
  Ticket,
  Utensils,
  Users,
  Video,
  Zap,
} from "lucide-react";

export const CUSTOM_BLOCK_ICONS = [
  { id: "link", label: "Link", Icon: Link2 },
  { id: "globe", label: "Website", Icon: Globe },
  { id: "external", label: "External", Icon: ExternalLink },
  { id: "mail", label: "Mail", Icon: Mail },
  { id: "phone", label: "Phone", Icon: Phone },
  { id: "map", label: "Map", Icon: MapPin },
  { id: "chat", label: "Chat", Icon: MessageCircle },
  { id: "calendar", label: "Calendar", Icon: Calendar },
  { id: "shop", label: "Shop", Icon: ShoppingBag },
  { id: "cart", label: "Cart", Icon: ShoppingCart },
  { id: "gift", label: "Gift", Icon: Gift },
  { id: "heart", label: "Heart", Icon: Heart },
  { id: "star", label: "Star", Icon: Star },
  { id: "music", label: "Music", Icon: Music },
  { id: "play", label: "Play", Icon: Play },
  { id: "video", label: "Video", Icon: Video },
  { id: "camera", label: "Camera", Icon: Camera },
  { id: "image", label: "Image", Icon: Image },
  { id: "mic", label: "Mic", Icon: Mic },
  { id: "headphones", label: "Audio", Icon: Headphones },
  { id: "book", label: "Book", Icon: BookOpen },
  { id: "briefcase", label: "Work", Icon: Briefcase },
  { id: "users", label: "People", Icon: Users },
  { id: "home", label: "Home", Icon: Home },
  { id: "store", label: "Store", Icon: Store },
  { id: "coffee", label: "Coffee", Icon: Coffee },
  { id: "food", label: "Food", Icon: Utensils },
  { id: "car", label: "Car", Icon: Car },
  { id: "plane", label: "Travel", Icon: Plane },
  { id: "ticket", label: "Ticket", Icon: Ticket },
  { id: "clipboard", label: "Form", Icon: ClipboardList },
  { id: "file", label: "File", Icon: FileText },
  { id: "download", label: "Download", Icon: Download },
  { id: "send", label: "Send", Icon: Send },
  { id: "bell", label: "Alerts", Icon: Bell },
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "zap", label: "Zap", Icon: Zap },
  { id: "crown", label: "Premium", Icon: Crown },
  { id: "award", label: "Award", Icon: Award },
  { id: "check", label: "Verified", Icon: BadgeCheck },
  { id: "care", label: "Care", Icon: HandHeart },
  { id: "health", label: "Health", Icon: Stethoscope },
  { id: "activity", label: "Activity", Icon: Activity },
  { id: "leaf", label: "Nature", Icon: Leaf },
  { id: "sun", label: "Sun", Icon: Sun },
  { id: "moon", label: "Moon", Icon: Moon },
];

const ICON_BY_ID = Object.fromEntries(CUSTOM_BLOCK_ICONS.map((item) => [item.id, item]));

export const CUSTOM_BLOCK_ICON_IDS = CUSTOM_BLOCK_ICONS.map((item) => item.id);

export const DEFAULT_CUSTOM_BLOCK_ICON = "link";

export function isCustomBlockIcon(id) {
  return CUSTOM_BLOCK_ICON_IDS.includes(String(id || ""));
}

export function normalizeCustomBlockIcon(id) {
  const value = String(id || "").trim();
  return isCustomBlockIcon(value) ? value : DEFAULT_CUSTOM_BLOCK_ICON;
}

export function getCustomBlockIcon(id) {
  const key = normalizeCustomBlockIcon(id);
  return ICON_BY_ID[key]?.Icon || Link2;
}
