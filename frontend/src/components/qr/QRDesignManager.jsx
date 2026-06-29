import db from "@/api/openClient";

import { useState, useEffect } from "react";

import { Plus, QrCode } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import QRDesignCard from "./QRDesignCard";
import QRDesignForm from "./QRDesignForm";

export default function QRDesignManager({ link }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

  async function loadDesigns() {
    const data = await db.entities.QRDesign.filter({ link_id: link.id }, "-created_date");
    setDesigns(data);
    setLoading(false);
  }

  useEffect(() => {
    loadDesigns();
  }, [link.id]);

  async function handleSave(formData) {
    const noActiveExists = designs.filter((d) => d.is_active).length === 0;
    if (editingDesign) {
      await db.entities.QRDesign.update(editingDesign.id, formData);
      toast({ title: "Design updated" });
    } else {
      await db.entities.QRDesign.create({
        ...formData,
        link_id: link.id,
        is_active: noActiveExists,
      });
      toast({ title: "Design created" });
    }
    setShowForm(false);
    setEditingDesign(null);
    loadDesigns();
  }

  async function handleSetActive(design) {
    await Promise.all(
      designs
        .filter((d) => d.id !== design.id && d.is_active)
        .map((d) => db.entities.QRDesign.update(d.id, { is_active: false }))
    );
    await db.entities.QRDesign.update(design.id, { is_active: true });
    toast({ title: "Active design updated" });
    loadDesigns();
  }

  async function handleDelete(design) {
    await db.entities.QRDesign.delete(design.id);
    if (design.is_active) {
      const remaining = designs.filter((d) => d.id !== design.id);
      if (remaining.length > 0) {
        await db.entities.QRDesign.update(remaining[0].id, { is_active: true });
      }
    }
    toast({ title: "Design deleted" });
    loadDesigns();
  }

  function openEdit(design) {
    setEditingDesign(design);
    setShowForm(true);
  }

  function openCreate() {
    setEditingDesign(null);
    setShowForm(true);
  }

  function runPendingAction() {
    const action = pendingAction;
    setPendingAction(null);
    action?.run?.();
  }

  const confirmCopy = (() => {
    if (!pendingAction) return null;

    switch (pendingAction.type) {
      case "activate":
        return {
          title: "Set active QR design?",
          description: `"${pendingAction.design.name}" will become the QR code shown for this link.`,
          confirmLabel: "Set active",
        };
      case "delete":
        return {
          title: "Delete QR design?",
          description: `"${pendingAction.design.name}" will be removed permanently.${
            pendingAction.design.is_active ? " Another design will be activated if one exists." : ""
          }`,
          confirmLabel: "Delete",
          destructive: true,
        };
      default:
        return null;
    }
  })();

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        {designs.length > 0 && (
          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full tabular-nums mr-auto">
            {designs.length} design{designs.length === 1 ? "" : "s"}
          </span>
        )}
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          New Design
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : designs.length === 0 ? (
        <div className="text-center py-10">
          <QrCode className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No QR designs yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first QR code design for this link</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Create Design
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {designs.map((design) => (
            <QRDesignCard
              key={design.id}
              design={design}
              linkSlug={link.slug}
              linkDomain={link.custom_domain}
              onSetActive={(item) =>
                setPendingAction({
                  type: "activate",
                  design: item,
                  run: () => handleSetActive(item),
                })
              }
              onEdit={openEdit}
              onDelete={(item) =>
                setPendingAction({
                  type: "delete",
                  design: item,
                  run: () => handleDelete(item),
                })
              }
            />
          ))}
        </div>
      )}

      {showForm && (
        <QRDesignForm
          design={editingDesign}
          linkSlug={link.slug}
          linkDomain={link.custom_domain}
          onClose={() => { setShowForm(false); setEditingDesign(null); }}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={confirmCopy?.title}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel}
        destructive={confirmCopy?.destructive}
        onConfirm={runPendingAction}
      />
    </>
  );
}
