import type { Metadata } from 'next';
import { Providers } from './providers';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'DOTS - Distributed Olympiad Testing System',
  description: 'Online competitive programming judge and contest platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-gray-50 min-h-screen flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
