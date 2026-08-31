const { PrismaClient } = require('../../generated/prisma/client.cts');
const { PrismaNeon } = require('@prisma/adapter-neon');

const adapter = new PrismaNeon({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

async function releaseExists(majorVersion, patchVersion) {
  const version = `${majorVersion}.${patchVersion}`;
  const existing = await prisma.simplifiedJava.findFirst({ where: { version, language: 'java' }, select: { id: true } });
  return !!existing;
}

async function saveReleaseNotes({ majorVersion, patchVersion, url, title, sections, simplified }) {
  const version = `${majorVersion}.${patchVersion}`;
  return prisma.simplifiedJava.upsert({
    where: { url },
    update: { version, rawData: JSON.stringify(sections), simplifiedData: JSON.stringify(simplified) },
    create: {
      version, language: 'java', releaseDate: new Date(),
      rawData: JSON.stringify(sections), simplifiedData: JSON.stringify(simplified), url,
    },
  });
}

async function findAllJavaReleases() {
  return prisma.simplifiedJava.findMany({ where: { language: 'java' }, orderBy: { createdAt: 'desc' } });
}

async function closePool() {
  await prisma.$disconnect();
}

module.exports = { prisma, releaseExists, saveReleaseNotes, findAllJavaReleases, closePool };