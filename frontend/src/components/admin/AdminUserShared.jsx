import { CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function getInitials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserAvatar({ user, size = "md", label }) {
  const sizeClasses = size === "sm" ? "h-8 w-8" : size === "xs" ? "h-7 w-7" : "h-10 w-10";
  const textClasses =
    size === "sm" ? "text-[10px]" : size === "xs" ? "text-[10px]" : "text-sm";

  const initials = getInitials(
    typeof user === "string" ? user : user?.full_name,
    typeof user === "string" ? null : user?.email
  );

  return (
    <Avatar className={cn(sizeClasses, "rounded-lg shrink-0")}>
      <AvatarFallback
        className={cn(
          "rounded-lg bg-primary/10 font-semibold text-primary",
          textClasses
        )}
        title={label}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <Badge
      variant={isAdmin ? "default" : "secondary"}
      className={cn("capitalize font-normal", isAdmin && "gap-1")}
    >
      {isAdmin && <ShieldCheck className="h-3 w-3" />}
      {role || "user"}
    </Badge>
  );
}

export function ApprovalBadge({ approved }) {
  return approved ? (
    <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10 gap-1 font-normal">
      <CheckCircle className="h-3 w-3" />
      Approved
    </Badge>
  ) : (
    <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/10 gap-1 font-normal">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}
