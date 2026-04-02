"use client";

import { CardRating, CARD_RATINGS, CARD_RATING_LABELS } from "@/lib/types";

type Props = {
  onRate: (rating: CardRating) => void;
  disabled?: boolean;
};

const RATING_COLORS: Record<CardRating, string> = {
  wrong: "bg-red-600 hover:bg-red-700",
  hard: "bg-orange-500 hover:bg-orange-600",
  good: "bg-blue-600 hover:bg-blue-700",
  easy: "bg-green-600 hover:bg-green-700",
};

export default function CardRatingButtons({ onRate, disabled }: Props) {
  return (
    <div className="flex gap-2 justify-center">
      {CARD_RATINGS.map((rating) => (
        <button
          key={rating}
          onClick={() => onRate(rating)}
          disabled={disabled}
          className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${RATING_COLORS[rating]}`}
        >
          {CARD_RATING_LABELS[rating]}
        </button>
      ))}
    </div>
  );
}
