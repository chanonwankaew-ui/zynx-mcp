import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

export const metadata: Metadata = {
  title: "Shortcut Agent Studio — Build it by Chanont Wankaew",
  description:
    "Generate Apple Shortcuts, PWA blueprints and iOS app blueprints from a natural-language goal. Local-first, browser-only MVP.",
}

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} bg-[#0b1020]`}>
      <body className="font-sans antialiased">
        <div className="circuit-bg fixed inset-0 -z-10 opacity-40" aria-hidden="true" />
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
