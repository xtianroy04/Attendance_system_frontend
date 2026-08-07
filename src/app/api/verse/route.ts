import { NextResponse } from 'next/server';

type VersePayload = {
  text: string;
  reference: string;
  translation: string;
};

const FALLBACKS: VersePayload[] = [
  {
    text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
    reference: 'John 3:16',
    translation: 'WEB',
  },
  {
    text: 'Trust in the LORD with all your heart, and don’t lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.',
    reference: 'Proverbs 3:5-6',
    translation: 'WEB',
  },
  {
    text: 'I can do all things through Christ who strengthens me.',
    reference: 'Philippians 4:13',
    translation: 'WEB',
  },
  {
    text: 'Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.',
    reference: 'Psalm 46:10',
    translation: 'WEB',
  },
];

async function fetchMidvash(): Promise<VersePayload | null> {
  const res = await fetch('https://api.midvash.com/v1/votd?version=web', {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.text || !data?.reference) return null;
  return {
    text: String(data.text).trim(),
    reference: String(data.reference).trim(),
    translation: String(data.version || 'WEB').toUpperCase(),
  };
}

async function fetchBibleApi(): Promise<VersePayload | null> {
  const res = await fetch('https://bible-api.com/data/web/random/NT', {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  const v = data?.random_verse;
  if (!v?.text || !v?.book) return null;
  return {
    text: String(v.text).trim(),
    reference: `${v.book} ${v.chapter}:${v.verse}`,
    translation: 'WEB',
  };
}

export async function GET() {
  try {
    const verse = (await fetchMidvash()) || (await fetchBibleApi());
    if (verse) {
      return NextResponse.json(verse);
    }
  } catch {
    // fall through
  }

  const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
  return NextResponse.json({ ...fallback, fallback: true });
}
