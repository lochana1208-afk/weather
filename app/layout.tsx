import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SouthSky • Weather for India",
  description: "Local forecasts, heat, UV and air quality for cities across India.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-IN"><body>{children}</body></html>;
}
