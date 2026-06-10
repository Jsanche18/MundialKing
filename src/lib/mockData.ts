export interface Team {
  apiId: number;
  name: string;
  flagUrl: string;
  currentStage: string;
  draftedBy: {
    userId: string;
    userName: string;
  } | null;
}

export interface Player {
  apiId: number;
  name: string;
  teamName: string;
  position: 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero';
  photoUrl: string;
  draftedBy: {
    userId: string;
    userName: string;
  } | null;
}

export interface Match {
  apiId: number;
  homeTeam: {
    name: string;
    flagUrl: string;
  };
  awayTeam: {
    name: string;
    flagUrl: string;
  };
  kickoffTimestamp: string;
  status: 'NS' | 'LIVE' | 'FT';
  homeGoals: number | null;
  awayGoals: number | null;
  userPrediction: {
    homeGoals: number | null;
    awayGoals: number | null;
  } | null;
}

export interface GroupMember {
  userId: string;
  name: string;
  avatarUrl: string;
  totalPoints: number;
  exactScores: number;
  tendencies: number;
  draftGoalsPoints: number;
  selectedTeamId: number | null;
  selectedTeamName: string | null;
  selectedPlayerId: number | null;
  selectedPlayerName: string | null;
  predictedTopScorerId: number | null;
  predictedTopScorerName: string | null;
}

export const MOCK_CURRENT_USER = {
  userId: "user-1",
  name: "Tú (Líder)",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
};

export const MOCK_TEAMS: Team[] = [
  { apiId: 1, name: "México", flagUrl: "https://flagcdn.com/w80/mx.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 2, name: "Sudáfrica", flagUrl: "https://flagcdn.com/w80/za.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 3, name: "Corea del Sur", flagUrl: "https://flagcdn.com/w80/kr.png", currentStage: "Fase de Grupos", draftedBy: { userId: "user-2", userName: "Carlos" } },
  { apiId: 4, name: "Chequia", flagUrl: "https://flagcdn.com/w80/cz.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 5, name: "Canadá", flagUrl: "https://flagcdn.com/w80/ca.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 6, name: "Bosnia y Herzegovina", flagUrl: "https://flagcdn.com/w80/ba.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 7, name: "Estados Unidos", flagUrl: "https://flagcdn.com/w80/us.png", currentStage: "Fase de Grupos", draftedBy: { userId: "user-3", userName: "Sofía" } },
  { apiId: 8, name: "Paraguay", flagUrl: "https://flagcdn.com/w80/py.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 9, name: "Catar", flagUrl: "https://flagcdn.com/w80/qa.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 10, name: "Suiza", flagUrl: "https://flagcdn.com/w80/ch.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 11, name: "Brasil", flagUrl: "https://flagcdn.com/w80/br.png", currentStage: "Fase de Grupos", draftedBy: null },
  { apiId: 12, name: "Marruecos", flagUrl: "https://flagcdn.com/w80/ma.png", currentStage: "Fase de Grupos", draftedBy: null },
];

export const MOCK_PLAYERS: Player[] = [
  { apiId: 101, name: "Son Heung-min", teamName: "Corea del Sur", position: "Delantero", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200", draftedBy: { userId: "user-2", userName: "Carlos" } },
  { apiId: 102, name: "Christian Pulisic", teamName: "Estados Unidos", position: "Centrocampista", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200", draftedBy: { userId: "user-3", userName: "Sofía" } },
  { apiId: 103, name: "Santiago Giménez", teamName: "México", position: "Delantero", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200", draftedBy: null },
  { apiId: 104, name: "Alphonso Davies", teamName: "Canadá", position: "Defensa", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200", draftedBy: null },
  { apiId: 105, name: "Vinícius Júnior", teamName: "Brasil", position: "Delantero", photoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200", draftedBy: null },
  { apiId: 106, name: "Granit Xhaka", teamName: "Suiza", position: "Centrocampista", photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200", draftedBy: null },
  { apiId: 107, name: "Miguel Almirón", teamName: "Paraguay", position: "Delantero", photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200", draftedBy: null },
  { apiId: 108, name: "Patrik Schick", teamName: "Chequia", position: "Delantero", photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200", draftedBy: null },
];

export const MOCK_MATCHES: Match[] = [
  {
    apiId: 1001,
    homeTeam: { name: "México", flagUrl: "https://flagcdn.com/w80/mx.png" },
    awayTeam: { name: "Sudáfrica", flagUrl: "https://flagcdn.com/w80/za.png" },
    kickoffTimestamp: "2026-06-11T17:00:00Z", // Opening match (June 11)
    status: "NS",
    homeGoals: null,
    awayGoals: null,
    userPrediction: null
  },
  {
    apiId: 1002,
    homeTeam: { name: "Corea del Sur", flagUrl: "https://flagcdn.com/w80/kr.png" },
    awayTeam: { name: "Chequia", flagUrl: "https://flagcdn.com/w80/cz.png" },
    kickoffTimestamp: "2026-06-12T15:00:00Z",
    status: "NS",
    homeGoals: null,
    awayGoals: null,
    userPrediction: null
  },
  {
    apiId: 1003,
    homeTeam: { name: "Canadá", flagUrl: "https://flagcdn.com/w80/ca.png" },
    awayTeam: { name: "Bosnia y Herzegovina", flagUrl: "https://flagcdn.com/w80/ba.png" },
    kickoffTimestamp: "2026-06-12T18:00:00Z",
    status: "NS",
    homeGoals: null,
    awayGoals: null,
    userPrediction: null
  },
  {
    apiId: 1004,
    homeTeam: { name: "Estados Unidos", flagUrl: "https://flagcdn.com/w80/us.png" },
    awayTeam: { name: "Paraguay", flagUrl: "https://flagcdn.com/w80/py.png" },
    kickoffTimestamp: "2026-06-13T19:00:00Z",
    status: "NS",
    homeGoals: null,
    awayGoals: null,
    userPrediction: null
  },
  {
    apiId: 1005,
    homeTeam: { name: "Catar", flagUrl: "https://flagcdn.com/w80/qa.png" },
    awayTeam: { name: "Suiza", flagUrl: "https://flagcdn.com/w80/ch.png" },
    kickoffTimestamp: "2026-06-13T21:00:00Z",
    status: "NS",
    homeGoals: null,
    awayGoals: null,
    userPrediction: null
  },
  {
    apiId: 1006,
    homeTeam: { name: "Brasil", flagUrl: "https://flagcdn.com/w80/br.png" },
    awayTeam: { name: "Marruecos", flagUrl: "https://flagcdn.com/w80/ma.png" },
    kickoffTimestamp: "2026-06-13T23:00:00Z",
    status: "NS",
    homeGoals: null,
    awayGoals: null,
    userPrediction: null
  }
];

export const MOCK_GROUP_MEMBERS: GroupMember[] = [
  {
    userId: "user-1",
    name: "Tú (Líder)",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100",
    totalPoints: 0,
    exactScores: 0,
    tendencies: 0,
    draftGoalsPoints: 0,
    selectedTeamId: null,
    selectedTeamName: null,
    selectedPlayerId: null,
    selectedPlayerName: null,
    predictedTopScorerId: null,
    predictedTopScorerName: null,
  },
  {
    userId: "user-2",
    name: "Carlos",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
    totalPoints: 0,
    exactScores: 0,
    tendencies: 0,
    draftGoalsPoints: 0,
    selectedTeamId: 3,
    selectedTeamName: "Corea del Sur",
    selectedPlayerId: 101,
    selectedPlayerName: "Son Heung-min",
    predictedTopScorerId: 105,
    predictedTopScorerName: "Vinícius Júnior",
  },
  {
    userId: "user-3",
    name: "Sofía",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
    totalPoints: 0,
    exactScores: 0,
    tendencies: 0,
    draftGoalsPoints: 0,
    selectedTeamId: 7,
    selectedTeamName: "Estados Unidos",
    selectedPlayerId: 102,
    selectedPlayerName: "Christian Pulisic",
    predictedTopScorerId: 101,
    predictedTopScorerName: "Son Heung-min",
  }
];
