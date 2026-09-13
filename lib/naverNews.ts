/**
 * Official Naver Search API (뉴스 검색) - not scraping. Requires a free
 * client ID/secret from https://developers.naver.com/apps. Returns null
 * when NAVER_CLIENT_ID/NAVER_CLIENT_SECRET aren't configured.
 */

export interface NaverNewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string; // ISO date
}

function stripHtml(text: string): string {
  return text
    .replace(/<\/?b>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");
}

export async function searchNaverNews(query: string, display = 8): Promise<NaverNewsItem[] | null> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const url = new URL("https://openapi.naver.com/v1/search/news.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("sort", "date");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data.items)) return [];

  return data.items.map((item: { title: string; description: string; link: string; pubDate: string }) => ({
    title: stripHtml(item.title),
    description: stripHtml(item.description),
    url: item.link,
    source: "네이버뉴스",
    publishedAt: new Date(item.pubDate).toISOString(),
  }));
}
