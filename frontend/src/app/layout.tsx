import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "CRUD",
  description: "Excercise for CRUD application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-3xl mx-auto p-4">
        <Navbar></Navbar>
        <div className="mt-8">
        {children}
        </div>
        </div>
      </body>
    </html>
  );
}