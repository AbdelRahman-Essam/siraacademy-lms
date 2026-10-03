import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createCourse, updateCourse, uploadMediaFile } from "../../Redux/adminSlice";

// Handles both "create new course" and "edit existing course" — pricing,
// description, thumbnail/promo upload, and the Drive folder/account wiring
// a course needs before any lesson video can be uploaded into it.
export default function CourseForm({ course, onSaved }) {
  const dispatch = useDispatch();
  const storageAccounts = useSelector((s) => s.admin.storageAccounts || []);
  const [form, setForm] = useState({
    title: course?.title || "",
    description: course?.description || "",
    price: course?.price ?? 0,
    discountPercent: course?.discountPercent ?? 0,
    thumbnailUrl: course?.thumbnailUrl || "",
    promoVideoUrl: course?.promoVideoUrl || "",
    driveFolderId: course?.driveFolderId || "",
    storageAccount: course?.storageAccount?._id || course?.storageAccount || "",
  });
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(false);

  const finalPrice = form.price - (form.price * form.discountPercent) / 100;

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleFileChange(field, kind, e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(field);
    const url = await dispatch(uploadMediaFile(file, kind));
    set(field, url);
    setUploading(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, price: Number(form.price), discountPercent: Number(form.discountPercent) };
    if (course) await dispatch(updateCourse(course._id, payload));
    else await dispatch(createCourse(payload));
    setSaving(false);
    onSaved?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-ink/50">Title</label>
        <input className="w-full border rounded px-2 py-1" required
          value={form.title} onChange={(e) => set("title", e.target.value)} />
      </div>

      <div>
        <label className="text-xs text-ink/50">Description</label>
        <textarea className="w-full border rounded px-2 py-1" rows={3}
          value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink/50">Price (EGP)</label>
          <input type="number" min="0" step="0.01" className="w-full border rounded px-2 py-1"
            value={form.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-ink/50">Discount %</label>
          <input type="number" min="0" max="100" className="w-full border rounded px-2 py-1"
            value={form.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-ink/50">
        Final price: <strong>{form.price > 0 ? `${finalPrice.toFixed(2)} EGP` : "Free"}</strong>
      </p>

      <div>
        <label className="text-xs text-ink/50">Thumbnail image</label>
        <input type="file" accept="image/*" onChange={(e) => handleFileChange("thumbnailUrl", "photo", e)} />
        {uploading === "thumbnailUrl" && <span className="text-xs text-brass ml-2">Uploading…</span>}
        {form.thumbnailUrl && <img src={form.thumbnailUrl} alt="" className="h-16 mt-1 rounded" />}
      </div>

      <div>
        <label className="text-xs text-ink/50">Promo video (optional — public, not DRM-protected)</label>
        <input type="file" accept="video/*" onChange={(e) => handleFileChange("promoVideoUrl", "video", e)} />
        {uploading === "promoVideoUrl" && <span className="text-xs text-brass ml-2">Uploading…</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
        <div>
          <label className="text-xs text-ink/50">Course Drive folder ID</label>
          <input className="w-full border rounded px-2 py-1" placeholder="Paste the folder ID from the Drive URL"
            value={form.driveFolderId} onChange={(e) => set("driveFolderId", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-ink/50">Storage account</label>
          <select className="w-full border rounded px-2 py-1"
            value={form.storageAccount} onChange={(e) => set("storageAccount", e.target.value)}>
            <option value="">— choose —</option>
            {storageAccounts.map((a) => <option key={a._id} value={a._id}>{a.label} ({a.ownerEmail})</option>)}
          </select>
        </div>
      </div>
      <p className="text-xs text-ink/40">
        Both are required before you can upload lesson video for this course — the folder must
        already be shared with that Google account.
      </p>

      <button disabled={saving} className="bg-brand text-white px-4 py-2 rounded">
        {saving ? "Saving…" : course ? "Save changes" : "Create course"}
      </button>
    </form>
  );
}
