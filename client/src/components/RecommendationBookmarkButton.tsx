import React from "react";
import { Bookmark } from "lucide-react";

type RecommendationBookmarkButtonProps = {
  wishlisted: boolean;
  isPending?: boolean;
  onToggle: () => void;
};

export default function RecommendationBookmarkButton({
  wishlisted,
  isPending = false,
  onToggle,
}: RecommendationBookmarkButtonProps) {
  return (
    <button
      type="button"
      className={`recommendation-card__bookmark ${wishlisted ? "is-saved" : ""}`}
      onClick={onToggle}
      disabled={isPending}
      aria-pressed={wishlisted}
    >
      <Bookmark size={14} fill={wishlisted ? "currentColor" : "none"} />
      {wishlisted ? "保存済み" : "後で見る"}
    </button>
  );
}
