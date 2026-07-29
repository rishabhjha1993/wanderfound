import type {
  AdventureDuration,
  AdventureMood,
} from "@/lib/adventure/setup-session";
import type { PlaceCategory } from "@/lib/providers/domain";

const DURATION_POLICY: Record<
  AdventureDuration,
  { radiusMeters: number; candidateLimit: number; shortlistLimit: number }
> = {
  30: {
    radiusMeters: 800,
    candidateLimit: 20,
    shortlistLimit: 4,
  },
  60: {
    radiusMeters: 1_500,
    candidateLimit: 20,
    shortlistLimit: 6,
  },
};

const MOOD_CATEGORIES: Record<AdventureMood, PlaceCategory[]> = {
  historical: ["heritage", "architecture", "museum", "civic", "religious"],
  culinary: ["culinary", "market", "heritage", "waterfront", "public_art"],
  strange: ["public_art", "heritage", "architecture", "civic", "viewpoint"],
  beautiful: [
    "garden",
    "viewpoint",
    "waterfront",
    "architecture",
    "public_art",
  ],
};

export function getDiscoveryPolicy(
  durationMinutes: AdventureDuration,
  mood: AdventureMood,
) {
  return {
    ...DURATION_POLICY[durationMinutes],
    categories: [...MOOD_CATEGORIES[mood]],
  };
}
