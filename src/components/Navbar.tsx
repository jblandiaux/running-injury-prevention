'use client';

import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import LanguageSelector from './LanguageSelector';

export default function Navbar() {
  const { data: session } = useSession();
  const t = useTranslations();

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-orange-600">
                {t('nav.title')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {session?.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {t('nav.signout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 