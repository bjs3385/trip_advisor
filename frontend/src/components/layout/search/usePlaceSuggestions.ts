"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { JAPAN_BOUNDS } from "./searchConfig";
import type {
  AutocompleteSuggestionLike,
  PlacePredictionLike,
  SearchSuggestion,
} from "./searchTypes";

type FetchAutocompleteRequest = {
  input: string;
  sessionToken: object | null;
  locationBias: typeof JAPAN_BOUNDS;
  includedRegionCodes: string[];
  language: string;
};

type FetchAutocompleteResponse = {
  suggestions?: AutocompleteSuggestionLike[];
};

type AutocompleteSuggestionConstructor = {
  fetchAutocompleteSuggestions?: (
    request: FetchAutocompleteRequest
  ) => Promise<FetchAutocompleteResponse>;
};

type AutocompleteSessionTokenConstructor = new () => object;

interface UsePlaceSuggestionsParams {
  isLoaded: boolean;
  query: string;
}

function mapSuggestion(prediction: PlacePredictionLike): SearchSuggestion {
  return {
    placeId: prediction.placeId,
    primary: prediction.mainText?.text ?? prediction.text?.text ?? "",
    secondary: prediction.secondaryText?.text ?? "",
    prediction,
  };
}

function getSearchIntent(query: string) {
  if (/(역|駅|station)\s*$/i.test(query)) return "station";
  if (/(공항|空港|airport)\s*$/i.test(query)) return "airport";
  return undefined;
}

function scoreSuggestion(suggestion: SearchSuggestion, intent: ReturnType<typeof getSearchIntent>) {
  if (!intent) return 0;

  const types = suggestion.prediction.types ?? [];
  const label = `${suggestion.primary} ${suggestion.secondary}`.toLowerCase();
  if (intent === "station") {
    if (types.some((type) => ["train_station", "subway_station", "bus_station", "transit_station"].includes(type))) {
      return 20;
    }
    if (/(역|駅|station)/i.test(label)) return 10;
    if (types.some((type) => ["locality", "administrative_area_level_1", "political", "geocode"].includes(type))) {
      return -10;
    }
  }
  if (intent === "airport") {
    if (types.includes("airport")) return 20;
    if (/(공항|空港|airport)/i.test(label)) return 10;
    if (types.some((type) => ["locality", "administrative_area_level_1", "political", "geocode"].includes(type))) {
      return -10;
    }
  }
  return 0;
}

function dedupeSuggestions(suggestions: SearchSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.placeId)) return false;
    seen.add(suggestion.placeId);
    return true;
  });
}

function prioritizeSuggestions(suggestions: SearchSuggestion[], intent: ReturnType<typeof getSearchIntent>) {
  return dedupeSuggestions(suggestions)
    .map((suggestion, index) => ({ suggestion, index }))
    .sort((a, b) => {
      const scoreDiff = scoreSuggestion(b.suggestion, intent) - scoreSuggestion(a.suggestion, intent);
      return scoreDiff || a.index - b.index;
    })
    .map(({ suggestion }) => suggestion);
}

async function fetchLegacySuggestions(
  input: string,
  sessionToken: object | null,
): Promise<SearchSuggestion[]> {
  const ServiceCtor = google.maps.places.AutocompleteService;
  if (!ServiceCtor) return [];

  const service = new ServiceCtor();
  const { predictions } = await service.getPlacePredictions({
    input,
    locationBias: JAPAN_BOUNDS,
    componentRestrictions: { country: "jp" },
    language: "ko",
    sessionToken: sessionToken as google.maps.places.AutocompleteSessionToken | undefined,
  });

  return predictions.map((prediction) => ({
    placeId: prediction.place_id,
    primary: prediction.structured_formatting?.main_text ?? prediction.description,
    secondary: prediction.structured_formatting?.secondary_text ?? "",
    prediction: {
      placeId: prediction.place_id,
      mainText: { text: prediction.structured_formatting?.main_text ?? prediction.description },
      secondaryText: { text: prediction.structured_formatting?.secondary_text ?? "" },
      text: { text: prediction.description },
      types: prediction.types,
      toPlace: () => new google.maps.places.Place({ id: prediction.place_id }),
    },
  }));
}

export function usePlaceSuggestions({ isLoaded, query }: UsePlaceSuggestionsParams) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const sessionTokenRef = useRef<object | null>(null);
  const debounceRef = useRef<number | null>(null);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setLoading(false);
  }, []);

  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  const ensureSessionToken = useCallback(() => {
    if (!isLoaded) return null;
    if (!sessionTokenRef.current) {
      const TokenCtor = google.maps.places.AutocompleteSessionToken as
        | AutocompleteSessionTokenConstructor
        | undefined;
      sessionTokenRef.current = TokenCtor ? new TokenCtor() : null;
    }
    return sessionTokenRef.current;
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    const trimmed = query.trim();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!trimmed) {
      resetSessionToken();
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      const SuggestionCtor = google.maps.places.AutocompleteSuggestion as
        | AutocompleteSuggestionConstructor
        | undefined;

      setLoading(true);
      const sessionToken = ensureSessionToken();
      const baseRequest: FetchAutocompleteRequest = {
        input: trimmed,
        sessionToken,
        locationBias: JAPAN_BOUNDS,
        includedRegionCodes: ["jp"],
        language: "ko",
      };
      const intent = getSearchIntent(trimmed);

      const runLegacyFallback = async () => {
        const legacy = await fetchLegacySuggestions(trimmed, sessionToken);
        setSuggestions(prioritizeSuggestions(legacy, intent));
      };

      if (!SuggestionCtor?.fetchAutocompleteSuggestions) {
        runLegacyFallback()
          .catch(() => setSuggestions([]))
          .finally(() => setLoading(false));
        return;
      }

      SuggestionCtor.fetchAutocompleteSuggestions(baseRequest)
        .then(async ({ suggestions: result }) => {
          const mapped = (result ?? [])
              .map((item) => item.placePrediction)
              .filter((prediction): prediction is PlacePredictionLike => Boolean(prediction))
              .map(mapSuggestion);
          const prioritized = prioritizeSuggestions(mapped, intent);
          if (prioritized.length === 0) {
            await runLegacyFallback();
            return;
          }
          setSuggestions(prioritized);
        })
        .catch(() => {
          runLegacyFallback().catch(() => setSuggestions([]));
        })
        .finally(() => {
          setLoading(false);
        });
    }, 220);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [clearSuggestions, ensureSessionToken, isLoaded, query, resetSessionToken]);

  return {
    loading,
    suggestions,
    clearSuggestions,
    resetSessionToken,
  };
}
