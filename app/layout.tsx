import type { Metadata } from "next";
import "./globals.css";
import { PageTransitionProvider } from "@/app/components/PageTransitionProvider";

export const metadata: Metadata = {
  title: "Schoolwork Tracker",
  description: "Organize your assignments and track due dates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" style={{ colorScheme: "light" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:wght@400;500;600;700&family=Caveat:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <div style={{ perspective: "1200px", perspectiveOrigin: "center center" }}>
          <PageTransitionProvider>
            {children}
          </PageTransitionProvider>
        </div>
      </body>
    </html>
  );
}
