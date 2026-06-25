import { prisma } from "../lib/prisma";
import { ensureStudioWorkspaceForStory } from "../lib/studio-workspace-service";

async function main() {
  const stories = await prisma.story.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" }
  });

  let completed = 0;
  for (const story of stories) {
    await ensureStudioWorkspaceForStory(story.id);
    completed += 1;
    console.log(`[studio-workspace] ${completed}/${stories.length} ${story.title}`);
  }

  const [projects, folders, files] = await Promise.all([
    prisma.studioProjectLink.count(),
    prisma.studioProjectFolder.count(),
    prisma.studioProjectFile.count()
  ]);
  console.log(JSON.stringify({ stories: stories.length, projects, folders, files }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });