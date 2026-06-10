/**
 * Script de prueba de lógica de negocio (Mundial King 2026)
 * Simula validaciones de bloqueo de predicción por tiempo, transacciones de draft
 * y algoritmos de puntuación atómicos.
 */

const assert = require('assert');

// 1. Simulación de la regla del Bloqueo Temporal (<= 60 minutos)
function validatePredictionTime(kickoffTimestamp, simulatedNow) {
  const kickoffTime = new Date(kickoffTimestamp).getTime();
  const now = new Date(simulatedNow).getTime();
  const diffMins = (kickoffTime - now) / (1000 * 60);

  if (diffMins <= 60) {
    return { allowed: false, reason: "Bloqueado: El partido inicia en menos de 60 minutos o ya ha comenzado." };
  }
  return { allowed: true };
}

// 2. Simulación del Algoritmo de Puntuación Atómico (Fin de Partido)
function calculatePoints(prediction, homeGoals, awayGoals, playerEvents, selectedPlayerId) {
  let pointsGained = 0;
  let isExact = false;
  let isTendency = false;
  let draftGoalsPoints = 0;

  if (prediction) {
    const exactMatch = prediction.homeGoals === homeGoals && prediction.awayGoals === awayGoals;
    if (exactMatch) {
      pointsGained += 3;
      isExact = true;
    } else {
      const realDiff = homeGoals - awayGoals;
      const predDiff = prediction.homeGoals - prediction.awayGoals;
      const correctTendency = (realDiff > 0 && predDiff > 0) || 
                              (realDiff < 0 && predDiff < 0) || 
                              (realDiff === 0 && predDiff === 0);

      if (correctTendency) {
        pointsGained += 1;
        isTendency = true;
      }
    }
  }

  if (selectedPlayerId && playerEvents) {
    const goalsScored = playerEvents.filter(e => e.type === "Goal" && e.playerId === selectedPlayerId).length;
    const assistsMade = playerEvents.filter(e => e.type === "Goal" && e.assistPlayerId === selectedPlayerId).length;
    pointsGained += (goalsScored + assistsMade);
    draftGoalsPoints += (goalsScored + assistsMade);
  }

  return { pointsGained, isExact, isTendency, draftGoalsPoints };
}

// 3. Ejecutar Pruebas Unitarias de Lógica de Negocio
try {
  console.log("=== INICIANDO PRUEBAS DE REGLAS DE NEGOCIO ===");

  // Test 1: Partido en el futuro (120 minutos de margen) -> Permitido
  const test1 = validatePredictionTime("2026-06-10T12:00:00Z", "2026-06-10T10:00:00Z");
  assert.strictEqual(test1.allowed, true);
  console.log("✓ Test 1: Predicción a futuro permitida.");

  // Test 2: Partido que inicia en 45 minutos -> Bloqueado
  const test2 = validatePredictionTime("2026-06-10T10:45:00Z", "2026-06-10T10:00:00Z");
  assert.strictEqual(test2.allowed, false);
  assert.ok(test2.reason.includes("Bloqueado"));
  console.log("✓ Test 2: Predicción bloqueada a menos de 60 minutos.");

  // Test 3: Marcador Exacto (+3 Puntos)
  const score3 = calculatePoints({ homeGoals: 2, awayGoals: 1 }, 2, 1, [], null);
  assert.strictEqual(score3.pointsGained, 3);
  assert.strictEqual(score3.isExact, true);
  console.log("✓ Test 3: Puntos por marcador exacto correctos (+3).");

  // Test 4: Marcador de Ganador/Tendencia (+1 Punto)
  const score4 = calculatePoints({ homeGoals: 1, awayGoals: 0 }, 3, 1, [], null);
  assert.strictEqual(score4.pointsGained, 1);
  assert.strictEqual(score4.isTendency, true);
  console.log("✓ Test 4: Puntos por tendencia ganadora correctos (+1).");

  // Test 5: Puntos de Jugador Estrella del Draft (+1 por gol/asistencia)
  const mockEvents = [
    { type: "Goal", playerId: 102, assistPlayerId: 104 },
  ];
  const score5 = calculatePoints(null, 1, 0, mockEvents, 102); // Jugador 102 es el mío y mete gol
  assert.strictEqual(score5.pointsGained, 1);
  assert.strictEqual(score5.draftGoalsPoints, 1);
  
  const score6 = calculatePoints(null, 1, 0, mockEvents, 104); // Jugador 104 es el mío y asiste
  assert.strictEqual(score6.pointsGained, 1);
  assert.strictEqual(score6.draftGoalsPoints, 1);
  console.log("✓ Test 5: Puntos del Draft por Goles y Asistencias correctos (+1).");

  console.log("=== TODAS LAS PRUEBAS DE LÓGICA PASARON CORRECTAMENTE ===");
} catch (e) {
  console.error("ERROR EN LAS PRUEBAS DE LÓGICA DE NEGOCIO:", e);
  process.exit(1);
}
