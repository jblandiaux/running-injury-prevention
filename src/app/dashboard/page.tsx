'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { StravaActivity } from '@/services/strava';
import { ActivityLoad, acwrService } from '@/services/acwr';
import { stravaService } from '@/services/strava';
import { MonthlyAnalysis, analysisService } from '@/services/analysisService';

function getTrainingAdvice(acwr: number, riskFactors: string[]): {
  title: string;
  advice: string[];
  color: string;
} {
  if (acwr === 0) {
    return {
      title: "Démarrage de l'entraînement",
      advice: [
        "Commencez progressivement avec 2-3 séances par semaine",
        "Privilégiez des séances à faible intensité pour construire votre base aérobie",
        "Augmentez graduellement le volume d'entraînement (+10% par semaine maximum)",
      ],
      color: "text-blue-600"
    };
  }

  if (acwr < 0.8) {
    return {
      title: "Charge d'entraînement insuffisante",
      advice: [
        "Augmentez progressivement votre volume d'entraînement",
        "Maintenez une régularité dans vos séances",
        "Visez 3-4 séances par semaine pour maintenir une charge chronique stable",
        "Évitez les augmentations brutales de charge malgré le sous-entraînement",
      ],
      color: "text-orange-600"
    };
  }

  if (acwr > 1.5) {
    return {
      title: "Charge d'entraînement excessive",
      advice: [
        "Réduisez immédiatement votre charge d'entraînement",
        "Privilégiez des séances de récupération active",
        "Accordez-vous 2-3 jours de repos",
        "Revenez progressivement à une charge normale sur 1-2 semaines",
      ],
      color: "text-red-600"
    };
  }

  if (acwr > 1.3) {
    return {
      title: "Charge d'entraînement élevée",
      advice: [
        "Surveillez votre fatigue et vos sensations",
        "Réduisez légèrement l'intensité des prochaines séances",
        "Maintenez une bonne récupération entre les séances",
        "Évitez d'augmenter davantage la charge cette semaine",
      ],
      color: "text-yellow-600"
    };
  }

  return {
    title: "Charge d'entraînement optimale",
    advice: [
      "Continuez à maintenir cette régularité dans l'entraînement",
      "Vous pouvez envisager d'augmenter progressivement la charge (+5-10%)",
      "Alternez les séances intenses avec des séances plus légères",
      "Maintenez un bon équilibre entre entraînement et récupération",
    ],
    color: "text-green-600"
  };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [acwrData, setAcwrData] = useState<ActivityLoad[]>([]);
  const [monthlyAnalyses, setMonthlyAnalyses] = useState<MonthlyAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (session?.user) {
        try {
          const token = (session as any).accessToken;
          
          // Récupérer les activités de l'année dernière
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          const activities = await stravaService.getAllActivitiesByDateRange(
            token,
            oneYearAgo
          );
          setActivities(activities);
          
          const acwrData = acwrService.calculateACWR(activities);
          setAcwrData(acwrData);

          const monthlyAnalyses = await analysisService.analyzeMonthlyData(
            activities,
            oneYearAgo,
            new Date()
          );
          setMonthlyAnalyses(monthlyAnalyses);
        } catch (error) {
          console.error('Erreur lors de la récupération des données:', error);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchData();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const latestAcwr = acwrData[acwrData.length - 1];
  const advice = getTrainingAdvice(
    latestAcwr?.acwr || 0,
    latestAcwr?.riskFactors || []
  );

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Tableau de Bord
        </h1>

        {/* Carte ACWR avec conseils */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Ratio de Charge Aiguë:Chronique (ACWR)
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-4xl font-bold">
                  {latestAcwr?.acwr.toFixed(2) || "0.00"}
                </div>
                <div className={`px-4 py-2 rounded-full text-white ${
                  latestAcwr?.riskLevel === 'high' 
                    ? 'bg-red-500' 
                    : latestAcwr?.riskLevel === 'moderate'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}>
                  Risque {
                    latestAcwr?.riskLevel === 'high' 
                      ? 'Élevé' 
                      : latestAcwr?.riskLevel === 'moderate'
                      ? 'Modéré'
                      : 'Faible'
                  }
                </div>
              </div>
              {latestAcwr?.riskFactors.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700 mb-2">Facteurs de risque :</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {latestAcwr.riskFactors.map((factor, index) => (
                      <li key={index}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="border-l pl-6">
              <h3 className={`font-semibold ${advice.color} mb-2`}>
                {advice.title}
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                {advice.advice.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Analyse Mensuelle */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Analyse Mensuelle des Risques
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {monthlyAnalyses.map((analysis) => (
              <div 
                key={analysis.month} 
                className={`p-4 rounded-lg border ${
                  analysis.riskLevel === 'high' 
                    ? 'border-red-200 bg-red-50' 
                    : analysis.riskLevel === 'moderate'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-green-200 bg-green-50'
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {new Date(analysis.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="space-y-2 text-sm">
                  <p>Distance totale: {Math.round(analysis.totalDistance)} km</p>
                  <p>Temps total: {Math.round(analysis.totalTime)}h</p>
                  <p>Dénivelé total: {Math.round(analysis.totalElevation)}m</p>
                  <p>Score de récupération: {Math.round(analysis.recoveryScore)}%</p>
                  <p>ACWR: {analysis.acwr.toFixed(2)}</p>
                  {analysis.riskFactors.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium">Facteurs de risque :</p>
                      <ul className="list-disc list-inside">
                        {analysis.riskFactors.map((factor, index) => (
                          <li key={index} className="text-gray-700">{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liste des activités récentes */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Activités Récentes
          </h2>
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="border-b border-gray-200 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{activity.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.start_date).toLocaleDateString('fr-FR')} • 
                      {(activity.distance / 1000).toFixed(2)} km • 
                      {Math.floor(activity.moving_time / 60)} min
                    </p>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {activity.total_elevation_gain}m D+
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 