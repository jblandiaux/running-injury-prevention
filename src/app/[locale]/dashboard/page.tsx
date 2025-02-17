'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { StravaActivity } from '@/services/strava';
import { ActivityLoad, acwrService } from '@/services/acwr';
import { stravaService } from '@/services/strava';
import { MonthlyAnalysis, analysisService } from '@/services/analysisService';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

function getTrainingAdvice(acwr: number, riskFactors: string[], t: any): {
  title: string;
  advice: string[];
  color: string;
} {
  const getTips = (category: string) => {
    return [
      t(`acwr.advice.${category}.tip1`),
      t(`acwr.advice.${category}.tip2`),
      t(`acwr.advice.${category}.tip3`),
      t(`acwr.advice.${category}.tip4`)
    ].filter(Boolean);
  };

  if (acwr === 0) {
    return {
      title: t('acwr.advice.start.title'),
      advice: getTips('start'),
      color: "text-blue-600"
    };
  }

  if (acwr < 0.8) {
    return {
      title: t('acwr.advice.insufficient.title'),
      advice: getTips('insufficient'),
      color: "text-orange-600"
    };
  }

  if (acwr > 1.5) {
    return {
      title: t('acwr.advice.excessive.title'),
      advice: getTips('excessive'),
      color: "text-red-600"
    };
  }

  if (acwr > 1.3) {
    return {
      title: t('acwr.advice.high.title'),
      advice: getTips('high'),
      color: "text-yellow-600"
    };
  }

  return {
    title: t('acwr.advice.optimal.title'),
    advice: getTips('optimal'),
    color: "text-green-600"
  };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [acwrData, setAcwrData] = useState<ActivityLoad[]>([]);
  const [monthlyAnalyses, setMonthlyAnalyses] = useState<MonthlyAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const dateLocale = locale === 'fr' ? fr : enUS;

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des activités');
      }
      const data = await response.json();
      
      // Transformer les données pour correspondre au format StravaActivity
      const formattedActivities = data.map((activity: any) => ({
        id: parseInt(activity.stravaId),
        name: activity.name,
        distance: activity.distance,
        moving_time: activity.duration,
        elapsed_time: activity.duration,
        total_elevation_gain: activity.elevationGain,
        type: activity.type,
        start_date: activity.startDate,
        average_speed: activity.averageSpeed,
        max_speed: activity.maxSpeed,
        description: activity.description
      }));

      setActivities(formattedActivities);
      
      const acwrData = acwrService.calculateACWR(formattedActivities);
      setAcwrData(acwrData);

      const monthlyAnalyses = await analysisService.analyzeMonthlyData(
        formattedActivities,
        new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        new Date()
      );
      setMonthlyAnalyses(monthlyAnalyses);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    }
  };

  const syncWithStrava = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/activities', {
        method: 'PUT'
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la synchronisation avec Strava');
      }

      await fetchActivities();
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchActivities().finally(() => setLoading(false));
    }
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
    latestAcwr?.riskFactors || [],
    t
  );

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('title')}
          </h1>
          <button
            onClick={syncWithStrava}
            disabled={syncing}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
              syncing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {syncing ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                {t('syncing')}
              </>
            ) : (
              t('syncWithStrava')
            )}
          </button>
        </div>

        {/* Carte ACWR avec conseils */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('acwr.title')}
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
                  {t(`acwr.riskLevel.${latestAcwr?.riskLevel || 'low'}`)}
                </div>
              </div>
              {latestAcwr?.riskFactors.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700 mb-2">{t('acwr.riskFactors')}:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {latestAcwr.riskFactors.map((factor, index) => (
                      <li key={index}>{t(factor)}</li>
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
            {t('monthlyAnalysis.title')}
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
                  {format(new Date(analysis.month + '-01'), 'MMMM yyyy', { locale: dateLocale })}
                </h3>
                <div className="space-y-2 text-sm">
                  <p>{t('monthlyAnalysis.metrics.totalDistance')}: {Math.round(analysis.totalDistance)} {t('recentActivities.metrics.distance')}</p>
                  <p>{t('monthlyAnalysis.metrics.totalTime')}: {Math.round(analysis.totalTime)}h</p>
                  <p>{t('monthlyAnalysis.metrics.totalElevation')}: {Math.round(analysis.totalElevation)}{t('recentActivities.metrics.elevation')}</p>
                  <p>{t('monthlyAnalysis.metrics.recoveryScore')}: {Math.round(analysis.recoveryScore)}%</p>
                  <p>{t('monthlyAnalysis.metrics.acwr')}: {analysis.acwr.toFixed(2)}</p>
                  {analysis.riskFactors.length > 0 && (
                    <div className="mt-4">
                      <p className="font-medium">{t('monthlyAnalysis.metrics.riskFactors')}:</p>
                      <ul className="list-disc list-inside">
                        {analysis.riskFactors.map((factor, index) => (
                          <li key={index} className="text-gray-700">{t(factor)}</li>
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
            {t('recentActivities.title')}
          </h2>
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="border-b border-gray-200 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{activity.name}</h3>
                    <p className="text-sm text-gray-500">
                      {format(new Date(activity.start_date), 'PP', { locale: dateLocale })} • 
                      {(activity.distance / 1000).toFixed(2)} {t('recentActivities.metrics.distance')} • 
                      {Math.floor(activity.moving_time / 60)} {t('recentActivities.metrics.time')}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {activity.total_elevation_gain}{t('recentActivities.metrics.elevation')}
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