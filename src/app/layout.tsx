import type { Metadata } from 'next';
import '../styles/globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: '홍보대사 시간관리 시스템',
  description: 'PR Ambassador Time Tracking System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
