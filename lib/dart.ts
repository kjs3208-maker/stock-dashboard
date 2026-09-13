import { inflateRawSync } from "zlib";

/**
 * Minimal client for the DART (전자공시시스템) OpenAPI - Korea's official
 * corporate disclosure system. Requires a free API key from
 * https://opendart.fss.or.kr. Every call is a no-op (returns null) when
 * DART_API_KEY isn't set, matching this app's graceful-degradation style.
 */

export interface DartDisclosure {
  title: string;
  reportedAt: string; // YYYY-MM-DD
  url: string;
  submitter: string;
}

interface CorpCodeEntry {
  corpCode: string;
  corpName: string;
}

let corpCodeMapPromise: Promise<Map<string, CorpCodeEntry>> | null = null;

/** Extracts the single file stored in a DART corpCode.xml.zip response
 * without a zip-library dependency: DART always returns one small
 * deflate-compressed entry, so a hand-rolled central-directory read is
 * enough (and avoids pulling in a full zip package for one use). */
function extractSingleZipEntry(buffer: Buffer): Buffer {
  const eocdSig = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === eocdSig) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("zip: end of central directory not found");

  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);
  const centralDirSig = buffer.readUInt32LE(centralDirOffset);
  if (centralDirSig !== 0x02014b50) throw new Error("zip: central directory signature mismatch");

  const compressionMethod = buffer.readUInt16LE(centralDirOffset + 10);
  const compressedSize = buffer.readUInt32LE(centralDirOffset + 20);
  const localHeaderOffset = buffer.readUInt32LE(centralDirOffset + 42);

  const localSig = buffer.readUInt32LE(localHeaderOffset);
  if (localSig !== 0x04034b50) throw new Error("zip: local file header signature mismatch");
  const nameLen = buffer.readUInt16LE(localHeaderOffset + 26);
  const extraLen = buffer.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + nameLen + extraLen;
  const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) return Buffer.from(compressed);
  if (compressionMethod === 8) return inflateRawSync(compressed);
  throw new Error(`zip: unsupported compression method ${compressionMethod}`);
}

async function loadCorpCodeMap(): Promise<Map<string, CorpCodeEntry>> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) return new Map();

  const res = await fetch(
    `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${encodeURIComponent(apiKey)}`
  );
  if (!res.ok) throw new Error(`DART corpCode fetch failed: ${res.status}`);
  const zipBuffer = Buffer.from(await res.arrayBuffer());
  const xml = extractSingleZipEntry(zipBuffer).toString("utf-8");

  const map = new Map<string, CorpCodeEntry>();
  const entryRegex = /<list>([\s\S]*?)<\/list>/g;
  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(xml))) {
    const block = match[1];
    const corpCode = block.match(/<corp_code>(.*?)<\/corp_code>/)?.[1]?.trim();
    const corpName = block.match(/<corp_name>(.*?)<\/corp_name>/)?.[1]?.trim();
    const stockCode = block.match(/<stock_code>(.*?)<\/stock_code>/)?.[1]?.trim();
    if (corpCode && stockCode) {
      map.set(stockCode, { corpCode, corpName: corpName ?? stockCode });
    }
  }
  return map;
}

function getCorpCodeMap(): Promise<Map<string, CorpCodeEntry>> {
  if (!corpCodeMapPromise) {
    corpCodeMapPromise = loadCorpCodeMap().catch((err) => {
      corpCodeMapPromise = null; // allow retry on next call
      throw err;
    });
  }
  return corpCodeMapPromise;
}

function todayYYYYMMDD(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
function daysAgoYYYYMMDD(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** `stockCode` is the 6-digit KRX code (e.g. "138080"), not a Yahoo-style
 * symbol - strip any exchange suffix before calling. Returns null when
 * DART_API_KEY isn't configured or the code isn't found in DART's registry. */
export async function fetchDartDisclosures(
  stockCode: string,
  days = 120
): Promise<DartDisclosure[] | null> {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) return null;

  const map = await getCorpCodeMap();
  const entry = map.get(stockCode);
  if (!entry) return null;

  const url = new URL("https://opendart.fss.or.kr/api/list.json");
  url.searchParams.set("crtfc_key", apiKey);
  url.searchParams.set("corp_code", entry.corpCode);
  url.searchParams.set("bgn_de", daysAgoYYYYMMDD(days));
  url.searchParams.set("end_de", todayYYYYMMDD());
  url.searchParams.set("page_count", "15");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "000" || !Array.isArray(data.list)) return [];

  return data.list.map(
    (item: { report_nm: string; rcept_dt: string; rcept_no: string; flr_nm: string }) => ({
      title: item.report_nm,
      reportedAt: `${item.rcept_dt.slice(0, 4)}-${item.rcept_dt.slice(4, 6)}-${item.rcept_dt.slice(6, 8)}`,
      url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
      submitter: item.flr_nm,
    })
  );
}
