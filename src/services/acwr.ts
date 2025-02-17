import { StravaActivity } from './strava';

export interface ActivityLoad {
  date: Date;
  load: number;
  acwr: number;
  riskLevel: 'low' | 'moderate' | 'high';
  riskFactors: string[];
}

class ACWRService {
  private calculateLoad(activity: StravaActivity): number {
    // Calcul amélioré de la charge basé sur :
    // - Distance
    // - Dénivelé
    // - Intensité (vitesse moyenne)
    // - Durée
    const distanceKm = activity.distance / 1000;
    const elevationGainKm = activity.total_elevation_gain / 1000;
    const intensityFactor = activity.average_speed / 3;
    const durationHours = activity.moving_time / 3600;

    // Formule pondérée donnant plus d'importance à la durée et l'intensité
    return (distanceKm * (1 + elevationGainKm) * intensityFactor * Math.sqrt(durationHours));
  }

  private calculateAverageLoad(activities: StravaActivity[], days: number): number {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const filteredActivities = activities.filter(activity => 
      new Date(activity.start_date) >= startDate
    );

    if (filteredActivities.length === 0) return 0;

    const totalLoad = filteredActivities.reduce((sum, activity) => 
      sum + this.calculateLoad(activity), 0
    );

    return totalLoad / days;
  }

  private analyzeRiskFactors(
    acwr: number,
    acuteLoad: number,
    chronicLoad: number,
    recentActivities: StravaActivity[]
  ): string[] {
    const riskFactors: string[] = [];

    // 1. Analyse du ratio ACWR
    if (acwr > 1.5) {
      riskFactors.push("Augmentation très importante de la charge (ACWR > 1.5)");
    } else if (acwr > 1.3) {
      riskFactors.push("Augmentation significative de la charge (ACWR > 1.3)");
    } else if (acwr < 0.8) {
      riskFactors.push("Charge d'entraînement insuffisante (ACWR < 0.8)");
    }

    // 2. Analyse de la charge chronique
    if (chronicLoad === 0) {
      riskFactors.push("Absence d'entraînement régulier (charge chronique nulle)");
    }

    // 3. Analyse de la régularité
    const hasRegularTraining = recentActivities.length >= 3;
    if (!hasRegularTraining) {
      riskFactors.push("Manque de régularité dans l'entraînement");
    }

    // 4. Analyse des variations brutales
    if (acuteLoad > chronicLoad * 1.3) {
      riskFactors.push("Pic soudain de charge d'entraînement");
    }

    return riskFactors;
  }

  calculateACWR(activities: StravaActivity[]): ActivityLoad[] {
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    return sortedActivities.map(activity => {
      const activityDate = new Date(activity.start_date);
      const previousActivities = sortedActivities.filter(a => 
        new Date(a.start_date) <= activityDate
      );

      // Calcul des charges aiguë (7 jours) et chronique (28 jours)
      const acuteLoad = this.calculateAverageLoad(previousActivities, 7);
      const chronicLoad = this.calculateAverageLoad(previousActivities, 28);

      // Calcul de l'ACWR
      const acwr = chronicLoad === 0 ? 0 : acuteLoad / chronicLoad;

      // Analyse des facteurs de risque
      const last7DaysActivities = previousActivities.filter(a => 
        new Date(a.start_date) >= new Date(activityDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      );

      const riskFactors = this.analyzeRiskFactors(
        acwr,
        acuteLoad,
        chronicLoad,
        last7DaysActivities
      );

      // Détermination du niveau de risque
      let riskLevel: 'low' | 'moderate' | 'high' = 'low';
      if (acwr > 1.5 || acwr < 0.8 || riskFactors.length >= 3) {
        riskLevel = 'high';
      } else if (acwr > 1.3 || riskFactors.length >= 2) {
        riskLevel = 'moderate';
      }

      return {
        date: activityDate,
        load: this.calculateLoad(activity),
        acwr,
        riskLevel,
        riskFactors
      };
    });
  }

  getRiskLevel(acwr: number): 'low' | 'moderate' | 'high' {
    if (acwr > 1.5 || acwr < 0.8) return 'high';
    if (acwr > 1.3) return 'moderate';
    return 'low';
  }
}

export const acwrService = new ACWRService(); 