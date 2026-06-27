import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFaviconUrl } from "@/lib/favicon";

const sizeStyles = {
  sm: {
    box: "w-10 h-10",
    img: "w-5 h-5",
    icon: "w-4 h-4",
  },
  md: {
    box: "w-11 h-11",
    img: "w-5 h-5",
    icon: "w-4 h-4",
  },
};

export default function LinkFavicon({ url, size = "sm", className }) {
  const faviconUrl = getFaviconUrl(url);
  const [failed, setFailed] = useState(false);
  const styles = sizeStyles[size] || sizeStyles.sm;
  const showImage = Boolean(faviconUrl) && !failed;

  return (
    <div
      className={cn(
        styles.box,
        "rounded-xl border border-border bg-muted/50 flex items-center justify-center overflow-hidden ring-1 ring-black/5 dark:ring-white/5 shrink-0",
        className
      )}
    >
      {showImage ? (
        <img
          src={faviconUrl}
          alt=""
          className={styles.img}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <Globe className={cn(styles.icon, "text-muted-foreground")} />
      )}
    </div>
  );
}
