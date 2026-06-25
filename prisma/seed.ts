import { PrismaClient } from "@prisma/client";
import { createCipheriv, createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();

function encryptChapterContent(plainText: string) {
  const key = createHash("sha256").update(process.env.AUTH_SECRET || "dev-key").digest();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedContent: encrypted.toString("base64"),
    contentNonce: nonce.toString("base64"),
    contentAuthTag: authTag.toString("base64")
  };
}

const commonParagraphs = [
  "The city woke beneath a ceiling of rain, each window holding a private constellation of amber light.",
  "At the old station, the clock had stopped at 11:11 years ago. Everyone called it superstition. The archive called it evidence.",
  "She touched the brass key to the reader and watched letters surface in the glass: debt, oath, inheritance.",
  "By dawn, the story would belong to whoever survived the telling. Until then, every page was a contract and every silence had a price."
];

const storySeeds = [
  {
    slug: "ember-archive",
    title: "The Ember Archive",
    genre: "Romantic Fantasy",
    description: "A royal archivist discovers that forbidden love letters are actually maps to a vanished kingdom.",
    authorName: "Aarohi Vane",
    coverUrl: "/story-covers/ember.png",
    freeChapterCap: 10,
    readsCount: 612000,
    ratingAverage: 4.9,
    tags: ["Royal intrigue", "Slow burn", "Mystery"],
    chapters: 14
  },
  {
    slug: "neon-oracle",
    title: "Neon Oracle",
    genre: "Cyberpunk Thriller",
    description: "A memory broker sells impossible futures until one prediction names her as the next citywide threat.",
    authorName: "Dev Arlen",
    coverUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
    freeChapterCap: 8,
    readsCount: 388000,
    ratingAverage: 4.7,
    tags: ["AI crime", "Found family", "High stakes"],
    chapters: 12
  },
  {
    slug: "monsoon-court",
    title: "The Monsoon Court",
    genre: "Historical Drama",
    description: "A courtroom poet challenges an empire with a verse that can either free a nation or destroy her family.",
    authorName: "Meera Sable",
    coverUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
    freeChapterCap: 9,
    readsCount: 451000,
    ratingAverage: 4.8,
    tags: ["Court politics", "Literary", "Epic"],
    chapters: 13
  }
];

async function seedCoinPackages() {
  const coinPackages = [
    { id: "starter", name: "Starter", coins: 100, bonusCoins: 0, priceCents: 9900 },
    { id: "popular", name: "Popular", coins: 350, bonusCoins: 0, priceCents: 29900 },
    { id: "premium", name: "Premium", coins: 650, bonusCoins: 0, priceCents: 49900 },
    { id: "vip", name: "VIP", coins: 1400, bonusCoins: 0, priceCents: 99900 }
  ];

  await prisma.coinPackage.updateMany({
    where: { id: { notIn: coinPackages.map((pack) => pack.id) } },
    data: { active: false }
  });

  for (const pack of coinPackages) {
    await prisma.coinPackage.upsert({
      where: { id: pack.id },
      create: { ...pack, currency: "INR", active: true },
      update: { ...pack, currency: "INR", active: true }
    });
  }
}

async function seedStories() {
  for (const seed of storySeeds) {
    const story = await prisma.story.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        title: seed.title,
        genre: seed.genre,
        genres: [seed.genre],
        description: seed.description,
        authorName: seed.authorName,
        coverUrl: seed.coverUrl,
        freeChapterCap: seed.freeChapterCap,
        readsCount: seed.readsCount,
        ratingAverage: seed.ratingAverage,
        tags: seed.tags,
        visibility: "PUBLIC",
        publicationStatus: "PUBLISHED",
        published: true
      },
      update: {
        title: seed.title,
        genre: seed.genre,
        genres: [seed.genre],
        description: seed.description,
        authorName: seed.authorName,
        coverUrl: seed.coverUrl,
        freeChapterCap: seed.freeChapterCap,
        readsCount: seed.readsCount,
        ratingAverage: seed.ratingAverage,
        tags: seed.tags,
        visibility: "PUBLIC",
        publicationStatus: "PUBLISHED",
        published: true
      }
    });

    for (let index = 1; index <= seed.chapters; index += 1) {
      const isFree = index <= seed.freeChapterCap;
      const price = isFree ? 0 : index <= seed.freeChapterCap + 2 ? 5 : index === seed.freeChapterCap + 3 ? 8 : 10;
      const title = isFree ? `Chapter ${index}: First Light` : `Chapter ${index}: Premium Turn`;
      const plainText = [`${seed.title} - ${title}`, "", ...commonParagraphs, ...commonParagraphs].join("\n\n");
      const encrypted = encryptChapterContent(plainText);

      await prisma.chapter.upsert({
        where: { storyId_number: { storyId: story.id, number: index } },
        create: {
          storyId: story.id,
          number: index,
          title,
          status: "PUBLISHED",
          isFree,
          coinPrice: price,
          excerpt: commonParagraphs[index % commonParagraphs.length],
          publishedAt: new Date(),
          ...encrypted
        },
        update: {
          title,
          status: "PUBLISHED",
          isFree,
          coinPrice: price,
          excerpt: commonParagraphs[index % commonParagraphs.length],
          publishedAt: new Date(),
          ...encrypted
        }
      });
    }
  }
}

async function main() {
  await seedCoinPackages();
  await seedStories();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });