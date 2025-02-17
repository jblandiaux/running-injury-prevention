import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { StravaActivity } from '@/services/strava';

function calculateTrainingLoad(activity: StravaActivity): number {
  const distanceKm = activity.distance / 1000;
  const elevationGainKm = activity.total_elevation_gain / 1000;
  const intensityFactor = activity.average_speed / 3;
  return distanceKm * (1 + elevationGainKm) * intensityFactor;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const activities = await prisma.activity.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Erreur lors de la récupération des activités:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const activities = await request.json();
    const userId = session.user.id;

    if (!Array.isArray(activities)) {
      return NextResponse.json({ error: 'Format de données invalide' }, { status: 400 });
    }

    // Trier les activités par date
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    const results = await Promise.all(sortedActivities.map(async (activity: StravaActivity) => {
      const load = calculateTrainingLoad(activity);

      return prisma.activity.upsert({
        where: {
          stravaId: activity.id.toString()
        },
        update: {
          name: activity.name,
          type: activity.type,
          distance: activity.distance,
          duration: activity.moving_time,
          startDate: new Date(activity.start_date),
          endDate: new Date(new Date(activity.start_date).getTime() + activity.elapsed_time * 1000),
          averageSpeed: activity.average_speed,
          maxSpeed: activity.max_speed,
          elevationGain: activity.total_elevation_gain,
          description: activity.description,
          load
        },
        create: {
          userId,
          stravaId: activity.id.toString(),
          name: activity.name,
          type: activity.type,
          distance: activity.distance,
          duration: activity.moving_time,
          startDate: new Date(activity.start_date),
          endDate: new Date(new Date(activity.start_date).getTime() + activity.elapsed_time * 1000),
          averageSpeed: activity.average_speed,
          maxSpeed: activity.max_speed,
          elevationGain: activity.total_elevation_gain,
          description: activity.description,
          load
        }
      });
    }));

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des activités:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 