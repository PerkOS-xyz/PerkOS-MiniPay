"use client";

import { createContext, useContext } from "react";

/**
 * Lets the header logo (rendered deep in Home / the landing) send the user to
 * the marketing landing and back, without prop-drilling. `page.tsx` owns the
 * `forceLanding` state and provides these; the landing is a conditional view
 * (not a route), so this is how "click the logo → go to the landing" works from
 * any state — signed-in, inside MiniPay, or already signed-out.
 */
export type LandingNav = {
  goToLanding: () => void;
  goToApp: () => void;
};

export const LandingNavContext = createContext<LandingNav | null>(null);

export function useLandingNav(): LandingNav {
  return (
    useContext(LandingNavContext) ?? {
      goToLanding: () => {},
      goToApp: () => {},
    }
  );
}
