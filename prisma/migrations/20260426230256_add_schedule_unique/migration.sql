/*
  Warnings:

  - A unique constraint covering the columns `[returnId,scheduleType]` on the table `Schedule` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Schedule_returnId_scheduleType_key" ON "Schedule"("returnId", "scheduleType");
