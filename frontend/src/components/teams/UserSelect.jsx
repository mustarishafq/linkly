import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/admin/AdminUserShared";

export default function UserSelect({
  id,
  users,
  loading = false,
  value,
  placeholder = "Select a user",
  emptyLabel = "No users available",
  onSelect,
}) {
  const disabled = loading || users.length === 0;
  const label = loading ? "Loading users…" : users.length === 0 ? emptyLabel : placeholder;

  return (
    <SelectPrimitive.Root
      value={value ? String(value) : undefined}
      disabled={disabled}
      onValueChange={(next) => {
        const user = users.find((row) => String(row.id) === next);
        if (user) onSelect(user);
      }}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm",
          "text-foreground data-[placeholder]:text-muted-foreground",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <SelectPrimitive.Value placeholder={label} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-[80] max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {users.map((user) => {
              const name = user.full_name || user.email;
              return (
                <SelectPrimitive.Item
                  key={user.id}
                  value={String(user.id)}
                  className="flex cursor-default select-none items-center gap-2.5 rounded-lg px-2 py-2 outline-none data-[highlighted]:bg-accent"
                >
                  <UserAvatar user={user} size="xs" />
                  <span className="min-w-0 flex-1">
                    <SelectPrimitive.ItemText>
                      <span className="block truncate text-sm font-medium leading-tight text-foreground">
                        {name}
                      </span>
                    </SelectPrimitive.ItemText>
                    {user.full_name ? (
                      <span className="mt-0.5 block truncate text-xs leading-tight text-muted-foreground">
                        {user.email}
                      </span>
                    ) : null}
                  </span>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
