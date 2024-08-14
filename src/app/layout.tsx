import "~/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { Toaster } from "~/components/ui/toaster"

export const metadata: Metadata = {
  title: "GeoPulse",
  description: "Analyze and compare geopolitical relations between countries using the latest data.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
