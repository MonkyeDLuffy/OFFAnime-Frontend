import { Suspense } from "react";
import type { Metadata } from "next";
import AnimeHero from "@/components/anime/AnimeHero";
import PopularSection from "@/components/anime/PopularSection";
import TopRatedSection from "@/components/anime/TopRatedSection";
import TopTenSection from "@/components/anime/TopTenSection";
import TrendingSection, {
  TrendingSectionSkeleton,
} from "@/components/anime/TrendingSection";
import { HeroLoadingState } from "@/components/anime/HeroStates";

/**
 * Anime homepage. The hero slider data is fetched server-side (backend
 * credentials never reach the browser) and streams behind a loading state.
 * Feeds are revalidated every 60s, matching the backend's SHORT cache TTL.
 * The Top 10, Popular Anime, Trending Anime and TOP RATED ANIME sections
 * reuse the same memoized `/api/home` feed — no extra upstream call — and
 * stream in behind their own boundaries.
 */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Anime",
  description:
    "Stream trending anime on OffAnime — a cinematic, premium anime experience.",
};

export default function AnimeHomePage() {
  return (
    <main>
      <Suspense fallback={<HeroLoadingState />}>
        <AnimeHero />
      </Suspense>
      <Suspense fallback={null}>
        <TopTenSection />
      </Suspense>
      <Suspense fallback={null}>
        <PopularSection />
      </Suspense>
      <Suspense fallback={<TrendingSectionSkeleton />}>
        <TrendingSection />
      </Suspense>
      <Suspense fallback={null}>
        <TopRatedSection />
      </Suspense>
    </main>
  );
}
