import type { PlaceCandidate } from "@/lib/providers/domain";

/**
 * One sitelink is worth this many reviews when judging how well attested a
 * place is.
 *
 * Encyclopaedia articles and customer reviews are not the same evidence. A
 * place somebody wrote an article about, in a language, has been judged
 * notable by an editor; a review only means somebody went there. The weight is
 * deliberately large because the two scales are nothing alike: a home bakery
 * can gather hundreds of reviews, and no home bakery has an article.
 */
const REVIEWS_PER_SITELINK = 250;

/**
 * A provider-neutral measure of how well attested a place is, so filters and
 * pocket rules can compare a Wikidata monument with a Google shopfront without
 * caring which source found it.
 */
export function attestationOf(candidate: PlaceCandidate) {
  return Math.max(
    candidate.reviewCount ?? 0,
    (candidate.sitelinkCount ?? 0) * REVIEWS_PER_SITELINK,
  );
}

/** Whether any source recognises this place at all. */
export function hasAttestation(candidate: PlaceCandidate) {
  return (
    candidate.reviewCount !== undefined || candidate.sitelinkCount !== undefined
  );
}
