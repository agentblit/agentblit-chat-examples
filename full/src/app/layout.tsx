import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Agentblit chat",
  description: "Custom chat UI example against Agentblit v2",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
