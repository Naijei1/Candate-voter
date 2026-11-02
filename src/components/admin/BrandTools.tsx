"use client";

import { useState } from "react";
import { COPY_FIELDS, COPY_LABELS, type SiteCopy } from "@/lib/content/copy";
import { clampCrop, type MediaSlot } from "@/lib/content/media-rules";

export function BrandTools({ initial }: { initial: SiteCopy }) {
  const [copy, setCopy] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const body: Record<string, string> = {};
    for (const field of COPY_FIELDS) body[field] = copy[field] ?? "";
    try {
      const response = await fetch("/api/admin/copy", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readJson(response);
      setMessage(response.ok ? "Saved." : (payload.message ?? "Not saved."));
    } catch {
      setMessage("Not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form className="finder" onSubmit={save}>
        {COPY_FIELDS.map((field) => (
          <label key={field} htmlFor={field}>
            {COPY_LABELS[field]}
            <textarea
              id={field}
              rows={4}
              value={copy[field] ?? ""}
              onChange={(event) => setCopy((current) => ({ ...current, [field]: event.target.value }))}
            />
          </label>
        ))}
        <button className="btn btn-cta" type="submit" disabled={busy}>
          Save copy
        </button>
      </form>
      <h2>Images</h2>
      <p>Crop, then upload. Empty slots stay a placeholder.</p>
      <ImageSlot slot="logo" label="Logo" current={copy.logoKey} />
      <ImageSlot slot="hero" label="Homepage photo" current={copy.heroKey} />
      <ImageSlot slot="founder" label="Founder photo" current={copy.founderKey} />
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}

function ImageSlot({ slot, label, current }: { slot: MediaSlot; label: string; current: string | null }) {
  const [preview, setPreview] = useState<string | null>(current ? `/media/${slot}` : null);
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 100 });

  async function upload() {
    if (!file) return;
    setMessage(null);
    const bitmap = await createImageBitmap(file);
    const box = clampCrop({
      width: bitmap.width,
      height: bitmap.height,
      x: Math.round((crop.x / 100) * bitmap.width),
      y: Math.round((crop.y / 100) * bitmap.height),
      size: Math.round((crop.size / 100) * Math.min(bitmap.width, bitmap.height)),
    });
    const canvas = document.createElement("canvas");
    canvas.width = box.size;
    canvas.height = box.size;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(bitmap, box.x, box.y, box.size, box.size, 0, 0, box.size, box.size);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    const ticket = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slot, contentType: "image/jpeg", bytes: blob.size }),
    });
    const payload = await readJson(ticket);
    if (!ticket.ok || !payload.uploadUrl || !payload.key) {
      setMessage(payload.message ?? "Upload is not set up.");
      return;
    }
    const put = await fetch(payload.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/jpeg" },
      body: blob,
    });
    if (!put.ok) {
      setMessage("The image was not stored.");
      return;
    }
    const saved = await fetch("/api/admin/media", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slot, key: payload.key }),
    });
    if (!saved.ok) {
      setMessage("The image was uploaded but not attached.");
      return;
    }
    setPreview(`/media/${slot}?v=${Date.now()}`);
    setMessage("Image saved.");
  }

  return (
    <fieldset>
      <legend>{label}</legend>
      {preview ? <img src={preview} alt="" width={160} height={160} /> : <p>No image.</p>}
      <label>
        File
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            setFile(next);
            if (next) setPreview(URL.createObjectURL(next));
          }}
        />
      </label>
      <label>
        Crop x
        <input type="range" min={0} max={80} value={crop.x} onChange={(event) => setCrop({ ...crop, x: Number(event.target.value) })} />
      </label>
      <label>
        Crop y
        <input type="range" min={0} max={80} value={crop.y} onChange={(event) => setCrop({ ...crop, y: Number(event.target.value) })} />
      </label>
      <label>
        Crop size
        <input type="range" min={20} max={100} value={crop.size} onChange={(event) => setCrop({ ...crop, size: Number(event.target.value) })} />
      </label>
      <button className="btn btn-navy" type="button" onClick={upload} disabled={!file}>
        Upload cropped image
      </button>
      {message ? <p role="status">{message}</p> : null}
    </fieldset>
  );
}

async function readJson(response: Response): Promise<{ message?: string; uploadUrl?: string; key?: string }> {
  try {
    const body = await response.json();
    return body && typeof body === "object" ? (body as { message?: string; uploadUrl?: string; key?: string }) : {};
  } catch {
    return {};
  }
}
