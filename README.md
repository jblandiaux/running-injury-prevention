# Running Injury Prevention

A running injury prevention application based on ACWR (Acute Chronic Workload Ratio).

## Features

- Strava Integration
- Automatic ACWR Calculation
- Training Load Analysis
- Injury Risk Assessment
- Personalized Recommendations
- Data Visualization Dashboard

## Tech Stack

- Next.js 14
- TypeScript
- Prisma (PostgreSQL)
- Strava API
- NextAuth.js
- Tailwind CSS

## Installation

1. Clone the repository:
```bash
git clone https://github.com/jblandiaux/running-injury-prevention.git
cd running-injury-prevention
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5430/running_prevention"
STRAVA_CLIENT_ID="your_client_id"
STRAVA_CLIENT_SECRET="your_client_secret"
STRAVA_REDIRECT_URI="http://localhost:3000/api/auth/callback/strava"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_secret"
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

5. Start the development server:
```bash
npm run dev
```

## Usage

1. Sign in with your Strava account
2. Your activities will be automatically synchronized
3. Check your dashboard to see:
   - Your current ACWR
   - Risk level assessment
   - Personalized recommendations
   - Monthly activity analysis

## ACWR Calculation

The ACWR is calculated using:
- Acute load: average of the last 7 days
- Chronic load: average of the last 28 days
- Factors considered: distance, elevation gain, intensity

## How it works

The application uses a sophisticated algorithm to:
1. Calculate training load based on distance, elevation, and intensity
2. Analyze acute vs chronic workload ratios
3. Assess injury risk based on multiple factors
4. Generate personalized training recommendations
5. Monitor recovery between sessions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
