import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowConnect AI",
  description: "Workflow automation with connectors, AI actions, hosted forms, and templates.",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
