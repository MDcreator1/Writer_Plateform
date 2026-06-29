-- Add WRITER to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'WRITER';

-- Add authorId to Story
ALTER TABLE "Story" ADD COLUMN "authorId" TEXT;

-- Create index on authorId
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- Add foreign key constraint
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
