import { PrismaClient } from "@prisma/client";
import handleError from '../src/utils/error';

const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});
async function main(): Promise<void> {
}

main()
  .catch((e) => {
    handleError(e, 'There was an issue seeding the database ', true)
  })

  export default prisma
