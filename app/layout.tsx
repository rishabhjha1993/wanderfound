import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const title = "Wanderfound — Your next few hours, well wandered";
const description =
  "Find your next worthwhile outing in Goa. Tell us your mood, time and starting area; get real places and practical details.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://wanderfound.vercel.app",
  ),
  title,
  description,
  applicationName: "Wanderfound",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Wanderfound",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Wanderfound — The world is hiding in plain sight.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2eddf",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
