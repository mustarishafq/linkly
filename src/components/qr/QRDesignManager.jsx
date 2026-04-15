import db from "@/api/openClient";

import { useState, useEffect } from "react";

import { Plus, QrCode } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import QRDesignCard from "./QRDesignCard";
import QRDesignForm from "./QRDesignForm";

export default function QRDesignManager({ link }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);

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
        is_active: noActiveExists, // first design auto-activates
      });
      toast({ title: "Design created" });
    }
    setShowForm(false);
    setEditingDesign(null);
    loadDesigns();
  }

  async function handleSetActive(design) {
    // Deactivate all others, then activate this one
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
    // If we deleted the active, auto-activate the first remaining
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

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">QR Code Designs</h3>
          {designs.length > 0 && (
            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{designs.length}</span>
          )}
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> New Design
        </button>
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
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Create Design
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {designs.map((design) => (
            <QRDesignCard
              key={design.id}
              design={design}
              linkSlug={link.slug}
              linkDomain={link.custom_domain}
              onSetActive={handleSetActive}
              onEdit={openEdit}
              onDelete={handleDelete}
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
    </div>
  );
}