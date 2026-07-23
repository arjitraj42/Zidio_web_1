import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: 'Project LOOP — Customer Feedback Intelligence Platform',
  description: 'Multi-tenant AI customer-feedback intelligence platform built with Next.js and PostgreSQL.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#090d16] text-gray-100 flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
