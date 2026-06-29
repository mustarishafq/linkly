import { QrCode } from "lucide-react";
import FormDialog, { FormDialogBody } from "@/components/ui/form-dialog";
import QRDesignManager from "./QRDesignManager";

export default function QRDesignDialog({ link, onClose }) {
  return (
    <FormDialog
      onClose={onClose}
      title="QR Code Designs"
      icon={QrCode}
      maxWidth="2xl"
      className="w-[calc(100vw-1.5rem)] max-h-[90vh]"
    >
      <FormDialogBody>
        <QRDesignManager link={link} />
      </FormDialogBody>
    </FormDialog>
  );
}
