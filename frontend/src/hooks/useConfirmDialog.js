import { useCallback, useState } from "react";
import ConfirmDialog from "@/components/ui/confirm-dialog";

export function useConfirmDialog() {
  const [config, setConfig] = useState(null);

  const requestConfirm = useCallback((options) => {
    setConfig(options);
  }, []);

  const close = useCallback(() => {
    setConfig(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    const action = config?.onConfirm;
    close();
    await action?.();
  }, [config, close]);

  const dialog = (
    <ConfirmDialog
      open={Boolean(config)}
      onOpenChange={(open) => !open && close()}
      title={config?.title ?? ""}
      description={config?.description}
      confirmLabel={config?.confirmLabel ?? "Confirm"}
      cancelLabel={config?.cancelLabel ?? "Cancel"}
      destructive={config?.destructive ?? false}
      onConfirm={handleConfirm}
    />
  );

  return { requestConfirm, dialog };
}
