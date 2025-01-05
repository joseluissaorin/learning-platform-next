/*
  Warnings:

  - You are about to drop the column `structured_content` on the `SessionDocument` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SessionDocument" DROP COLUMN "structured_content",
ADD COLUMN     "structuredContent" JSONB NOT NULL DEFAULT '{}';
