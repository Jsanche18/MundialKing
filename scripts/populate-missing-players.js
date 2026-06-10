const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STAR_PLAYERS = {
  // Egypt (ID: 32)
  32: [
    { name: "Mohamed Salah", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/306.png" },
    { name: "Omar Marmoush", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/25139.png" },
    { name: "Mostafa Mohamed", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/28221.png" },
    { name: "Mohamed Elneny", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/1435.png" },
    { name: "Trezeguet", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/3091.png" },
    { name: "Ahmed Hegazi", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/18919.png" },
    { name: "Mohamed El Shenawy", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/28213.png" }
  ],
  // Norway (ID: 1090)
  1090: [
    { name: "Erling Haaland", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/1100.png" },
    { name: "Martin Ødegaard", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/379.png" },
    { name: "Alexander Sørloth", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/1102.png" },
    { name: "Antonio Nusa", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/284322.png" },
    { name: "Sander Berge", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/18783.png" },
    { name: "Julian Ryerson", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/1744.png" },
    { name: "Ørjan Nyland", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/1608.png" }
  ],
  // Sweden (ID: 5)
  5: [
    { name: "Alexander Isak", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/18774.png" },
    { name: "Viktor Gyökeres", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/15865.png" },
    { name: "Dejan Kulusevski", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/1162.png" },
    { name: "Emil Forsberg", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/127.png" },
    { name: "Victor Lindelöf", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/12.png" },
    { name: "Robin Olsen", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/1609.png" }
  ],
  // Haiti (ID: 2386)
  2386: [
    { name: "Duckens Nazon", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/51551.png" },
    { name: "Frantzdy Pierrot", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/47372.png" },
    { name: "Derrick Etienne", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/20268.png" },
    { name: "Danley Jean Jacques", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/287313.png" },
    { name: "Carlens Arcus", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/51010.png" },
    { name: "Jhony Placide", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/51540.png" }
  ],
  // Turkey (ID: 777)
  777: [
    { name: "Arda Güler", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/307432.png" },
    { name: "Hakan Çalhanoğlu", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/1199.png" },
    { name: "Kenan Yıldız", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/342023.png" },
    { name: "Kerem Aktürkoğlu", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/153832.png" },
    { name: "Barış Alper Yılmaz", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/245229.png" },
    { name: "Ferdi Kadıoğlu", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/25442.png" },
    { name: "Altay Bayındır", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/28448.png" }
  ],
  // Ivory Coast (ID: 1501)
  1501: [
    { name: "Sébastien Haller", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/2012.png" },
    { name: "Franck Kessié", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/1628.png" },
    { name: "Simon Adingra", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/279822.png" },
    { name: "Ibrahim Sangaré", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/2186.png" },
    { name: "Evan Ndicka", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/2202.png" },
    { name: "Yahia Fofana", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/51239.png" }
  ],
  // Scotland (ID: 1108)
  1108: [
    { name: "Scott McTominay", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/908.png" },
    { name: "John McGinn", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/19034.png" },
    { name: "Andrew Robertson", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/290.png" },
    { name: "Che Adams", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/19194.png" },
    { name: "Angus Gunn", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/18911.png" }
  ],
  // South Africa (ID: 1531)
  1531: [
    { name: "Ronwen Williams", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/58428.png" },
    { name: "Percy Tau", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/19220.png" },
    { name: "Teboho Mokoena", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/58434.png" },
    { name: "Themba Zwane", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/58431.png" }
  ],
  // Paraguay (ID: 2380)
  2380: [
    { name: "Miguel Almirón", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/18882.png" },
    { name: "Julio Enciso", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/114622.png" },
    { name: "Gustavo Gómez", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/9839.png" },
    { name: "Gatito Fernández", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/9954.png" }
  ],
  // Panama (ID: 11)
  11: [
    { name: "Adalberto Carrasquilla", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/47432.png" },
    { name: "José Fajardo", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/47440.png" },
    { name: "Michael Amir Murillo", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/9053.png" },
    { name: "Orlando Mosquera", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/47413.png" }
  ],
  // Bosnia & Herzegovina (ID: 1113)
  1113: [
    { name: "Edin Džeko", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/874.png" },
    { name: "Ermedin Demirović", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/154.png" },
    { name: "Sead Kolašinac", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/1456.png" },
    { name: "Kenan Pirić", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/15239.png" }
  ],
  // Cape Verde (ID: 1533)
  1533: [
    { name: "Ryan Mendes", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/5879.png" },
    { name: "Garry Rodrigues", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/5878.png" },
    { name: "Jamiro Monteiro", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/25026.png" },
    { name: "Vozinha", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/47101.png" }
  ],
  // Iraq (ID: 1567)
  1567: [
    { name: "Aymen Hussein", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/47087.png" },
    { name: "Ali Jasim", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/340987.png" },
    { name: "Jalal Hassan", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/47065.png" }
  ],
  // Jordan (ID: 1548)
  1548: [
    { name: "Mousa Al-Tamari", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/24538.png" },
    { name: "Yazan Al-Naimat", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/128329.png" },
    { name: "Yazid Abu Layla", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/128310.png" }
  ],
  // New Zealand (ID: 4673)
  4673: [
    { name: "Chris Wood", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/18854.png" },
    { name: "Liberato Cacace", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/12810.png" },
    { name: "Alex Paulsen", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/280918.png" }
  ],
  // DR Congo (ID: 1508)
  1508: [
    { name: "Yoane Wissa", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/21921.png" },
    { name: "Chancel Mbemba", position: "Defensa", photoUrl: "https://media.api-sports.io/football/players/1458.png" },
    { name: "Lionel Mpasi", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/51299.png" }
  ],
  // Uzbekistan (ID: 1568)
  1568: [
    { name: "Eldor Shomurodov", position: "Delantero", photoUrl: "https://media.api-sports.io/football/players/1457.png" },
    { name: "Abbosbek Fayzullaev", position: "Centrocampista", photoUrl: "https://media.api-sports.io/football/players/282902.png" },
    { name: "Utkir Yusupov", position: "Portero", photoUrl: "https://media.api-sports.io/football/players/128450.png" }
  ]
};

async function main() {
  const teams = await prisma.team.findMany();
  console.log(`Checking ${teams.length} teams in database...`);
  
  let totalSeeded = 0;
  let mockIdCounter = 9900000;
  
  for (const team of teams) {
    // Ignorar placeholders virtuales
    if (team.apiId >= 99000) continue;
    
    // Contar cuántos jugadores tiene registrados actualmente
    const playersCount = await prisma.player.count({
      where: { teamId: team.apiId }
    });
    
    if (playersCount === 0) {
      console.log(`La selección "${team.name}" (ID: ${team.apiId}) tiene 0 jugadores. Rellenando escuadra...`);
      
      const stars = STAR_PLAYERS[team.apiId] || [];
      const squad = [...stars];
      
      // Rellenar hasta tener exactamente 22 jugadores
      const positionCounts = {
        'Portero': 3,
        'Defensa': 7,
        'Centrocampista': 7,
        'Delantero': 5
      };
      
      // Restar los puestos ya ocupados por los cracks
      squad.forEach(s => {
        if (positionCounts[s.position] > 0) {
          positionCounts[s.position]--;
        }
      });
      
      // Completar los puestos vacíos con jugadores con nombres realistas
      Object.entries(positionCounts).forEach(([pos, count]) => {
        for (let i = 0; i < count; i++) {
          squad.push({
            name: `${team.name} ${pos} ${i + 1}`,
            position: pos,
            photoUrl: 'https://media.api-sports.io/football/players/unknown.png'
          });
        }
      });
      
      // Crear los jugadores en la base de datos
      for (const p of squad) {
        await prisma.player.create({
          data: {
            apiId: mockIdCounter++,
            name: p.name,
            teamId: team.apiId,
            position: p.position,
            photoUrl: p.photoUrl
          }
        });
        totalSeeded++;
      }
      
      console.log(` -> Creada plantilla de ${squad.length} jugadores para ${team.name}.`);
    }
  }
  
  console.log(`\nPoblamiento completo: se agregaron ${totalSeeded} jugadores faltantes.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
