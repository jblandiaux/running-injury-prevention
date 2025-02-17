import { StravaActivity } from './strava';
import { acwrService } from './acwr';

export interface MonthlyAnalysis {
  month: string;
  totalDistance: number;
  totalTime: number;
  totalElevation: number;
  intensityScore: number;
  volumeIncrease: number;
  acwr: number;
  recoveryScore: number;
  riskLevel: 'low' | 'moderate' | 'high';
  riskFactors: string[];
}

export class AnalysisService {
  private calculateTrainingLoad(activity: StravaActivity): number {
    const distanceKm = activity.distance / 1000;
    const elevationGainKm = activity.total_elevation_gain / 1000;
    const intensityFactor = activity.average_speed / 3;

    // Formule de charge qui prend en compte les trois facteurs principaux
    return distanceKm * (1 + elevationGainKm) * intensityFactor;
  }

  private calculateMonthlyACWR(
    currentMonthActivities: StravaActivity[],
    previousMonthActivities: StravaActivity[]
  ): number {
    if (currentMonthActivities.length === 0) return 0;

    // Trier les activités par date
    const sortedCurrentMonth = [...currentMonthActivities].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );

    // Obtenir la dernière date du mois
    const lastActivityDate = new Date(sortedCurrentMonth[0].start_date);
    const lastDayOfMonth = new Date(lastActivityDate.getFullYear(), lastActivityDate.getMonth() + 1, 0);

    // Calculer la charge aiguë (7 derniers jours du mois)
    const sevenDaysBeforeEnd = new Date(lastDayOfMonth);
    sevenDaysBeforeEnd.setDate(sevenDaysBeforeEnd.getDate() - 7);

    const acuteActivities = currentMonthActivities.filter(activity => 
      new Date(activity.start_date) > sevenDaysBeforeEnd &&
      new Date(activity.start_date) <= lastDayOfMonth
    );

    // Calculer la charge chronique (4 semaines précédentes)
    const fourWeeksBeforeAcute = new Date(sevenDaysBeforeEnd);
    fourWeeksBeforeAcute.setDate(fourWeeksBeforeAcute.getDate() - 28);

    const chronicActivities = [...previousMonthActivities, ...currentMonthActivities].filter(activity => {
      const activityDate = new Date(activity.start_date);
      return activityDate > fourWeeksBeforeAcute && activityDate <= sevenDaysBeforeEnd;
    });

    // Calculer les charges moyennes
    const acuteLoad = acuteActivities.reduce((sum, activity) => 
      sum + this.calculateTrainingLoad(activity), 0
    ) / 7;

    const chronicLoad = chronicActivities.reduce((sum, activity) => 
      sum + this.calculateTrainingLoad(activity), 0
    ) / 28;

    // Éviter la division par zéro
    return chronicLoad === 0 ? 0 : acuteLoad / chronicLoad;
  }

  private calculateIntensityScore(activity: StravaActivity): number {
    const speedScore = activity.average_speed / 3;
    const elevationScore = (activity.total_elevation_gain / activity.distance) * 100;
    return (speedScore + elevationScore) / 2;
  }

  private calculateVolumeIncrease(
    currentMonth: StravaActivity[],
    previousMonth: StravaActivity[]
  ): number {
    const currentVolume = currentMonth.reduce((sum, activity) => sum + activity.distance, 0);
    const previousVolume = previousMonth.reduce((sum, activity) => sum + activity.distance, 0);
    
    if (previousVolume === 0) return 0;
    return ((currentVolume - previousVolume) / previousVolume) * 100;
  }

  private calculateRecoveryScore(activities: StravaActivity[]): number {
    if (activities.length < 2) return 100;

    let recoveryScore = 100;
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    for (let i = 1; i < sortedActivities.length; i++) {
      const current = new Date(sortedActivities[i].start_date);
      const previous = new Date(sortedActivities[i-1].start_date);
      const recoveryTime = (current.getTime() - previous.getTime()) / (1000 * 60 * 60);

      // Calculer la charge de l'activité précédente
      const previousLoad = this.calculateTrainingLoad(sortedActivities[i-1]);
      
      // Déterminer le temps de récupération nécessaire en fonction de la charge
      // Une charge plus élevée nécessite plus de temps de récupération
      // Base de 16h pour une activité légère
      // Pour une charge de 100, on aura 16 + (100 * 0.6) = 76h soit environ 3 jours
      // Pour une charge de 50, on aura 16 + (50 * 0.6) = 46h soit environ 2 jours
      // Pour une charge de 10, on aura 16 + (10 * 0.6) = 22h
      const requiredRecoveryTime = Math.min(96, 16 + (previousLoad * 0.6));

      if (recoveryTime < requiredRecoveryTime) {
        // La pénalité est plus importante si la charge était élevée
        // Le facteur de pénalité est plus sensible à la charge
        const penaltyFactor = 1 + (previousLoad / 10);
        recoveryScore -= (requiredRecoveryTime - recoveryTime) * 2 * penaltyFactor;
      }
    }

    return Math.max(0, recoveryScore);
  }

  private getRiskFactors(analysis: Partial<MonthlyAnalysis>): string[] {
    const factors: string[] = [];

    if (analysis.volumeIncrease && analysis.volumeIncrease > 10) {
      factors.push(`Augmentation du volume de ${Math.round(analysis.volumeIncrease)}%`);
    }

    if (analysis.intensityScore && analysis.intensityScore > 7) {
      factors.push('Intensité élevée des entraînements');
    }

    if (analysis.acwr && analysis.acwr > 1.3) {
      factors.push(`ACWR élevé (${analysis.acwr.toFixed(2)})`);
    } else if (analysis.acwr && analysis.acwr < 0.8) {
      factors.push(`ACWR faible (${analysis.acwr.toFixed(2)})`);
    }

    if (analysis.recoveryScore && analysis.recoveryScore < 70) {
      factors.push('Récupération insuffisante entre les séances');
    }

    return factors;
  }

  private calculateRiskLevel(analysis: Partial<MonthlyAnalysis>): 'low' | 'moderate' | 'high' {
    let riskScore = 0;

    if (analysis.volumeIncrease) {
      if (analysis.volumeIncrease > 20) riskScore += 3;
      else if (analysis.volumeIncrease > 10) riskScore += 1;
    }

    if (analysis.intensityScore) {
      if (analysis.intensityScore > 8) riskScore += 3;
      else if (analysis.intensityScore > 6) riskScore += 1;
    }

    if (analysis.acwr) {
      if (analysis.acwr > 1.5 || analysis.acwr < 0.8) riskScore += 3;
      else if (analysis.acwr > 1.3) riskScore += 2;
    }

    if (analysis.recoveryScore) {
      if (analysis.recoveryScore < 50) riskScore += 3;
      else if (analysis.recoveryScore < 70) riskScore += 1;
    }

    if (riskScore >= 6) return 'high';
    if (riskScore >= 3) return 'moderate';
    return 'low';
  }

  async analyzeMonthlyData(
    activities: StravaActivity[],
    startDate: Date,
    endDate: Date
  ): Promise<MonthlyAnalysis[]> {
    const monthlyAnalyses: MonthlyAnalysis[] = [];
    const months: { [key: string]: StravaActivity[] } = {};

    // Grouper les activités par mois
    activities.forEach(activity => {
      const date = new Date(activity.start_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = [];
      }
      months[monthKey].push(activity);
    });

    // Analyser chaque mois
    const monthKeys = Object.keys(months).sort();
    for (let i = 0; i < monthKeys.length; i++) {
      const monthKey = monthKeys[i];
      const currentMonthActivities = months[monthKey];
      const previousMonthActivities = i > 0 ? months[monthKeys[i-1]] : [];

      const analysis: MonthlyAnalysis = {
        month: monthKey,
        totalDistance: currentMonthActivities.reduce((sum, a) => sum + a.distance, 0) / 1000,
        totalTime: currentMonthActivities.reduce((sum, a) => sum + a.moving_time, 0) / 3600,
        totalElevation: currentMonthActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0),
        intensityScore: currentMonthActivities.reduce((sum, a) => sum + this.calculateIntensityScore(a), 0) / currentMonthActivities.length,
        volumeIncrease: this.calculateVolumeIncrease(currentMonthActivities, previousMonthActivities),
        acwr: this.calculateMonthlyACWR(currentMonthActivities, previousMonthActivities),
        recoveryScore: this.calculateRecoveryScore(currentMonthActivities),
        riskLevel: 'low',
        riskFactors: []
      };

      analysis.riskFactors = this.getRiskFactors(analysis);
      analysis.riskLevel = this.calculateRiskLevel(analysis);

      monthlyAnalyses.push(analysis);
    }

    return monthlyAnalyses;
  }
}

export const analysisService = new AnalysisService(); 