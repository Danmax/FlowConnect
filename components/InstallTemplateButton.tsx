"use client";

import { useState } from "react";

export function InstallTemplateButton({ templateId }: { templateId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const install = async () => {
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/templates/${templateId}/install`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };

    setLoading(false);
    setMessage(response.ok ? payload.message ?? "Template installed." : payload.error ?? "Template install failed.");
  };

  return (
    <div className="install-template">
      <button className="button primary" disabled={loading} onClick={install} type="button">
        {loading ? "Installing..." : "Install template"}
      </button>
      {message ? <p className={message.includes("installed") ? "form-success" : "form-error"}>{message}</p> : null}
    </div>
  );
}
