import type { ConnectorDefinition } from "@/lib/connector-sdk";

export function BrandIcon({
  connector,
  size = "md"
}: {
  connector: Pick<ConnectorDefinition, "brandColor" | "appIcon">;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={`brand-icon ${size === "lg" ? "brand-icon-lg" : ""}`}
      style={{ background: connector.brandColor }}
      aria-hidden="true"
    >
      {connector.appIcon}
    </span>
  );
}
