import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MRC ERP',
  description: 'Work order ERP development build',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

