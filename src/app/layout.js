import './globals.css';

export const metadata = {
  title: 'Zidio - Next.js + PostgreSQL App',
  description: 'Production-ready Next.js application configured with Tailwind CSS, PostgreSQL via Prisma, and Vercel deployment.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#090d16] text-gray-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
