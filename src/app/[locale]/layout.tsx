'use client';

import { NextIntlClientProvider, useLocale } from 'next-intl';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import '../globals.css';

// Import des messages de traduction
import fr from '@/messages/fr.json';
import en from '@/messages/en.json';

const inter = Inter({ subsets: ['latin'] });

const messages = {
  fr,
  en
};

export default function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = useLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <NextIntlClientProvider messages={messages[locale as keyof typeof messages]} locale={locale}>
            {children}
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
} 