import axios from 'axios';

const STRAVA_API_URL = 'https://www.strava.com/api/v3';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  average_speed: number;
  max_speed: number;
  description: string | null;
}

class StravaService {
  private async fetchWithToken(endpoint: string, accessToken: string) {
    try {
      const response = await axios.get(`${STRAVA_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'appel à l\'API Strava:', error);
      throw error;
    }
  }

  private async saveActivities(activities: StravaActivity[]) {
    try {
      await axios.post(`${BASE_URL}/api/activities`, activities, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des activités:', error);
      throw error; // Propager l'erreur pour la gérer dans le composant
    }
  }

  async getAthleteActivities(
    accessToken: string,
    options: { 
      after?: number; 
      before?: number;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<StravaActivity[]> {
    const { after, before, page = 1, per_page = 30 } = options;
    const params = new URLSearchParams();
    
    if (after) params.append('after', after.toString());
    if (before) params.append('before', before.toString());
    params.append('page', page.toString());
    params.append('per_page', per_page.toString());

    const activities = await this.fetchWithToken(`/athlete/activities?${params.toString()}`, accessToken);
    
    // Sauvegarder les activités dans la base de données via l'API
    await this.saveActivities(activities);

    return activities;
  }

  async getAllActivitiesByDateRange(
    accessToken: string,
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<StravaActivity[]> {
    const after = Math.floor(startDate.getTime() / 1000);
    const before = Math.floor(endDate.getTime() / 1000);
    let page = 1;
    let allActivities: StravaActivity[] = [];
    
    while (true) {
      const activities = await this.getAthleteActivities(accessToken, {
        after,
        before,
        page,
        per_page: 100
      });
      
      if (activities.length === 0) break;
      
      allActivities = [...allActivities, ...activities];
      page++;
      
      // Respecter la limite de taux de l'API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allActivities;
  }

  async getActivityById(activityId: number, accessToken: string): Promise<StravaActivity> {
    return this.fetchWithToken(`/activities/${activityId}`, accessToken);
  }
}

export const stravaService = new StravaService(); 