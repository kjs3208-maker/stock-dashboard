import { Sentiment } from "./types";

const POSITIVE_KEYWORDS = [
  "상승", "호실적", "상향", "확대", "성장", "돌파", "최고가", "흑자", "호조", "개선",
  "surge", "beat", "upgrade", "growth", "record", "rally", "outperform", "profit",
];

const NEGATIVE_KEYWORDS = [
  "하락", "부진", "하향", "우려", "적자", "감소", "규제", "리스크", "손실", "급락",
  "plunge", "miss", "downgrade", "decline", "risk", "lawsuit", "recall", "loss", "cut",
];

/** Lightweight keyword-based heuristic used when a live news source has no
 * built-in sentiment label. Not a substitute for real NLP - good enough for
 * a quick visual signal on the dashboard. */
export function analyzeSentiment(title: string): Sentiment {
  const lower = title.toLowerCase();
  let score = 0;
  for (const word of POSITIVE_KEYWORDS) {
    if (lower.includes(word.toLowerCase())) score++;
  }
  for (const word of NEGATIVE_KEYWORDS) {
    if (lower.includes(word.toLowerCase())) score--;
  }
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}
