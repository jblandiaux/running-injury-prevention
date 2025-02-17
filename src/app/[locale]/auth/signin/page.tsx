'use client';

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useTranslations, useLocale } from 'next-intl';

export default function SignIn() {
  const t = useTranslations('auth.signin');
  const locale = useLocale();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {t('title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('subtitle')}
          </p>
        </div>
        <div className="mt-8">
          <button
            onClick={() => signIn("strava", { callbackUrl: `/${locale}/dashboard` })}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <Image
                src="/strava-white.svg"
                alt="Strava logo"
                width={24}
                height={24}
                className="h-5 w-5"
              />
            </span>
            {t('button')}
          </button>
        </div>
      </div>
    </div>
  );
} 