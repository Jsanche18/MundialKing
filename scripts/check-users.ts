import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  console.log('Consultando usuarios en la base de datos...');
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });
  console.log('Usuarios encontrados:', users);
  
  const groups = await db.group.findMany({
    select: {
      id: true,
      name: true,
      inviteCode: true
    }
  });
  console.log('Grupos encontrados:', groups);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
