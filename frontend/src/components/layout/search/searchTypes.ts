export type PlacePredictionLike = {
  placeId: string;
  mainText?: { text?: string };
  secondaryText?: { text?: string };
  text?: { text?: string };
  types?: string[];
  toPlace: () => google.maps.places.Place;
};

export type AutocompleteSuggestionLike = {
  placePrediction?: PlacePredictionLike;
};

export type SearchSuggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  prediction: PlacePredictionLike;
};
