import NextAuth from "next-auth";
import StravaProvider from "next-auth/providers/strava";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { AuthOptions } from "next-auth";

const prisma = new PrismaClient();

interface StravaProfile {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  profile_medium: string;
  sex: string;
  city: string;
  country: string | null;
  weight: number;
  created_at: string;
  updated_at: string;
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    StravaProvider({
      clientId: process.env.STRAVA_CLIENT_ID as string,
      clientSecret: process.env.STRAVA_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "read,activity:read_all",
          response_type: "code",
          approval_prompt: "force",
        },
      },
      token: {
        url: "https://www.strava.com/oauth/token",
        async request({ client, params, checks, provider }) {
          console.log("Token request params:", { client, params, provider });
          
          const response = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.STRAVA_CLIENT_ID as string,
              client_secret: process.env.STRAVA_CLIENT_SECRET as string,
              code: params.code as string,
              grant_type: "authorization_code",
            }),
          });

          const tokens = await response.json();
          console.log("Token response:", tokens);

          if (!response.ok) {
            throw new Error("Failed to get access token");
          }

          return {
            tokens: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_at: tokens.expires_at,
              token_type: "Bearer",
            }
          };
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      console.log("JWT callback:", { token, account, profile });
      if (account && profile) {
        const stravaProfile = profile as unknown as StravaProfile;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.stravaId = stravaProfile.id;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback:", { session, token });
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.stravaId = token.stravaId as number;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  debug: true,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 