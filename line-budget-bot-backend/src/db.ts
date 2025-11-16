// Prisma client singleton. Import this from other modules.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
