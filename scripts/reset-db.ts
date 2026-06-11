import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  console.log('Limpiando base de datos...');
  const p = await db.prediction.deleteMany({});
  console.log('Predicciones eliminadas:', p.count);
  const m = await db.groupMember.deleteMany({});
  console.log('Miembros eliminados:', m.count);
  const g = await db.group.deleteMany({});
  console.log('Grupos eliminados:', g.count);
  const u = await db.user.deleteMany({});
  console.log('Usuarios eliminados:', u.count);
  console.log('Hecho. Equipos, jugadores y partidos intactos.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
