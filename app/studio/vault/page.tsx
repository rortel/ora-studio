"use client";

import { useState, useEffect } from "react";
import {
  Shield, Plus, Trash2, ChevronDown, ChevronUp, X, Check,
  AlertCircle, Loader2, Pen, Building2, Palette, Type, Users, Package, Save
} from "lucide-react";

interface Persona {
  name: string;
  profile: string;
  pains: string;
  motivations: string;
}

interface Product {
  id?: string;
  name: string;
  description: string;
  benefits: string[];
  objections: string[];
  is_primary: boolean;
}

interface Vault {
  id: string;
  name: string;
  brand_name: string;
  logo_url?: string;
  website_url?: string;
  expertise?: string;
  mission?: string;
  usp?: string;
  tone_config?: { tone: string; formality: number; style: string };
  palette?: { primary: string[]; secondary: string[]; neutral: string[] };
  typography?: { heading: string; body: string };
  personas?: Persona[];
  products?: Product[];
}

const TONE_OPTIONS = ["professionnel", "chaleureux", "expert", "direct", "créatif", "inspirant"];
const STYLE_OPTIONS = ["formel", "décontracté", "storytelling", "informatif"];
const FONT_OPTIONS = ["Inter", "Playfair Display", "Montserrat", "Poppins", "Raleway", "Georgia", "Source Sans Pro"];

function ColorSwatch({ color, onRemove }: { color: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
      <div className="w-4 h-4 rounded-full border" style={{ background: color, borderColor: "var(--border)" }} />
      <span style={{ fontSize: "12px", color: "var(--foreground)" }}>{color}</span>
      <button onClick={onRemove} className="ml-0.5 hover:opacity-70">
        <X size={10} style={{ color: "var(--muted-foreground)" }} />
      </button>
    </div>
  );
}

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ background: "var(--card)" }}>
        <div className="flex items-center gap-2.5">
          <Icon size={15} style={{ color: "var(--ora-signal)" }} />
          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={15} style={{ color: "var(--muted-foreground)" }} /> : <ChevronDown size={15} style={{ color: "var(--muted-foreground)" }} />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1" style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function VaultPage() {
  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("trial");
  const [newColor, setNewColor] = useState({ primary: "", secondary: "", neutral: "" });
  const [newPersona, setNewPersona] = useState<Persona>({ name: "", profile: "", pains: "", motivations: "" });
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({ name: "", description: "", benefits: [], objections: [], is_primary: false });
  const [showProductForm, setShowProductForm] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [vaultRes, profileRes] = await Promise.all([
      fetch("/api/vault"),
      fetch("/api/credits"),
    ]);
    const vaultData = await vaultRes.json();
    const profileData = await profileRes.json();
    setUserPlan(profileData.plan ?? "trial");
    if (vaultData.vaults?.length > 0) {
      const v = vaultData.vaults[0];
      const productsRes = await fetch(`/api/vault/products?vault_id=${v.id}`);
      const productsData = await productsRes.json();
      setVault({ ...v, products: productsData.products ?? [] });
    }
    setLoading(false);
  }

  async function createVault() {
    setCreating(true);
    const res = await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Mon Brand Vault",
        brand_name: "",
        tone_config: { tone: "professionnel", formality: 3, style: "direct" },
        palette: { primary: [], secondary: [], neutral: [] },
        typography: { heading: "Inter", body: "Inter" },
        personas: [],
      }),
    });
    const data = await res.json();
    if (data.vault) setVault({ ...data.vault, products: [] });
    setCreating(false);
  }

  async function saveVault() {
    if (!vault) return;
    setSaving(true);
    await fetch("/api/vault", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vault),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addProduct() {
    if (!vault || !newProduct.name) return;
    const hasProduct = (vault.products ?? []).length > 0;
    setAddingProduct(true);
    const res = await fetch("/api/vault/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newProduct, vault_id: vault.id, is_primary: !hasProduct }),
    });
    const data = await res.json();
    if (data.error) { setAddingProduct(false); return; }
    if (data.product) setVault(v => v ? { ...v, products: [...(v.products ?? []), data.product] } : v);
    setNewProduct({ name: "", description: "", benefits: [], objections: [], is_primary: false });
    setShowProductForm(false);
    setAddingProduct(false);
  }

  async function deleteProduct(productId: string) {
    await fetch(`/api/vault/products?id=${productId}`, { method: "DELETE" });
    setVault(v => v ? { ...v, products: (v.products ?? []).filter(p => p.id !== productId) } : v);
  }

  function updateVault(field: keyof Vault, value: unknown) {
    setVault(v => v ? { ...v, [field]: value } : v);
  }

  function addColor(palette_key: "primary" | "secondary" | "neutral") {
    const color = newColor[palette_key];
    if (!color || !vault) return;
    const hex = color.startsWith("#") ? color : `#${color}`;
    updateVault("palette", { ...vault.palette, [palette_key]: [...(vault.palette?.[palette_key] ?? []), hex] });
    setNewColor(c => ({ ...c, [palette_key]: "" }));
  }

  function removeColor(palette_key: "primary" | "secondary" | "neutral", idx: number) {
    if (!vault) return;
    const arr = [...(vault.palette?.[palette_key] ?? [])];
    arr.splice(idx, 1);
    updateVault("palette", { ...vault.palette, [palette_key]: arr });
  }

  function addPersona() {
    if (!newPersona.name || !vault) return;
    updateVault("personas", [...(vault.personas ?? []), newPersona]);
    setNewPersona({ name: "", profile: "", pains: "", motivations: "" });
    setShowPersonaForm(false);
  }

  function removePersona(idx: number) {
    if (!vault) return;
    const arr = [...(vault.personas ?? [])];
    arr.splice(idx, 1);
    updateVault("personas", arr);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
      </div>
    );
  }

  if (userPlan === "trial" || userPlan === "generate") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--ora-signal-light)" }}>
          <Shield size={26} style={{ color: "var(--ora-signal)" }} />
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>
          Brand Vault — Studio uniquement
        </h2>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", maxWidth: 400, marginBottom: 24 }}>
          Le Brand Vault est disponible avec la formule Studio. Il stocke ton identité de marque et l'injecte automatiquement dans toutes tes générations.
        </p>
        <a href="/studio/credits"
          className="px-5 py-2.5 rounded-xl text-white"
          style={{ background: "var(--ora-signal)", fontSize: "14px", fontWeight: 500 }}>
          Passer à Studio — €49/mois
        </a>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "var(--ora-signal-light)" }}>
          <Shield size={26} style={{ color: "var(--ora-signal)" }} />
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>
          Crée ton Brand Vault
        </h2>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", maxWidth: 380, marginBottom: 24 }}>
          Un Brand Vault centralise l'identité de ta marque. Toutes tes générations l'utilisent automatiquement.
        </p>
        <button onClick={createVault} disabled={creating}
          className="px-5 py-2.5 rounded-xl text-white"
          style={{ background: "var(--ora-signal)", fontSize: "14px", fontWeight: 500 }}>
          {creating ? "Création…" : "Créer mon Vault"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
            Brand Vault
          </h1>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: 3 }}>
            Injecté automatiquement dans toutes tes générations.
          </p>
        </div>
        <button onClick={saveVault} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
          style={{
            background: saved ? "rgba(34,197,94,0.1)" : "var(--ora-signal)",
            color: saved ? "#16a34a" : "white",
            fontSize: "13px", fontWeight: 500,
            border: saved ? "1px solid rgba(34,197,94,0.3)" : "none",
          }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saving ? "Sauvegarde…" : saved ? "Sauvegardé" : "Sauvegarder"}
        </button>
      </div>

      <Section title="Identité de marque" icon={Building2}>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nom de la marque</label>
            <input value={vault.brand_name ?? ""} onChange={e => updateVault("brand_name", e.target.value)}
              placeholder="ex: Acme Corp" className="w-full mt-1.5 px-3 py-2 rounded-lg outline-none"
              style={{ fontSize: "13px", background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Site web</label>
            <input value={vault.website_url ?? ""} onChange={e => updateVault("website_url", e.target.value)}
              placeholder="https://..." className="w-full mt-1.5 px-3 py-2 rounded-lg outline-none"
              style={{ fontSize: "13px", background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
          </div>
        </div>
        <div className="mt-3">
          <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Expertise / Secteur</label>
          <input value={vault.expertise ?? ""} onChange={e => updateVault("expertise", e.target.value)}
            placeholder="ex: Logiciels SaaS B2B pour RH" className="w-full mt-1.5 px-3 py-2 rounded-lg outline-none"
            style={{ fontSize: "13px", background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
        </div>
        <div className="mt-3">
          <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mission (1 phrase)</label>
          <input value={vault.mission ?? ""} onChange={e => updateVault("mission", e.target.value)}
            placeholder="ex: Simplifier le recrutement pour les PME" className="w-full mt-1.5 px-3 py-2 rounded-lg outline-none"
            style={{ fontSize: "13px", background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
        </div>
        <div className="mt-3">
          <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Proposition de valeur (USP)</label>
          <textarea value={vault.usp ?? ""} onChange={e => updateVault("usp", e.target.value)}
            placeholder="Ce qui te rend unique vs les concurrents…" rows={2}
            className="w-full mt-1.5 px-3 py-2 rounded-lg outline-none resize-none"
            style={{ fontSize: "13px", background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
        </div>
      </Section>

      <Section title="Ton & Style éditorial" icon={Pen}>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ton principal</label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {TONE_OPTIONS.map(t => (
                <button key={t} onClick={() => updateVault("tone_config", { ...vault.tone_config, tone: t })}
                  className="px-2.5 py-1 rounded-lg transition-all capitalize"
                  style={{ fontSize: "12px", background: vault.tone_config?.tone === t ? "var(--ora-signal)" : "var(--secondary)", color: vault.tone_config?.tone === t ? "white" : "var(--foreground)", border: vault.tone_config?.tone === t ? "none" : "1px solid var(--border)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Style</label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {STYLE_OPTIONS.map(s => (
                <button key={s} onClick={() => updateVault("tone_config", { ...vault.tone_config, style: s })}
                  className="px-2.5 py-1 rounded-lg transition-all capitalize"
                  style={{ fontSize: "12px", background: vault.tone_config?.style === s ? "var(--ora-signal)" : "var(--secondary)", color: vault.tone_config?.style === s ? "white" : "var(--foreground)", border: vault.tone_config?.style === s ? "none" : "1px solid var(--border)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Formalité — {vault.tone_config?.formality ?? 3}/5
          </label>
          <input type="range" min={1} max={5} value={vault.tone_config?.formality ?? 3}
            onChange={e => updateVault("tone_config", { ...vault.tone_config, formality: Number(e.target.value) })}
            className="w-full mt-2" style={{ accentColor: "var(--ora-signal)" }} />
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Décontracté</span>
            <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Très formel</span>
          </div>
        </div>
      </Section>

      <Section title="Palette de couleurs" icon={Palette}>
        {(["primary", "secondary", "neutral"] as const).map(key => (
          <div key={key} className="mt-4">
            <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {key === "primary" ? "Couleurs primaires" : key === "secondary" ? "Secondaires" : "Neutres"}
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(vault.palette?.[key] ?? []).map((c, i) => (
                <ColorSwatch key={i} color={c} onRemove={() => removeColor(key, i)} />
              ))}
              <div className="flex items-center gap-1.5">
                <input type="color" value={newColor[key] || "#000000"}
                  onChange={e => setNewColor(c => ({ ...c, [key]: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border-0" />
                <input value={newColor[key]} onChange={e => setNewColor(c => ({ ...c, [key]: e.target.value }))}
                  placeholder="#RRGGBB" className="w-24 px-2 py-1 rounded-lg outline-none"
                  style={{ fontSize: "12px", background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
                <button onClick={() => addColor(key)} className="px-2.5 py-1 rounded-lg"
                  style={{ fontSize: "12px", background: "var(--ora-signal)", color: "white" }}>+</button>
              </div>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Typographies" icon={Type}>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {(["heading", "body"] as const).map(key => (
            <div key={key}>
              <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {key === "heading" ? "Titres" : "Corps de texte"}
              </label>
              <select value={vault.typography?.[key] ?? "Inter"} onChange={e => updateVault("typography", { ...vault.typography, [key]: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 rounded-lg outline-none"
                style={{ fontSize: "13px", background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Personas cibles" icon={Users}>
        <div className="space-y-3 mt-3">
          {(vault.personas ?? []).map((p, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{p.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>{p.profile}</div>
                </div>
                <button onClick={() => removePersona(i)}><X size={14} style={{ color: "var(--muted-foreground)" }} /></button>
              </div>
              {p.pains && <div className="mt-2" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}><strong>Douleurs:</strong> {p.pains}</div>}
              {p.motivations && <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}><strong>Motivations:</strong> {p.motivations}</div>}
            </div>
          ))}
          {showPersonaForm ? (
            <div className="p-4 rounded-xl space-y-2" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              {(["name", "profile", "pains", "motivations"] as const).map(field => (
                <input key={field} value={newPersona[field]} onChange={e => setNewPersona(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={{ name: "Nom du persona", profile: "Profil / poste", pains: "Douleurs principales", motivations: "Motivations" }[field]}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{ fontSize: "13px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={addPersona} className="px-3 py-1.5 rounded-lg text-white" style={{ fontSize: "12px", background: "var(--ora-signal)" }}>Ajouter</button>
                <button onClick={() => setShowPersonaForm(false)} className="px-3 py-1.5 rounded-lg"
                  style={{ fontSize: "12px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowPersonaForm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ fontSize: "13px", color: "var(--ora-signal)", background: "var(--ora-signal-light)", border: "none" }}>
              <Plus size={14} />Ajouter un persona
            </button>
          )}
        </div>
      </Section>

      <Section title="Produits & Services" icon={Package}>
        <div className="space-y-3 mt-3">
          {(vault.products ?? []).map((p, i) => (
            <div key={p.id ?? i} className="p-4 rounded-xl" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{p.name}</span>
                    {p.is_primary && (
                      <span className="px-1.5 py-0.5 rounded text-white"
                        style={{ fontSize: "9px", fontWeight: 600, background: "var(--ora-signal)" }}>INCLUS</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>{p.description}</div>
                </div>
                {p.id && <button onClick={() => deleteProduct(p.id!)}><Trash2 size={14} style={{ color: "var(--muted-foreground)" }} /></button>}
              </div>
            </div>
          ))}
          {showProductForm ? (
            <div className="p-4 rounded-xl space-y-2" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
              {(vault.products ?? []).length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg mb-2"
                  style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                  <AlertCircle size={13} style={{ color: "#f97316" }} />
                  <span style={{ fontSize: "12px", color: "#f97316" }}>Produit supplémentaire — 500 crédits débités</span>
                </div>
              )}
              <input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                placeholder="Nom du produit / service" className="w-full px-3 py-2 rounded-lg outline-none"
                style={{ fontSize: "13px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
              <textarea value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))}
                placeholder="Description du produit…" rows={2}
                className="w-full px-3 py-2 rounded-lg outline-none resize-none"
                style={{ fontSize: "13px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
              <div className="flex gap-2 pt-1">
                <button onClick={addProduct} disabled={addingProduct}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white"
                  style={{ fontSize: "12px", background: "var(--ora-signal)", opacity: addingProduct ? 0.7 : 1 }}>
                  {addingProduct ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  {(vault.products ?? []).length > 0 ? "Ajouter (500 cr)" : "Ajouter"}
                </button>
                <button onClick={() => setShowProductForm(false)} className="px-3 py-1.5 rounded-lg"
                  style={{ fontSize: "12px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowProductForm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ fontSize: "13px", color: "var(--ora-signal)", background: "var(--ora-signal-light)", border: "none" }}>
              <Plus size={14} />
              {(vault.products ?? []).length === 0 ? "Ajouter un produit (inclus)" : "Produit supplémentaire (+500 cr)"}
            </button>
          )}
        </div>
      </Section>
    </div>
  );
}
