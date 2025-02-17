'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Erreur d'authentification
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error === 'OAuthCallback'
              ? "Une erreur s'est produite lors de la connexion avec Strava. Veuillez réessayer."
              : "Une erreur inattendue s'est produite."}
          </p>
        </div>
        <div className="mt-8">
          <Link
            href="/auth/signin"
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Retour à la page de connexion
          </Link>
        </div>
      </div>
    </div>
  );
} 