'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Trophy, 
  Users, 
  Lock, 
  Unlock, 
  Search, 
  Check, 
  AlertCircle, 
  LogOut, 
  User, 
  Sparkles, 
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Activity,
  RotateCcw,
  Award,
  Edit2,
  CheckCircle2,
  PlusCircle,
  X,
  Copy
} from 'lucide-react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
  groupId: string;
  onGroupIdChange?: (groupId: string) => void;
  onLogout: () => void;
}

const COUNTRY_TRANSLATIONS: { [key: string]: string[] } = {
  "Algeria": ["argelia"],
  "Argentina": ["argentina"],
  "Australia": ["australia"],
  "Austria": ["austria"],
  "Belgium": ["bélgica", "belgica"],
  "Bosnia & Herzegovina": ["bosnia", "bosnia y herzegovina", "bosnia-herzegovina"],
  "Brazil": ["brasil", "brazil"],
  "Canada": ["canadá", "canada"],
  "Cape Verde": ["cabo verde", "cape verde", "islas de cabo verde", "cape verde islands"],
  "Colombia": ["colombia"],
  "Croatia": ["croacia"],
  "Curaçao": ["curazao", "curacao"],
  "Czech Republic": ["república checa", "republica checa", "chequia"],
  "DR Congo": ["congo", "república democrática del congo", "republica democratica del congo", "congo dr"],
  "Ecuador": ["ecuador"],
  "Egypt": ["egipto"],
  "England": ["inglaterra", "england"],
  "France": ["francia"],
  "Germany": ["alemania", "germany"],
  "Ghana": ["ghana"],
  "Haiti": ["haití", "haiti"],
  "Iran": ["irán", "iran"],
  "Iraq": ["irak", "iraq"],
  "Ivory Coast": ["costa de marfil"],
  "Japan": ["japón", "japon"],
  "Jordan": ["jordania"],
  "Mexico": ["méxico", "mexico"],
  "Morocco": ["marruecos"],
  "Netherlands": ["países bajos", "paises bajos", "holanda", "netherlands"],
  "New Zealand": ["nueva zelanda", "nueva zelanda"],
  "Norway": ["noruega"],
  "Panama": ["panamá", "panama"],
  "Paraguay": ["paraguay"],
  "Portugal": ["portugal"],
  "Qatar": ["catar", "qatar"],
  "Saudi Arabia": ["arabia saudita", "arabia saudí", "arabia saudi"],
  "Scotland": ["escocia"],
  "Senegal": ["senegal"],
  "South Africa": ["sudáfrica", "sudafrica", "suráfrica", "surafrica"],
  "South Korea": ["corea del sur", "corea"],
  "Spain": ["españa", "espana", "spain"],
  "Sweden": ["suecia"],
  "Switzerland": ["suiza"],
  "Tunisia": ["túnez", "tunez"],
  "Turkey": ["turquía", "turquia", "türkiye", "turkiye"],
  "USA": ["estados unidos", "eeuu", "ee.uu.", "usa", "us"],
  "Uruguay": ["uruguay"],
  "Uzbekistan": ["uzbekistán", "uzbekistan"]
};

export default function Dashboard({ currentUser, groupId, onGroupIdChange, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'draft' | 'simulador'>('matches');
  
  // Real Database States loaded via API
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<any[]>([]);

  // Simulation States
  const [simulatedScores, setSimulatedScores] = useState<{ [matchId: number]: { homeGoals: number | null; awayGoals: number | null } }>({});
  const [knockoutDrawWinners, setKnockoutDrawWinners] = useState<{ [matchId: number]: number }>({});
  
  // Manual qualifiers selection state
  const [manualQualifiers, setManualQualifiers] = useState<{
    firsts: { [groupLetter: string]: number | null };
    seconds: { [groupLetter: string]: number | null };
    thirds: { [groupLetter: string]: number | null };
    bestThirdsGroupLetters: string[];
    confirmed: boolean;
  }>({
    firsts: {},
    seconds: {},
    thirds: {},
    bestThirdsGroupLetters: [],
    confirmed: false
  });
  
  // Notification banner state
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  // Group Join/Create Modal States
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalTab, setGroupModalTab] = useState<'join' | 'create'>('join');
  const [modalGroupName, setModalGroupName] = useState('');
  const [modalInviteCode, setModalInviteCode] = useState('');
  const [modalGroupPassword, setModalGroupPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Draft section states
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [selectedTopScorerQuery, setSelectedTopScorerQuery] = useState('');
  const [showTopScorerResults, setShowTopScorerResults] = useState(false);
  const [isDraftTeamOpen, setIsDraftTeamOpen] = useState(true);
  const [isDraftPlayersOpen, setIsDraftPlayersOpen] = useState(true);
  const [isDraftScorerOpen, setIsDraftScorerOpen] = useState(true);
  const [isDraftGloriousOpen, setIsDraftGloriousOpen] = useState(true);

  // Matches section filtering states
  const [matchesPhaseFilter, setMatchesPhaseFilter] = useState<'groups' | 'knockout'>('groups');
  const [matchesGroupFilter, setMatchesGroupFilter] = useState<string>('all');
  const [matchesPredictionFilter, setMatchesPredictionFilter] = useState<'all' | 'pending' | 'completed' | 'live'>('all');
  const [matchesSearchQuery, setMatchesSearchQuery] = useState<string>('');

  // Real-time simulated/actual time state
  const [simulatedNow, setSimulatedNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedNow(Date.now());
    }, 30000); // Actualiza cada 30 segundos
    return () => clearInterval(timer);
  }, []);

  // SWR for live matches polling every 10 seconds (Layer 2 - Polling Interno de Coste Cero)
  const { data: swrMatches } = useSWR(
    groupId ? `/api/matches?groupId=${groupId}` : null,
    async (url: string) => {
      const res = await fetch(url, { headers: { 'X-User-Id': currentUser.id } });
      if (!res.ok) throw new Error('Error al cargar partidos.');
      return res.json();
    },
    {
      refreshInterval: 10000, // 10 segundos
      revalidateOnFocus: true
    }
  );

  // Sincronizar los partidos traídos por SWR con el estado interno
  useEffect(() => {
    if (swrMatches) {
      setMatches(swrMatches);
    }
  }, [swrMatches]);

  // Load simulation data on mount
  useEffect(() => {
    const savedSimScores = localStorage.getItem('wc_sim_scores');
    const savedDrawWinners = localStorage.getItem('wc_sim_draw_winners');
    const savedManualQualifiers = localStorage.getItem('wc_sim_manual_qualifiers');
    if (savedSimScores) {
      setSimulatedScores(JSON.parse(savedSimScores));
    }
    if (savedDrawWinners) {
      setKnockoutDrawWinners(JSON.parse(savedDrawWinners));
    }
    if (savedManualQualifiers) {
      setManualQualifiers(JSON.parse(savedManualQualifiers));
    }
  }, []);

  const updateSimulatedScore = (matchId: number, side: 'home' | 'away', val: string) => {
    const newScores = { ...simulatedScores };
    if (!newScores[matchId]) {
      newScores[matchId] = { homeGoals: null, awayGoals: null };
    }
    const numVal = val === '' ? null : parseInt(val, 10);
    if (side === 'home') {
      newScores[matchId].homeGoals = numVal;
    } else {
      newScores[matchId].awayGoals = numVal;
    }
    
    // Clean up draw winner if score changes and it's no longer a draw
    if (newScores[matchId].homeGoals !== newScores[matchId].awayGoals) {
      const newDrawWinners = { ...knockoutDrawWinners };
      delete newDrawWinners[matchId];
      setKnockoutDrawWinners(newDrawWinners);
      localStorage.setItem('wc_sim_draw_winners', JSON.stringify(newDrawWinners));
    }

    setSimulatedScores(newScores);
    localStorage.setItem('wc_sim_scores', JSON.stringify(newScores));
  };

  const handleSelectTieWinner = (matchId: number, teamApiId: number) => {
    const newDrawWinners = { ...knockoutDrawWinners, [matchId]: teamApiId };
    setKnockoutDrawWinners(newDrawWinners);
    localStorage.setItem('wc_sim_draw_winners', JSON.stringify(newDrawWinners));
  };

  const updateManualQualifiers = (newQualifiers: typeof manualQualifiers) => {
    setManualQualifiers(newQualifiers);
    localStorage.setItem('wc_sim_manual_qualifiers', JSON.stringify(newQualifiers));
  };

  const handleResetSimulation = () => {
    setSimulatedScores({});
    setKnockoutDrawWinners({});
    const emptyQualifiers = {
      firsts: {},
      seconds: {},
      thirds: {},
      bestThirdsGroupLetters: [],
      confirmed: false
    };
    setManualQualifiers(emptyQualifiers);
    localStorage.removeItem('wc_sim_scores');
    localStorage.removeItem('wc_sim_draw_winners');
    localStorage.removeItem('wc_sim_manual_qualifiers');
    setNotification({ message: 'Simulación reiniciada con éxito.', type: 'success' });
  };

  const handleAutoFillQualifiers = () => {
    const firsts: { [groupLetter: string]: number | null } = {};
    const seconds: { [groupLetter: string]: number | null } = {};
    const thirds: { [groupLetter: string]: number | null } = {};
    
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const thirdsList: { group: string; points: number; goalDifference: number; goalsFor: number; apiId: number }[] = [];

    groups.forEach(letter => {
      const groupStandings = calculatedStandings[letter] || [];
      firsts[letter] = groupStandings[0]?.apiId || null;
      seconds[letter] = groupStandings[1]?.apiId || null;
      thirds[letter] = groupStandings[2]?.apiId || null;

      if (groupStandings[2]) {
        thirdsList.push({
          group: letter,
          points: groupStandings[2].points,
          goalDifference: groupStandings[2].goalDifference,
          goalsFor: groupStandings[2].goalsFor,
          apiId: groupStandings[2].apiId
        });
      }
    });

    thirdsList.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.group.localeCompare(b.group);
    });

    const bestThirdsGroupLetters = thirdsList.slice(0, 8).map(t => t.group);

    updateManualQualifiers({
      firsts,
      seconds,
      thirds,
      bestThirdsGroupLetters,
      confirmed: false
    });
    setNotification({ message: 'Clasificados auto-completados a partir de las posiciones de los grupos.', type: 'success' });
  };

  const handleConfirmQualifiers = () => {
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    for (const letter of groups) {
      if (!manualQualifiers.firsts[letter] || !manualQualifiers.seconds[letter] || !manualQualifiers.thirds[letter]) {
        setNotification({ message: `Falta seleccionar clasificados en el Grupo ${letter}.`, type: 'error' });
        return;
      }
    }

    if (manualQualifiers.bestThirdsGroupLetters.length !== 8) {
      setNotification({ message: `Debes seleccionar exactamente 8 mejores terceros. Actualmente seleccionados: ${manualQualifiers.bestThirdsGroupLetters.length}`, type: 'error' });
      return;
    }

    updateManualQualifiers({
      ...manualQualifiers,
      confirmed: true
    });
    setNotification({ message: 'Clasificados confirmados. Cuadro eliminatorio desbloqueado con selecciones reales.', type: 'success' });
  };

  const handleModifyQualifiers = () => {
    updateManualQualifiers({
      ...manualQualifiers,
      confirmed: false
    });
    setNotification({ message: 'Puedes modificar las selecciones. El bracket ha sido bloqueado temporalmente.', type: 'success' });
  };

  useEffect(() => {
    loadDashboardData();
  }, [groupId]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch matches, teams, players, group standings, and user groups in parallel
      const [matchesRes, teamsRes, playersRes, standingsRes, groupsRes] = await Promise.all([
        fetch(`/api/matches?groupId=${groupId}`, { headers: { 'X-User-Id': currentUser.id } }),
        fetch(`/api/teams?groupId=${groupId}`),
        fetch(`/api/players?groupId=${groupId}`),
        fetch(`/api/groups/${groupId}/standings`),
        fetch(`/api/groups`, { headers: { 'X-User-Id': currentUser.id } })
      ]);

      if (!matchesRes.ok || !teamsRes.ok || !playersRes.ok || !standingsRes.ok || !groupsRes.ok) {
        if (groupsRes.status === 401 || matchesRes.status === 401) {
          onLogout();
          return;
        }
        throw new Error("Error al cargar uno de los módulos.");
      }

      const [matchesData, teamsData, playersData, standingsData, groupsData] = await Promise.all([
        matchesRes.json(),
        teamsRes.json(),
        playersRes.json(),
        standingsRes.json(),
        groupsRes.json()
      ]);

      setMatches(matchesData);
      setTeams(teamsData);
      setPlayers(playersData);
      setMembers(standingsData);
      setUserGroups(groupsData);
    } catch (err: any) {
      setNotification({ message: err.message || "Error al cargar datos del servidor.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleModalJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    if (!modalInviteCode.trim()) {
      setModalError('Por favor, introduce el código de invitación.');
      return;
    }

    try {
      setModalLoading(true);
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({ inviteCode: modalInviteCode.trim(), password: modalGroupPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Error al unirse al grupo.');
        return;
      }

      // Close modal & reset fields
      setShowGroupModal(false);
      setModalInviteCode('');
      setModalGroupPassword('');
      
      // Update active group and show toast
      const joinedGroupId = data.group.id;
      onGroupIdChange?.(joinedGroupId);
      
      // Reload userGroups & data
      const groupsRes = await fetch(`/api/groups`, { headers: { 'X-User-Id': currentUser.id } });
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setUserGroups(groupsData);
      }
      
      setNotification({ message: `Te has unido a "${data.group.name}" con éxito.`, type: 'success' });
    } catch (err) {
      setModalError('Error de red al unirse al grupo.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    if (!modalGroupName.trim()) {
      setModalError('Por favor, escribe un nombre para el grupo.');
      return;
    }

    try {
      setModalLoading(true);
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({ name: modalGroupName.trim(), password: modalGroupPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Error al crear el grupo.');
        return;
      }

      // Close modal & reset fields
      setShowGroupModal(false);
      setModalGroupName('');
      setModalGroupPassword('');

      // Update active group and show toast
      const createdGroupId = data.group.id;
      onGroupIdChange?.(createdGroupId);

      // Reload userGroups & data
      const groupsRes = await fetch(`/api/groups`, { headers: { 'X-User-Id': currentUser.id } });
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setUserGroups(groupsData);
      }

      setNotification({ message: `Grupo "${data.group.name}" creado con éxito. Código: ${data.group.inviteCode}`, type: 'success' });
    } catch (err) {
      setModalError('Error de red al crear el grupo.');
    } finally {
      setModalLoading(false);
    }
  };

  // Helper to verify if all group stage matches are finished (apiId <= 2026072)
  const allGroupStageFinished = useMemo(() => {
    const groupMatches = matches.filter(m => m.apiId >= 2026001 && m.apiId <= 2026072);
    return groupMatches.length > 0 && groupMatches.every(m => m.status === 'FT');
  }, [matches]);

  // Helper to check if a match is locked (kickoff time <= 60 minutes from simulated now)
  const isMatchLocked = (kickoffStr: string, status: string) => {
    if (status === 'FT' || status === 'LIVE') return true;
    const kickoffTime = new Date(kickoffStr).getTime();
    const diffMs = kickoffTime - simulatedNow;
    const diffMins = diffMs / (1000 * 60);
    return diffMins <= 60;
  };

  // Helper to format remaining time or lock status
  const getMatchTimeStatus = (kickoffStr: string, status: string) => {
    if (status === 'FT') return { text: 'Finalizado', style: 'bg-slate-800 text-slate-400' };
    if (status === 'LIVE') return { text: 'EN VIVO', style: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    
    const kickoffTime = new Date(kickoffStr).getTime();
    const diffMs = kickoffTime - simulatedNow;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins <= 0) {
      return { text: 'Comenzado', style: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    }
    
    if (diffMins <= 60) {
      return { text: `Bloqueado (Inicia en ${diffMins} min)`, style: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
    }
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return { text: `Cierra en ${diffHours}h`, style: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return { text: `Cierra en ${diffDays}d`, style: 'bg-slate-700/50 text-slate-300' };
  };

  // Prediction Save Handler
  const handleSavePrediction = async (matchId: number, homeGoals: number | null, awayGoals: number | null) => {
    const targetMatch = matches.find(m => m.apiId === matchId);
    if (!targetMatch) return;

    if (isMatchLocked(targetMatch.kickoffTimestamp, targetMatch.status)) {
      setNotification({ message: "Error: El partido está bloqueado para predicciones.", type: "error" });
      return;
    }

    try {
      const res = await fetch('/api/predictions', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({ matchId, groupId, homeGoals, awayGoals })
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ message: data.error || "Error al guardar la predicción.", type: 'error' });
        return;
      }

      setNotification({
        message: `Predicción guardada para el ${targetMatch.homeTeam.name} vs ${targetMatch.awayTeam.name}`,
        type: 'success'
      });
      
      // Refresh dashboard info
      loadDashboardData();
    } catch (err) {
      setNotification({ message: "Error de red al guardar predicción.", type: 'error' });
    }
  };

  // Draft Selection Handler - Team
  const handleSelectTeam = async (teamId: number) => {
    const selectedTeam = teams.find(t => t.apiId === teamId);
    if (!selectedTeam) return;

    if (selectedTeam.draftedBy && selectedTeam.draftedBy.userId !== currentUser.id) {
      return; // Taken
    }

    try {
      const res = await fetch('/api/draft/select', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({ type: 'team', id: teamId, groupId })
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ message: data.error || "Error en la selección del equipo.", type: 'error' });
        return;
      }

      setNotification({
        message: selectedTeam.draftedBy?.userId === currentUser.id
          ? "Has liberado tu selección de equipo." 
          : `Has fichado a ${selectedTeam.name} como tu equipo exclusivo.`,
        type: 'success'
      });

      loadDashboardData();
    } catch (err) {
      setNotification({ message: "Error de red al seleccionar equipo.", type: 'error' });
    }
  };

  // Draft Selection Handler - Player
  const handleSelectPlayer = async (playerId: number) => {
    const selectedPlayer = players.find(p => p.apiId === playerId);
    if (!selectedPlayer) return;

    if (selectedPlayer.draftedBy && selectedPlayer.draftedBy.userId !== currentUser.id) {
      return; // Taken
    }

    try {
      const res = await fetch('/api/draft/select', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({ type: 'player', id: playerId, groupId })
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ message: data.error || "Error al fichar al jugador.", type: 'error' });
        return;
      }

      setNotification({
        message: selectedPlayer.draftedBy?.userId === currentUser.id
          ? "Has liberado tu selección de jugador." 
          : `Has fichado a ${selectedPlayer.name} para tu plantilla exclusiva.`,
        type: 'success'
      });

      setPlayerSearchQuery('');
      loadDashboardData();
    } catch (err) {
      setNotification({ message: "Error de red al seleccionar jugador.", type: 'error' });
    }
  };

  // Draft Selection Handler - Weak Team
  const handleSelectWeakTeam = async (teamId: number) => {
    const selectedTeam = teams.find(t => t.apiId === teamId);
    if (!selectedTeam) return;

    if (selectedTeam.gloriousDraftedBy && selectedTeam.gloriousDraftedBy.userId !== currentUser.id) {
      return; // Taken
    }

    try {
      const res = await fetch('/api/draft/select', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({ type: 'weakTeam', id: teamId, groupId })
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ message: data.error || "Error en la selección de la selección gloriosa.", type: 'error' });
        return;
      }

      setNotification({
        message: selectedTeam.gloriousDraftedBy?.userId === currentUser.id
          ? "Has liberado tu Selección Gloriosa." 
          : `Has fichado a ${selectedTeam.name} como tu Selección Gloriosa (+3 pts por victoria).`,
        type: 'success'
      });

      loadDashboardData();
    } catch (err) {
      setNotification({ message: "Error de red al seleccionar selección gloriosa.", type: 'error' });
    }
  };

  // Draft Selection Handler - Top Scorer Predict
  const handleSelectTopScorer = async (player: any) => {
    try {
      const res = await fetch('/api/draft/select', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({ type: 'topScorer', id: player.apiId, groupId })
      });

      const data = await res.json();
      if (!res.ok) {
        setNotification({ message: data.error || "Error al guardar Bota de Oro.", type: 'error' });
        return;
      }

      setNotification({
        message: `Tu predicción de Bota de Oro para ${player.name} ha sido guardada.`,
        type: 'success'
      });
      setShowTopScorerResults(false);
      setSelectedTopScorerQuery('');
      loadDashboardData();
    } catch (err) {
      setNotification({ message: "Error de red al guardar Bota de Oro.", type: 'error' });
    }
  };

  // Helper for standings sort
  const sortGroupStandings = (a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  };

  // Group standings calculated dynamically
  const calculatedStandings = useMemo(() => {
    const standings: { [groupLetter: string]: any[] } = {};
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    groups.forEach((letter, i) => {
      const groupMatches = matches.filter(m => m.apiId >= 2026001 + i * 6 && m.apiId <= 2026006 + i * 6);
      const teamSet = new Set<string>();
      const teamRows: any[] = [];
      
      groupMatches.forEach(m => {
        const homeTeamReal = teams.find(t => t.name === m.homeTeam.name);
        const awayTeamReal = teams.find(t => t.name === m.awayTeam.name);
        
        if (homeTeamReal && !teamSet.has(homeTeamReal.name)) {
          teamSet.add(homeTeamReal.name);
          teamRows.push({
            teamName: homeTeamReal.name,
            flagUrl: homeTeamReal.flagUrl,
            apiId: homeTeamReal.apiId,
            played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0
          });
        }
        if (awayTeamReal && !teamSet.has(awayTeamReal.name)) {
          teamSet.add(awayTeamReal.name);
          teamRows.push({
            teamName: awayTeamReal.name,
            flagUrl: awayTeamReal.flagUrl,
            apiId: awayTeamReal.apiId,
            played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0
          });
        }
      });
      
      groupMatches.forEach(m => {
        let hg: number | null = null;
        let ag: number | null = null;

        if (m.status === 'FT' || m.status === 'LIVE') {
          hg = m.homeGoals;
          ag = m.awayGoals;
        } else {
          const score = simulatedScores[m.apiId];
          if (score && score.homeGoals !== null && score.awayGoals !== null) {
            hg = score.homeGoals;
            ag = score.awayGoals;
          }
        }

        if (hg !== null && ag !== null) {
          const homeRow = teamRows.find(r => r.teamName === m.homeTeam.name);
          const awayRow = teamRows.find(r => r.teamName === m.awayTeam.name);
          
          if (homeRow && awayRow) {
            homeRow.played += 1;
            awayRow.played += 1;
            homeRow.goalsFor += hg;
            homeRow.goalsAgainst += ag;
            awayRow.goalsFor += ag;
            awayRow.goalsAgainst += hg;
            homeRow.goalDifference = homeRow.goalsFor - homeRow.goalsAgainst;
            awayRow.goalDifference = awayRow.goalsFor - awayRow.goalsAgainst;
            
            if (hg > ag) {
              homeRow.won += 1;
              homeRow.points += 3;
              awayRow.lost += 1;
            } else if (ag > hg) {
              awayRow.won += 1;
              awayRow.points += 3;
              homeRow.lost += 1;
            } else {
              homeRow.drawn += 1;
              homeRow.points += 1;
              awayRow.drawn += 1;
              awayRow.points += 1;
            }
          }
        }
      });
      
      teamRows.sort(sortGroupStandings);
      standings[letter] = teamRows;
    });
    
    return standings;
  }, [matches, teams, simulatedScores]);

  // Third place assignments
  const thirdPlaceAssignments = useMemo(() => {
    const thirdsList: { group: string; team: any; points: number; goalDifference: number; goalsFor: number }[] = [];
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    groups.forEach(letter => {
      const groupStandings = calculatedStandings[letter];
      if (groupStandings && groupStandings.length >= 3) {
        const thirdTeam = groupStandings[2];
        if (thirdTeam) {
          thirdsList.push({
            group: letter,
            team: thirdTeam,
            points: thirdTeam.points,
            goalDifference: thirdTeam.goalDifference,
            goalsFor: thirdTeam.goalsFor
          });
        }
      }
    });
    
    thirdsList.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.group.localeCompare(b.group);
    });
    
    const qualifiedThirds = thirdsList.slice(0, 8);
    const slots = [
      { id: '3A/B/C/D/F', allowed: ['A', 'B', 'C', 'D', 'F'] },
      { id: '3C/D/F/G/H', allowed: ['C', 'D', 'F', 'G', 'H'] },
      { id: '3C/E/F/H/I', allowed: ['C', 'E', 'F', 'H', 'I'] },
      { id: '3E/H/I/J/K', allowed: ['E', 'H', 'I', 'J', 'K'] },
      { id: '3B/E/F/I/J', allowed: ['B', 'E', 'F', 'I', 'J'] },
      { id: '3A/E/H/I/J', allowed: ['A', 'E', 'H', 'I', 'J'] },
      { id: '3E/F/G/I/J', allowed: ['E', 'F', 'G', 'I', 'J'] },
      { id: '3D/E/I/J/L', allowed: ['D', 'E', 'I', 'J', 'L'] },
    ];
    
    const assignment: { [slotId: string]: any } = {};
    const assignedTeams = new Set<string>();
    
    for (const slot of slots) {
      const match = qualifiedThirds.find(qt => slot.allowed.includes(qt.group) && !assignedTeams.has(qt.team.teamName));
      if (match) {
        assignment[slot.id] = match.team;
        assignedTeams.add(match.team.teamName);
      }
    }
    
    for (const slot of slots) {
      if (!assignment[slot.id]) {
        const fallback = qualifiedThirds.find(qt => !assignedTeams.has(qt.team.teamName));
        if (fallback) {
          assignment[slot.id] = fallback.team;
          assignedTeams.add(fallback.team.teamName);
        }
      }
    }
    
    return assignment;
  }, [calculatedStandings]);

  // Manual third place assignments for bracket based on selected qualifiers
  const manualThirdPlaceAssignments = useMemo(() => {
    if (!manualQualifiers.confirmed) return {};

    const qualifiedThirds: { group: string; team: any }[] = [];
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    groups.forEach(letter => {
      if (manualQualifiers.bestThirdsGroupLetters.includes(letter)) {
        const teamId = manualQualifiers.thirds[letter];
        const team = teams.find(t => t.apiId === teamId);
        if (team) {
          qualifiedThirds.push({
            group: letter,
            team: { teamName: team.name, flagUrl: team.flagUrl, apiId: team.apiId }
          });
        }
      }
    });

    const slots = [
      { id: '3A/B/C/D/F', allowed: ['A', 'B', 'C', 'D', 'F'] },
      { id: '3C/D/F/G/H', allowed: ['C', 'D', 'F', 'G', 'H'] },
      { id: '3C/E/F/H/I', allowed: ['C', 'E', 'F', 'H', 'I'] },
      { id: '3E/H/I/J/K', allowed: ['E', 'H', 'I', 'J', 'K'] },
      { id: '3B/E/F/I/J', allowed: ['B', 'E', 'F', 'I', 'J'] },
      { id: '3A/E/H/I/J', allowed: ['A', 'E', 'H', 'I', 'J'] },
      { id: '3E/F/G/I/J', allowed: ['E', 'F', 'G', 'I', 'J'] },
      { id: '3D/E/I/J/L', allowed: ['D', 'E', 'I', 'J', 'L'] },
    ];
    
    const assignment: { [slotId: string]: any } = {};
    const assignedTeams = new Set<string>();
    
    for (const slot of slots) {
      const match = qualifiedThirds.find(qt => slot.allowed.includes(qt.group) && !assignedTeams.has(qt.team.teamName));
      if (match) {
        assignment[slot.id] = match.team;
        assignedTeams.add(match.team.teamName);
      }
    }
    
    for (const slot of slots) {
      if (!assignment[slot.id]) {
        const fallback = qualifiedThirds.find(qt => !assignedTeams.has(qt.team.teamName));
        if (fallback) {
          assignment[slot.id] = fallback.team;
          assignedTeams.add(fallback.team.teamName);
        }
      }
    }
    
    return assignment;
  }, [manualQualifiers, teams]);

  // Recursive team resolver
  const resolveTeam = (name: string): { name: string; flagUrl: string; apiId: number } | null => {
    if (!name) return null;
    
    const isPlaceholder = /^[12][A-L]$|^3[A-L\/]+$|^[WL]\d+$/.test(name);
    if (!isPlaceholder) {
      const realTeam = teams.find(t => t.name === name);
      if (realTeam) {
        return { name: realTeam.name, flagUrl: realTeam.flagUrl, apiId: realTeam.apiId };
      }
      return { name, flagUrl: 'https://media.api-sports.io/football/teams/unknown.png', apiId: 0 };
    }
    
    if (name.startsWith('W') || name.startsWith('L')) {
      const prevMatchNum = parseInt(name.slice(1), 10);
      const prevMatchId = 2026000 + prevMatchNum;
      const prevMatch = matches.find(m => m.apiId === prevMatchId);
      if (!prevMatch) return null;
      
      const homeTeam = resolveTeam(prevMatch.homeTeam.name);
      const awayTeam = resolveTeam(prevMatch.awayTeam.name);
      if (!homeTeam || !awayTeam) return null;
      
      let hg: number | null = null;
      let ag: number | null = null;

      if (prevMatch.status === 'FT' || prevMatch.status === 'LIVE') {
        hg = prevMatch.homeGoals;
        ag = prevMatch.awayGoals;
      } else {
        const simScore = simulatedScores[prevMatchId];
        if (simScore && simScore.homeGoals !== null && simScore.awayGoals !== null) {
          hg = simScore.homeGoals;
          ag = simScore.awayGoals;
        }
      }

      if (hg === null || ag === null) {
        return null;
      }
      
      if (hg > ag) {
        return name.startsWith('W') ? homeTeam : awayTeam;
      } else if (ag > hg) {
        return name.startsWith('W') ? awayTeam : homeTeam;
      } else {
        const chosenWinnerId = knockoutDrawWinners[prevMatchId];
        if (chosenWinnerId === homeTeam.apiId) {
          return name.startsWith('W') ? homeTeam : awayTeam;
        } else if (chosenWinnerId === awayTeam.apiId) {
          return name.startsWith('W') ? awayTeam : homeTeam;
        }
        return null;
      }
    }
    
    if (/^[12][A-L]$/.test(name)) {
      const rank = parseInt(name[0], 10);
      const groupLetter = name[1];
      
      if (manualQualifiers.confirmed) {
        const apiId = rank === 1 ? manualQualifiers.firsts[groupLetter] : manualQualifiers.seconds[groupLetter];
        if (apiId) {
          const team = teams.find(t => t.apiId === apiId);
          if (team) {
            return { name: team.name, flagUrl: team.flagUrl, apiId: team.apiId };
          }
        }
        return null;
      }
      
      const groupStandings = calculatedStandings[groupLetter];
      if (!groupStandings || groupStandings.length === 0) return null;
      
      const standingRow = groupStandings[rank - 1];
      if (!standingRow) return null;
      
      return { name: standingRow.teamName, flagUrl: standingRow.flagUrl, apiId: standingRow.apiId };
    }
    
    if (name.startsWith('3')) {
      if (manualQualifiers.confirmed) {
        const assignedTeam = manualThirdPlaceAssignments[name];
        if (assignedTeam) {
          return { name: assignedTeam.teamName, flagUrl: assignedTeam.flagUrl, apiId: assignedTeam.apiId };
        }
        return null;
      }
      
      const assignedTeam = thirdPlaceAssignments[name];
      if (assignedTeam) {
        return { name: assignedTeam.teamName, flagUrl: assignedTeam.flagUrl, apiId: assignedTeam.apiId };
      }
      return null;
    }
    
    return null;
  };

  const myMemberInfo = members.find(m => m.userId === currentUser.id);


  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-105 wc2026-bg">
        <div className="h-10 w-10 border-4 border-mexico-green border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-slate-100">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className={`glass-panel border-l-4 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 bg-slate-900/90 text-slate-100 ${
            notification.type === 'success' ? 'border-emerald-500' : 'border-red-500'
          }`}>
            <div className={`h-2 w-2 rounded-full animate-ping ${
              notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Side Navigation for Desktop */}
      <aside className="hidden md:flex flex-col w-72 glass-panel border-r border-slate-800/60 p-6 shrink-0 justify-between">
        <div>
          {/* Logo & Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-mexico-green via-canada-red to-usa-blue flex items-center justify-center shadow-lg">
              <span className="font-display font-extrabold text-xl text-white">W</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg leading-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">Mundial 2026</h1>
              <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Quiniela VIP</span>
            </div>
          </div>

          {/* Selector de Grupo */}
          <div className="mb-6 space-y-2.5">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mis Salas</label>
              {userGroups.length > 0 && (
                <span className="text-[9px] bg-slate-800/80 text-slate-300 px-1.5 py-0.5 rounded-full border border-slate-700/60 font-bold">
                  {userGroups.length}
                </span>
              )}
            </div>
            
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              {userGroups.map(g => {
                const isActive = g.id === groupId;
                return (
                  <div key={g.id} className="flex flex-col gap-1">
                    <button
                      onClick={() => onGroupIdChange?.(g.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all duration-200 border group ${
                        isActive
                          ? 'bg-gradient-to-r from-slate-900 to-slate-900/60 border-mexico-green/60 text-slate-100 font-bold shadow-md shadow-mexico-green/5'
                          : 'bg-slate-950/20 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 hover:border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600 group-hover:bg-slate-400'}`} />
                        <span className="truncate">{g.name}</span>
                      </div>
                      {isActive && (
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-semibold shrink-0 uppercase tracking-widest border border-emerald-500/25">
                          Activo
                        </span>
                      )}
                    </button>
                    {isActive && g.inviteCode && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(g.inviteCode);
                          setNotification({ message: `Código "${g.inviteCode}" copiado al portapapeles.`, type: 'success' });
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-200 group/copy"
                        title="Copiar código de invitación"
                      >
                        <span className="text-[10px] font-mono text-emerald-400 tracking-widest font-bold">{g.inviteCode}</span>
                        <Copy className="h-3 w-3 text-slate-500 group-hover/copy:text-emerald-400 transition-colors shrink-0" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setGroupModalTab('join');
                setModalError('');
                setShowGroupModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-slate-700 hover:border-mexico-green/50 bg-slate-900/10 hover:bg-mexico-green/5 rounded-xl text-xs font-bold text-slate-400 hover:text-emerald-400 transition-all duration-200 active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Unirse / Crear Sala</span>
            </button>
          </div>

          {/* Nav Items */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('matches')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === 'matches'
                  ? 'bg-gradient-to-r from-mexico-green/20 to-transparent border-l-4 border-mexico-green text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Calendar className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'matches' ? 'text-mexico-green' : ''}`} />
              <span>Calendario</span>
            </button>

            <button
              onClick={() => setActiveTab('standings')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === 'standings'
                  ? 'bg-gradient-to-r from-usa-blue/20 to-transparent border-l-4 border-usa-blue text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Trophy className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'standings' ? 'text-usa-blue-light' : ''}`} />
              <span>Clasificación</span>
            </button>

            <button
              onClick={() => setActiveTab('draft')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === 'draft'
                  ? 'bg-gradient-to-r from-canada-red/20 to-transparent border-l-4 border-canada-red text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Sparkles className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'draft' ? 'text-canada-red-light' : ''}`} />
              <span>Sala de Draft</span>
            </button>

            <button
              onClick={() => setActiveTab('simulador')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === 'simulador'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-transparent border-l-4 border-emerald-500 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Activity className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${activeTab === 'simulador' ? 'text-emerald-400' : ''}`} />
              <span>Simulador</span>
            </button>
          </nav>
        </div>


        {/* User Info & Logout */}
        <div className="border-t border-slate-800/80 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center font-bold text-slate-200 uppercase">
              {currentUser.name.slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{currentUser.name}</p>
              <p className="text-xs text-emerald-400 font-mono tracking-tight flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                DB Conectada
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800 hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto max-h-screen pb-24 md:pb-8">
        
        {/* Header (Mobile Logo & User Actions) */}
        <header className="flex md:hidden flex-col gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-mexico-green via-canada-red to-usa-blue flex items-center justify-center">
                <span className="font-display font-extrabold text-sm text-white">W</span>
              </div>
              <h1 className="font-display font-bold text-md">Mundial 2026</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center font-bold text-xs text-slate-200 uppercase shrink-0">
                {currentUser.name.slice(0, 2)}
              </div>
              <button 
                onClick={onLogout}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Selector de Grupo Móvil */}
          <div className="flex items-center justify-between gap-2 bg-slate-900/30 p-2 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">Grupo:</span>
            <select
              value={groupId}
              onChange={(e) => onGroupIdChange?.(e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-mexico-green rounded-lg py-1.5 px-2 text-xs text-slate-250 focus:outline-none cursor-pointer flex-1 text-right"
            >
              {userGroups.map(g => (
                <option key={g.id} value={g.id} className="bg-slate-900 text-slate-200">
                  {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setGroupModalTab('join');
                setModalError('');
                setShowGroupModal(true);
              }}
              className="p-1.5 rounded-lg border border-slate-850 hover:border-mexico-green/45 hover:bg-slate-800/40 text-slate-400 hover:text-emerald-400 shrink-0 transition-all active:scale-95"
              title="Unirse o crear sala"
            >
              <PlusCircle className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* TAB: MATCHES */}
        {activeTab === 'matches' && (
          <section className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Calendario de Partidos</h2>
              <p className="text-slate-400 text-sm">
                Guarda tus predicciones. Los partidos se bloquean automáticamente <strong className="text-amber-400">1 hora antes</strong> del pitido inicial.
              </p>
            </div>

            {/* Quick Stat Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tus Puntos</span>
                <span className="text-2xl font-bold font-display text-white mt-1">{myMemberInfo?.totalPoints || 0} pts</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plenos Exactos (+3)</span>
                <span className="text-2xl font-bold font-display text-mexico-green mt-1">{myMemberInfo?.exactScores || 0}</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tendencias (+1)</span>
                <span className="text-2xl font-bold font-display text-blue-400 mt-1">{myMemberInfo?.tendencies || 0}</span>
              </div>
              <div className="glass-panel p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Equipo Elegido</span>
                <span className="text-sm font-semibold text-slate-200 mt-1 truncate">{myMemberInfo?.selectedTeamName || "Ninguno"}</span>
              </div>
            </div>

            {/* Filtering Toolbar */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/10 flex flex-col gap-4 mt-2">
              {/* Phase Selector tabs */}
              <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
                <button
                  onClick={() => {
                    setMatchesPhaseFilter('groups');
                    setMatchesGroupFilter('all');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    matchesPhaseFilter === 'groups'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fase de Grupos
                </button>
                <button
                  disabled={!allGroupStageFinished}
                  onClick={() => {
                    setMatchesPhaseFilter('knockout');
                    setMatchesGroupFilter('all');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !allGroupStageFinished
                      ? 'opacity-40 cursor-not-allowed text-slate-550'
                      : matchesPhaseFilter === 'knockout'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={!allGroupStageFinished ? "Se desbloqueará al terminar la fase de grupos" : ""}
                >
                  {!allGroupStageFinished && <Lock className="h-3.5 w-3.5" />}
                  Fase Final (Eliminatorias)
                </button>
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar selección..."
                    value={matchesSearchQuery}
                    onChange={(e) => setMatchesSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-mexico-green rounded-xl py-2 pl-10 pr-4 text-slate-250 placeholder:text-slate-500 focus:outline-none text-xs transition-all duration-200"
                  />
                </div>

                {/* Prediction Status Filter */}
                <select
                  value={matchesPredictionFilter}
                  onChange={(e) => setMatchesPredictionFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 focus:border-mexico-green rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos los partidos</option>
                  <option value="pending">Pendientes de pronóstico</option>
                  <option value="live">Partidos en Vivo</option>
                  <option value="completed">Partidos Finalizados</option>
                </select>

                {/* Group Filter (Only if Phase is Groups) */}
                {matchesPhaseFilter === 'groups' ? (
                  <select
                    value={matchesGroupFilter}
                    onChange={(e) => setMatchesGroupFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 focus:border-mexico-green rounded-xl py-2.5 px-3.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos los grupos (A-L)</option>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                      <option key={g} value={g}>Grupo {g}</option>
                    ))}
                  </select>
                ) : (
                  <div className="bg-slate-900/20 border border-slate-800/40 rounded-xl py-2.5 px-3.5 text-xs text-slate-500 flex items-center justify-center font-medium select-none font-semibold">
                    Fase Final (Sin grupos)
                  </div>
                )}
              </div>
            </div>

            {/* Matches Grouped List */}
            {(() => {
              const matchesTeamName = (teamName: string, query: string) => {
                const q = query.toLowerCase().trim();
                if (!q) return true;
                if (teamName.toLowerCase().includes(q)) return true;
                const translations = COUNTRY_TRANSLATIONS[teamName] || [];
                return translations.some(t => t.toLowerCase().includes(q));
              };

              const filteredMatches = matches.filter(match => {
                const isKnockout = match.apiId >= 2026073;
                
                // Hide knockout stages from the main view entirely unless the group stage is completed
                if (isKnockout && !allGroupStageFinished) {
                  return false;
                }

                if (matchesPhaseFilter === 'groups' && isKnockout) return false;
                if (matchesPhaseFilter === 'knockout' && !isKnockout) return false;

                if (matchesPhaseFilter === 'groups' && matchesGroupFilter !== 'all') {
                  const groupIdx = matchesGroupFilter.charCodeAt(0) - 65;
                  const minId = 2026001 + groupIdx * 6;
                  const maxId = 2026006 + groupIdx * 6;
                  if (match.apiId < minId || match.apiId > maxId) return false;
                }

                if (matchesPredictionFilter === 'pending') {
                  const locked = isMatchLocked(match.kickoffTimestamp, match.status);
                  if (match.userPrediction !== null || locked) return false;
                } else if (matchesPredictionFilter === 'completed') {
                  if (match.status !== 'FT') return false;
                } else if (matchesPredictionFilter === 'live') {
                  if (match.status !== 'LIVE') return false;
                }

                if (matchesSearchQuery.trim() !== '') {
                  const homeMatch = matchesTeamName(match.homeTeam.name, matchesSearchQuery);
                  const awayMatch = matchesTeamName(match.awayTeam.name, matchesSearchQuery);
                  if (!homeMatch && !awayMatch) return false;
                }

                return true;
              });

              const groupedMatches: { [dateKey: string]: any[] } = {};
              filteredMatches.forEach(match => {
                const dateObj = new Date(match.kickoffTimestamp);
                const dateKey = new Intl.DateTimeFormat('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                }).format(dateObj);
                
                const capitalizedKey = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);
                if (!groupedMatches[capitalizedKey]) {
                  groupedMatches[capitalizedKey] = [];
                }
                groupedMatches[capitalizedKey].push(match);
              });

              const sortedDateKeys = Object.keys(groupedMatches).sort((a, b) => {
                const dateA = new Date(groupedMatches[a][0].kickoffTimestamp).getTime();
                const dateB = new Date(groupedMatches[b][0].kickoffTimestamp).getTime();
                return dateA - dateB;
              });

              if (sortedDateKeys.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-500 italic border border-dashed border-slate-800 rounded-2xl bg-slate-900/5 mt-4">
                    {matches.length === 0 
                      ? "No se encontraron partidos. Lanza el cron de sincronización para cargarlos." 
                      : "No se encontraron partidos para los filtros seleccionados."}
                  </div>
                );
              }

              return (
                <div className="space-y-8 mt-4">
                  {sortedDateKeys.map(dateKey => {
                    const dayMatches = groupedMatches[dateKey];
                    return (
                      <div key={dateKey} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-800/40 pb-2">
                          <Calendar className="h-4 w-4 text-emerald-450" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            {dateKey}
                          </h3>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/60 font-semibold font-mono">
                            {dayMatches.length} {dayMatches.length === 1 ? 'partido' : 'partidos'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          {dayMatches.map(match => {
                            const locked = isMatchLocked(match.kickoffTimestamp, match.status);
                            const timeStatus = getMatchTimeStatus(match.kickoffTimestamp, match.status);
                            const isLive = match.status === 'LIVE';

                            return (
                              <MatchCard 
                                key={match.apiId} 
                                match={match} 
                                locked={locked} 
                                timeStatus={timeStatus} 
                                isLive={isLive}
                                onSavePrediction={handleSavePrediction}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>
        )}

        {/* TAB: STANDINGS */}
        {activeTab === 'standings' && (
          <section className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Tabla de Posiciones</h2>
                <p className="text-slate-400 text-sm">Puntuaciones del grupo en tiempo real. ¡El liderato está reñido!</p>
              </div>
              
              <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border border-slate-700/60 max-w-fit">
                <Users className="h-5 w-5 text-mexico-green" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-200">Sala Activa</p>
                  <p className="text-slate-400 text-[10px]">Miembros: {members.length}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/60 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4 w-16 text-center">Pos</th>
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4 hidden md:table-cell">Elección Draft (Equipo)</th>
                      <th className="px-6 py-4 hidden lg:table-cell">Jugador Estrella (Draft)</th>
                      <th className="px-6 py-4 text-center">Exacto (+3)</th>
                      <th className="px-6 py-4 text-center">Ganador (+1)</th>
                      <th className="px-6 py-4 text-center hidden md:table-cell">Goles (+1)</th>
                      <th className="px-6 py-4 text-center text-slate-100 font-bold">Pts Totales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {members.map((member, index) => {
                      const isMe = member.userId === currentUser.id;
                      return (
                        <tr 
                          key={member.userId}
                          className={`transition-colors duration-150 ${
                            isMe 
                              ? 'bg-gradient-to-r from-usa-blue/10 via-slate-900/80 to-transparent font-medium border-l-4 border-usa-blue' 
                              : 'hover:bg-slate-900/20'
                          }`}
                        >
                          <td className="px-6 py-5 text-center font-display font-bold text-lg">
                            <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                              index === 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              index === 1 ? 'bg-slate-300/10 text-slate-300 border border-slate-300/20' :
                              index === 2 ? 'bg-amber-700/10 text-amber-600 border border-amber-700/20' :
                              'text-slate-400'
                            }`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-slate-800 border border-slate-705 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {member.name.slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold flex items-center gap-1.5 text-slate-100">
                                  {member.name}
                                  {isMe && <span className="text-[10px] bg-usa-blue/40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">Tú</span>}
                                </p>
                                <p className="text-[10px] text-slate-400 italic">Bota de Oro: {member.predictedTopScorerName || 'Pendiente'}</p>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-5 hidden md:table-cell text-sm">
                            {member.selectedTeamName ? (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={teams.find(t => t.apiId === member.selectedTeamId)?.flagUrl} 
                                  alt="Flag" 
                                  className="h-4 w-6 rounded-sm object-cover"
                                />
                                <span className="font-semibold text-slate-200">{member.selectedTeamName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs italic">No seleccionado</span>
                            )}
                          </td>

                          <td className="px-6 py-5 hidden lg:table-cell text-sm">
                            {member.selectedPlayerName ? (
                              <div className="flex items-center gap-2 text-slate-200">
                                <div className="h-6 w-6 rounded-full overflow-hidden border border-slate-700 shrink-0">
                                  <img 
                                    src={players.find(p => p.apiId === member.selectedPlayerId)?.photoUrl} 
                                    alt="Player" 
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <span className="font-semibold">{member.selectedPlayerName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs italic">No fichado</span>
                            )}
                          </td>

                          <td className="px-6 py-5 text-center font-display font-semibold text-slate-200">{member.exactScores}</td>
                          <td className="px-6 py-5 text-center font-display font-semibold text-slate-200">{member.tendencies}</td>
                          <td className="px-6 py-5 text-center font-display font-semibold text-slate-200 hidden md:table-cell">
                            {member.draftGoalsPoints > 0 ? (
                              <span className="text-emerald-400">+{member.draftGoalsPoints}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-center font-display font-extrabold text-xl text-emerald-400">{member.totalPoints} pts</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row gap-4 items-start">
              <div className="p-3 bg-usa-blue/10 border border-usa-blue/30 rounded-xl text-blue-400">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-200">Reglas del Sistema de Puntuación</h3>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                  <li><strong className="text-slate-200">+3 Puntos</strong> por acertar el marcador exacto de un partido.</li>
                  <li><strong className="text-slate-200">+1 Punto</strong> por acertar la tendencia (ganador o empate).</li>
                  <li><strong className="text-slate-200">+1 Punto</strong> por cada gol o asistencia real marcado por tus <strong>2 Jugadores Exclusivos</strong> (de selecciones distintas).</li>
                  <li><strong className="text-slate-200">+1 Punto Extra</strong> si tu equipo del Draft avanza de ronda.</li>
                  <li><strong className="text-slate-200">+3 Puntos</strong> por cada victoria real obtenida por tu <strong>Selección Gloriosa</strong>.</li>
                  <li><strong className="text-slate-200">+10 Puntos</strong> al final del torneo si aciertas la Bota de Oro.</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* TAB: DRAFT */}
        {activeTab === 'draft' && (
          <section className="flex-1 flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Sala del Draft Exclusivo</h2>
              <p className="text-slate-400 text-sm">
                Fichajes únicos por grupo. El equipo y jugador que selecciones serán <strong className="text-red-400">sólo tuyos</strong> en tu liga de amigos.
              </p>
            </div>

            {/* SECCIÓN 1: DRAFT DE EQUIPO */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-900/10 hover:border-slate-800/90 transition-all duration-300">
              <div 
                onClick={() => setIsDraftTeamOpen(!isDraftTeamOpen)}
                className={`flex items-center justify-between cursor-pointer select-none group transition-all duration-300 ${
                  isDraftTeamOpen ? 'border-b border-slate-800/40 pb-3' : 'pb-0'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 transition-all duration-300 ${isDraftTeamOpen ? 'scale-110' : 'scale-75'}`} />
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors duration-200">
                    1. Selección de Equipo Exclusivo
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {myMemberInfo?.selectedTeamName ? (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-semibold font-mono flex items-center gap-1.5 shadow-sm shadow-emerald-500/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Tu Selección: {myMemberInfo.selectedTeamName}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-wider">
                      Pendiente
                    </span>
                  )}
                  <motion.div
                    animate={{ rotate: isDraftTeamOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-200 transition-colors duration-200" />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isDraftTeamOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 20 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {teams.map(team => {
                        const isTaken = team.draftedBy !== null;
                        const isMine = team.draftedBy?.userId === currentUser.id;
                        const isTakenByOther = isTaken && !isMine;

                        return (
                          <button
                            key={team.apiId}
                            disabled={isTakenByOther}
                            onClick={() => handleSelectTeam(team.apiId)}
                            className={`glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
                              isMine 
                                ? 'border-2 border-emerald-500 bg-gradient-to-b from-emerald-950/10 to-slate-900/60 ring-2 ring-emerald-500/20' 
                                : isTakenByOther 
                                  ? 'opacity-40 grayscale cursor-not-allowed border-slate-850' 
                                  : 'hover:border-slate-600 hover:bg-slate-800/40 hover:-translate-y-1'
                            }`}
                          >
                            <img 
                              src={team.flagUrl} 
                              alt={team.name} 
                              className="h-10 w-16 object-cover rounded shadow-md"
                            />
                            <div className="text-center">
                              <p className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{team.name}</p>
                              {isMine && <p className="text-[10px] text-emerald-400 font-semibold mt-1">Elegido</p>}
                              {isTakenByOther && (
                                <p className="text-[9px] text-red-400 font-semibold mt-1 truncate max-w-[110px]">
                                  Por {team.draftedBy?.userName}
                                </p>
                              )}
                              {!isTaken && <p className="text-[10px] text-slate-500 mt-1">Disponible</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SECCIÓN 2: DRAFT DE JUGADOR */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-900/10 hover:border-slate-800/90 transition-all duration-300">
              <div 
                onClick={() => setIsDraftPlayersOpen(!isDraftPlayersOpen)}
                className={`flex items-center justify-between cursor-pointer select-none group transition-all duration-300 ${
                  isDraftPlayersOpen ? 'border-b border-slate-800/40 pb-3' : 'pb-0'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full bg-red-500 shadow-md shadow-red-500/50 transition-all duration-300 ${isDraftPlayersOpen ? 'scale-110' : 'scale-75'}`} />
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors duration-200">
                    2. Plantilla de Jugadores Exclusivos
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {(myMemberInfo?.selectedPlayerId || myMemberInfo?.selectedPlayer2Id) ? (
                    <span className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20 font-semibold font-mono flex items-center gap-1.5 shadow-sm shadow-red-500/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                      Fichados: {[myMemberInfo.selectedPlayerName, myMemberInfo.selectedPlayer2Name].filter(Boolean).join(" • ")}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-wider">
                      Sin Fichar
                    </span>
                  )}
                  <motion.div
                    animate={{ rotate: isDraftPlayersOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-200 transition-colors duration-200" />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isDraftPlayersOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 20 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left side: Search & List */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="relative">
                          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                          <input 
                            type="text"
                            placeholder="Buscar jugador por nombre o país..."
                            value={playerSearchQuery}
                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-800 focus:border-red-500 rounded-xl py-3 pl-12 pr-4 text-slate-100 placeholder:text-slate-550 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all duration-200 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-2">
                          {players
                            .filter(p => {
                              const query = playerSearchQuery.toLowerCase().trim();
                              if (!query) return true;
                              if (p.name.toLowerCase().includes(query)) return true;
                              if (p.teamName.toLowerCase().includes(query)) return true;
                              const translations = COUNTRY_TRANSLATIONS[p.teamName] || [];
                              if (translations.some(t => t.includes(query))) return true;
                              return false;
                            })
                            .map(player => {
                              const isTaken = player.draftedBy !== null;
                              const isMine = player.draftedBy?.userId === currentUser.id;
                              const isTakenByOther = isTaken && !isMine;

                              return (
                                <div 
                                  key={player.apiId}
                                  className={`glass-panel p-3 rounded-xl flex items-center justify-between gap-3 ${
                                    isMine ? 'border-red-500/50 bg-red-950/5' : ''
                                  } ${isTakenByOther ? 'opacity-50' : ''}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-700 shrink-0">
                                      <img src={player.photoUrl} alt={player.name} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="overflow-hidden">
                                      <h4 className="text-xs font-bold truncate max-w-[140px]">{player.name}</h4>
                                      <p className="text-[10px] text-slate-400">{player.teamName} • {player.position}</p>
                                    </div>
                                  </div>

                                  {isMine ? (
                                    <button 
                                      onClick={() => handleSelectPlayer(player.apiId)}
                                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-650/30 text-red-300 border border-red-500/40 hover:bg-red-600/50 transition-all duration-150 cursor-pointer"
                                    >
                                      Liberar
                                    </button>
                                  ) : isTakenByOther ? (
                                    <span className="text-[9px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 truncate max-w-[90px]">
                                      {player.draftedBy?.userName}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleSelectPlayer(player.apiId)}
                                      className="px-3 py-1 text-[10px] font-bold rounded-lg bg-white text-slate-950 hover:bg-slate-200 transition-all duration-150 shadow cursor-pointer"
                                    >
                                      Fichar
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Right side: Your Player Cards (Max 2, different selections) */}
                      <div className="lg:col-span-5 flex flex-col gap-4">
                        {/* Card 1 */}
                        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-4 bg-gradient-to-tr from-slate-950 via-slate-900/40 to-slate-950 relative overflow-hidden">
                          <div className="absolute top-0 right-0 h-24 w-24 bg-red-500/5 rounded-full blur-2xl" />
                          {myMemberInfo?.selectedPlayerId ? (
                            (() => {
                              const myPlayer = players.find(p => p.apiId === myMemberInfo.selectedPlayerId);
                              if (!myPlayer) return null;
                              return (
                                <div className="flex items-center justify-between w-full z-10 relative">
                                  <div className="flex items-center gap-3">
                                    <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-red-500/50 shadow-md shrink-0">
                                      <img src={myPlayer.photoUrl} alt={myPlayer.name} className="h-full w-full object-cover" />
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-semibold text-red-400 tracking-wide uppercase">{myPlayer.position} Exclusivo 1</p>
                                      <h4 className="text-sm font-bold text-slate-100 truncate max-w-[150px]">{myPlayer.name}</h4>
                                      <p className="text-xs text-slate-400">{myPlayer.teamName}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleSelectPlayer(myPlayer.apiId)}
                                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-650/20 text-red-300 border border-red-500/30 hover:bg-red-555/30 transition-all cursor-pointer shrink-0"
                                  >
                                    Liberar
                                  </button>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="flex items-center gap-3 py-2 text-left z-10 relative w-full">
                              <div className="h-12 w-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-650 shrink-0">
                                <User className="h-6 w-6" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-350">Jugador Exclusivo 1</h4>
                                <p className="text-[10px] text-slate-500 leading-tight">Busca y ficha tu primer jugador.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card 2 */}
                        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-4 bg-gradient-to-tr from-slate-950 via-slate-900/40 to-slate-950 relative overflow-hidden">
                          <div className="absolute top-0 right-0 h-24 w-24 bg-red-500/5 rounded-full blur-2xl" />
                          {myMemberInfo?.selectedPlayer2Id ? (
                            (() => {
                              const myPlayer = players.find(p => p.apiId === myMemberInfo.selectedPlayer2Id);
                              if (!myPlayer) return null;
                              return (
                                <div className="flex items-center justify-between w-full z-10 relative">
                                  <div className="flex items-center gap-3">
                                    <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-red-500/50 shadow-md shrink-0">
                                      <img src={myPlayer.photoUrl} alt={myPlayer.name} className="h-full w-full object-cover" />
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-semibold text-red-400 tracking-wide uppercase">{myPlayer.position} Exclusivo 2</p>
                                      <h4 className="text-sm font-bold text-slate-100 truncate max-w-[150px]">{myPlayer.name}</h4>
                                      <p className="text-xs text-slate-400">{myPlayer.teamName}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleSelectPlayer(myPlayer.apiId)}
                                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-650/20 text-red-300 border border-red-500/30 hover:bg-red-555/30 transition-all cursor-pointer shrink-0"
                                  >
                                    Liberar
                                  </button>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="flex items-center gap-3 py-2 text-left z-10 relative w-full">
                              <div className="h-12 w-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-650 shrink-0">
                                <User className="h-6 w-6" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-350">Jugador Exclusivo 2</h4>
                                <p className="text-[10px] text-slate-500 leading-tight">Ficha un segundo jugador de otra selección.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SECCIÓN 3: PREDICCIÓN BOTA DE ORO */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-900/10 hover:border-slate-800/90 transition-all duration-300 relative z-20">
              <div 
                onClick={() => setIsDraftScorerOpen(!isDraftScorerOpen)}
                className={`flex items-center justify-between cursor-pointer select-none group transition-all duration-300 ${
                  isDraftScorerOpen ? 'border-b border-slate-800/40 pb-3' : 'pb-0'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full bg-blue-500 shadow-md shadow-blue-500/50 transition-all duration-300 ${isDraftScorerOpen ? 'scale-110' : 'scale-75'}`} />
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors duration-200">
                    3. Predicción Máximo Goleador (Bota de Oro)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {myMemberInfo?.predictedTopScorerName ? (
                    <span className="text-xs bg-blue-500/10 text-blue-300 px-3 py-1 rounded-full border border-blue-500/20 font-semibold font-mono flex items-center gap-1.5 shadow-sm shadow-blue-500/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Predicción: {myMemberInfo.predictedTopScorerName}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-wider">
                      Pendiente
                    </span>
                  )}
                  <motion.div
                    animate={{ rotate: isDraftScorerOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-200 transition-colors duration-200" />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isDraftScorerOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0, overflow: 'hidden' }}
                    animate={{ height: "auto", opacity: 1, marginTop: 20, overflow: 'visible' }}
                    exit={{ height: 0, opacity: 0, marginTop: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-950/40">
                      <div className="max-w-xl space-y-4">
                        <p className="text-xs text-slate-400">
                          A diferencia del draft, <strong className="text-slate-200">esta selección NO es exclusiva</strong>. Varios usuarios pueden elegir al mismo jugador. Se bloquea globalmente <strong>1 hora antes</strong> del partido inaugural del torneo. Acertar al final del Mundial otorga <strong className="text-emerald-400 font-bold">+10 puntos extra</strong>.
                        </p>

                        <div className="relative">
                          <Search className="absolute left-4 top-3 h-4 w-4 text-slate-500" />
                          <input 
                            type="text"
                            placeholder="Seleccionar Goleador..."
                            value={selectedTopScorerQuery}
                            onChange={(e) => {
                              setSelectedTopScorerQuery(e.target.value);
                              setShowTopScorerResults(true);
                            }}
                            onFocus={() => setShowTopScorerResults(true)}
                            onBlur={() => setTimeout(() => setShowTopScorerResults(false), 150)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-slate-100 placeholder:text-slate-500 focus:outline-none text-xs"
                          />

                          {showTopScorerResults && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto">
                              {(() => {
                                const filtered = players.filter(p => {
                                  const query = selectedTopScorerQuery.toLowerCase().trim();
                                  if (!query) return true;
                                  if (p.name.toLowerCase().includes(query)) return true;
                                  if (p.teamName.toLowerCase().includes(query)) return true;
                                  const translations = COUNTRY_TRANSLATIONS[p.teamName] || [];
                                  if (translations.some(t => t.includes(query))) return true;
                                  return false;
                                });

                                if (filtered.length === 0) {
                                  return <p className="px-4 py-3 text-xs text-slate-500 italic">No se encontraron jugadores.</p>;
                                }

                                return filtered.map(player => (
                                  <button
                                    key={player.apiId}
                                    type="button"
                                    onMouseDown={() => handleSelectTopScorer(player)}
                                    className="w-full px-4 py-2.5 hover:bg-slate-800 flex items-center justify-between text-left text-xs transition-colors duration-150 border-b border-slate-800/50"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-200">{player.name}</p>
                                      <p className="text-[10px] text-slate-400">{player.teamName} • {player.position}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-500" />
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SECCIÓN 4: DRAFT DE SELECCIÓN GLORIOSA */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-900/10 hover:border-slate-800/90 transition-all duration-300">
              <div 
                onClick={() => setIsDraftGloriousOpen(!isDraftGloriousOpen)}
                className={`flex items-center justify-between cursor-pointer select-none group transition-all duration-300 ${
                  isDraftGloriousOpen ? 'border-b border-slate-800/40 pb-3' : 'pb-0'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full bg-blue-500 shadow-md shadow-blue-500/50 transition-all duration-300 ${isDraftGloriousOpen ? 'scale-110' : 'scale-75'}`} />
                  <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors duration-200">
                    4. Selección Gloriosa (Floja)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {myMemberInfo?.selectedWeakTeamName ? (
                    <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-semibold font-mono flex items-center gap-1.5 shadow-sm shadow-blue-500/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Tu Selección Gloriosa: {myMemberInfo.selectedWeakTeamName}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-wider">
                      Pendiente
                    </span>
                  )}
                  <motion.div
                    animate={{ rotate: isDraftGloriousOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-200 transition-colors duration-200" />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isDraftGloriousOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 20 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-slate-450 max-w-2xl leading-relaxed mb-4">
                      Elige una de las 10 selecciones más débiles del Mundial. Cada victoria real de este equipo sumará <strong className="text-emerald-450 font-bold">+3 puntos</strong> directos a tu quiniela. Fichaje exclusivo por grupo.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {(() => {
                        const WEAK_TEAMS_IDS = [2386, 5530, 4673, 1548, 1567, 1533, 1569, 23, 1568, 1531];
                        const weakTeams = teams.filter(t => WEAK_TEAMS_IDS.includes(t.apiId));
                        
                        return weakTeams.map(team => {
                          const isTaken = team.gloriousDraftedBy !== null;
                          const isMine = team.gloriousDraftedBy?.userId === currentUser.id;
                          const isTakenByOther = isTaken && !isMine;

                          return (
                            <button
                              key={team.apiId}
                              disabled={isTakenByOther}
                              onClick={() => handleSelectWeakTeam(team.apiId)}
                              className={`glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
                                isMine 
                                  ? 'border-2 border-blue-500 bg-gradient-to-b from-blue-950/10 to-slate-900/60 ring-2 ring-blue-500/20' 
                                  : isTakenByOther 
                                    ? 'opacity-40 grayscale cursor-not-allowed border-slate-850' 
                                    : 'hover:border-slate-650 hover:bg-slate-800/40 hover:-translate-y-1 cursor-pointer'
                              }`}
                            >
                              <img 
                                src={team.flagUrl} 
                                alt={team.name} 
                                className="h-10 w-16 object-cover rounded shadow-md border border-slate-800"
                              />
                              <div className="text-center">
                                <p className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{team.name}</p>
                                {isMine && <p className="text-[10px] text-blue-400 font-semibold mt-1">Tuya</p>}
                                {isTakenByOther && (
                                  <p className="text-[9px] text-red-400 font-semibold mt-1 truncate max-w-[110px]">
                                    Por {team.gloriousDraftedBy?.userName}
                                  </p>
                                )}
                                {!isTaken && <p className="text-[10px] text-slate-500 mt-1">Disponible</p>}
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </section>
        )}

        {/* TAB: SIMULADOR */}
        {activeTab === 'simulador' && (
          <section className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">Simulador del Mundial</h2>
                <p className="text-slate-400 text-sm">Proyecta la fase de grupos y las eliminatorias. La simulación ocurre en memoria local.</p>
              </div>
              <button
                onClick={handleResetSimulation}
                className="glass-panel px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-500/10 hover:text-red-400 border border-slate-700/50 flex items-center gap-2 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reiniciar Simulación</span>
              </button>
            </div>

            {!manualQualifiers.confirmed ? (
              <div className="flex flex-col gap-8 mt-4 animate-fade-in">
                {/* Header buttons */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-900/10">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-slate-200">Definir Selecciones Clasificadas</h3>
                    <p className="text-xs text-slate-400">Selecciona el 1º y 2º puesto de cada grupo, y los 8 mejores terceros para generar el cuadro eliminatorio.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleAutoFillQualifiers}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      <span>Cargar por Defecto / Posición Real</span>
                    </button>
                    <button
                      onClick={handleConfirmQualifiers}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-955 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/10"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Generar y Desbloquear Bracket</span>
                    </button>
                  </div>
                </div>

                {/* Grid of Groups */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(letter => {
                    const groupTeams = calculatedStandings[letter] || [];
                    return (
                      <div key={letter} className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-900/10 flex flex-col gap-4">
                        <h4 className="text-sm font-bold text-emerald-450 border-b border-slate-800 pb-2 flex items-center justify-between">
                          <span>Grupo {letter}</span>
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Posiciones</span>
                        </h4>

                        {/* Standings quick view if they have played */}
                        <div className="text-[11px] text-slate-400 space-y-1 mb-2">
                          {groupTeams.map((row, idx) => (
                            <div key={row.teamName} className="flex justify-between items-center py-0.5 px-1 rounded hover:bg-slate-800/20">
                              <span className="font-semibold text-slate-500 w-4">{idx + 1}º</span>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <img src={row.flagUrl} className="h-2.5 w-4 rounded-sm object-cover" />
                                <span className="truncate text-slate-300 font-medium">{row.teamName}</span>
                              </div>
                              <span className="text-slate-500 font-bold">{row.points} pts</span>
                            </div>
                          ))}
                        </div>

                        {/* Selectors */}
                        <div className="space-y-3.5 border-t border-slate-800/60 pt-3.5">
                          {/* 1st Place */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">1º Clasificado (Ganador)</label>
                            <select
                              disabled={manualQualifiers.confirmed}
                              value={manualQualifiers.firsts[letter] || ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                const firsts = { ...manualQualifiers.firsts, [letter]: val };
                                const seconds = { ...manualQualifiers.seconds };
                                if (seconds[letter] === val) seconds[letter] = null;
                                const thirds = { ...manualQualifiers.thirds };
                                if (thirds[letter] === val) thirds[letter] = null;
                                updateManualQualifiers({ ...manualQualifiers, firsts, seconds, thirds });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <option value="">-- Seleccionar --</option>
                              {groupTeams.map(t => (
                                <option key={t.apiId} value={t.apiId}>{t.teamName}</option>
                              ))}
                            </select>
                          </div>

                          {/* 2nd Place */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">2º Clasificado (Subcampeón)</label>
                            <select
                              disabled={manualQualifiers.confirmed}
                              value={manualQualifiers.seconds[letter] || ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                const firsts = { ...manualQualifiers.firsts };
                                if (firsts[letter] === val) firsts[letter] = null;
                                const seconds = { ...manualQualifiers.seconds, [letter]: val };
                                const thirds = { ...manualQualifiers.thirds };
                                if (thirds[letter] === val) thirds[letter] = null;
                                updateManualQualifiers({ ...manualQualifiers, firsts, seconds, thirds });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <option value="">-- Seleccionar --</option>
                              {groupTeams.map(t => (
                                <option
                                  key={t.apiId}
                                  value={t.apiId}
                                  disabled={manualQualifiers.firsts[letter] === t.apiId}
                                >
                                  {t.teamName} {manualQualifiers.firsts[letter] === t.apiId ? '(Elegido 1º)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 3rd Place */}
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">3º de Grupo (Elegible mejor tercero)</label>
                            <select
                              disabled={manualQualifiers.confirmed}
                              value={manualQualifiers.thirds[letter] || ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                                const firsts = { ...manualQualifiers.firsts };
                                if (firsts[letter] === val) firsts[letter] = null;
                                const seconds = { ...manualQualifiers.seconds };
                                if (seconds[letter] === val) seconds[letter] = null;
                                const thirds = { ...manualQualifiers.thirds, [letter]: val };
                                updateManualQualifiers({ ...manualQualifiers, firsts, seconds, thirds });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <option value="">-- Seleccionar --</option>
                              {groupTeams.map(t => (
                                <option
                                  key={t.apiId}
                                  value={t.apiId}
                                  disabled={manualQualifiers.firsts[letter] === t.apiId || manualQualifiers.seconds[letter] === t.apiId}
                                >
                                  {t.teamName} {manualQualifiers.firsts[letter] === t.apiId ? '(Elegido 1º)' : manualQualifiers.seconds[letter] === t.apiId ? '(Elegido 2º)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Best Thirds Selector Panel */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-slate-900/10 flex flex-col gap-4">
                  <div className="border-b border-slate-800 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-md font-bold text-slate-200 flex items-center gap-2">
                        <Award className="h-5 w-5 text-emerald-400" />
                        <span>Selección de los 8 Mejores Terceros</span>
                      </h4>
                      <p className="text-xs text-slate-400">Marca los 8 terceros lugares que avanzan a la Ronda de 32 del mundial (debes elegir exactamente 8).</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      manualQualifiers.bestThirdsGroupLetters.length === 8
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}>
                      Seleccionados: {manualQualifiers.bestThirdsGroupLetters.length} / 8
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4 mt-2">
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(letter => {
                      const thirdTeamId = manualQualifiers.thirds[letter];
                      const team = teams.find(t => t.apiId === thirdTeamId);
                      const isSelected = manualQualifiers.bestThirdsGroupLetters.includes(letter);
                      
                      if (!team) {
                        return (
                          <div key={letter} className="glass-panel p-3 rounded-xl border border-dashed border-slate-800/60 bg-slate-950/20 text-center opacity-50 flex flex-col justify-center items-center h-[90px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Grupo {letter}</span>
                            <span className="text-[10px] text-slate-600 italic mt-1">Sin 3º elegido</span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={letter}
                          disabled={manualQualifiers.confirmed}
                          onClick={() => {
                            let list = [...manualQualifiers.bestThirdsGroupLetters];
                            if (list.includes(letter)) {
                              list = list.filter(l => l !== letter);
                            } else {
                              list.push(letter);
                            }
                            updateManualQualifiers({ ...manualQualifiers, bestThirdsGroupLetters: list });
                          }}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col items-center justify-between text-center gap-2 h-[100px] hover:scale-[1.02] active:scale-[0.98] ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/5'
                              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700/60'
                          }`}
                        >
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            Grupo {letter}
                          </span>
                          <div className="flex items-center gap-1.5 max-w-full">
                            <img src={team.flagUrl} className="h-3 w-4.5 rounded-sm object-cover shrink-0" />
                            <span className="font-bold text-xs truncate max-w-[80px]">{team.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer confirm */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleConfirmQualifiers}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xl shadow-emerald-500/15"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Generar y Desbloquear Bracket</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 mt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800/80 bg-slate-900/10">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <p className="text-xs font-bold text-slate-350">Cuadro eliminatorio generado con tus clasificados personalizados.</p>
                  </div>
                  <button
                    onClick={handleModifyQualifiers}
                    className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-450 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>Modificar Clasificados</span>
                  </button>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-800/60 bg-slate-900/10 text-xs text-slate-400">
                  <p>⚠️ **Nota sobre empates**: En el cuadro eliminatorio los partidos no pueden terminar en empate. Si ingresas el mismo marcador, deberás seleccionar qué selección avanza haciendo clic en su botón correspondiente.</p>
                </div>

                {/* Bracket Columns Horizontal Scroll Container */}
                <div className="flex gap-8 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  
                  {/* Round of 32 */}
                  <div className="flex flex-col gap-6 min-w-[280px] shrink-0">
                    <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 uppercase tracking-wider text-center">Ronda de 32</h3>
                    <div className="space-y-4">
                      {matches.filter(m => m.apiId >= 2026073 && m.apiId <= 2026088).map(m => (
                        <BracketMatchCard
                          key={m.apiId}
                          match={m}
                          resolveTeam={resolveTeam}
                          simulatedScores={simulatedScores}
                          knockoutDrawWinners={knockoutDrawWinners}
                          updateSimulatedScore={updateSimulatedScore}
                          handleSelectTieWinner={handleSelectTieWinner}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Round of 16 */}
                  <div className="flex flex-col gap-6 min-w-[280px] shrink-0 justify-around">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 uppercase tracking-wider text-center">Octavos de Final</h3>
                      <div className="space-y-8 mt-6">
                        {matches.filter(m => m.apiId >= 2026089 && m.apiId <= 2026096).map(m => (
                          <BracketMatchCard
                            key={m.apiId}
                            match={m}
                            resolveTeam={resolveTeam}
                            simulatedScores={simulatedScores}
                            knockoutDrawWinners={knockoutDrawWinners}
                            updateSimulatedScore={updateSimulatedScore}
                            handleSelectTieWinner={handleSelectTieWinner}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quarter Finals */}
                  <div className="flex flex-col gap-6 min-w-[280px] shrink-0 justify-around">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 uppercase tracking-wider text-center">Cuartos de Final</h3>
                      <div className="space-y-16 mt-6">
                        {matches.filter(m => m.apiId >= 2026097 && m.apiId <= 2026100).map(m => (
                          <BracketMatchCard
                            key={m.apiId}
                            match={m}
                            resolveTeam={resolveTeam}
                            simulatedScores={simulatedScores}
                            knockoutDrawWinners={knockoutDrawWinners}
                            updateSimulatedScore={updateSimulatedScore}
                            handleSelectTieWinner={handleSelectTieWinner}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Semi Finals */}
                  <div className="flex flex-col gap-6 min-w-[280px] shrink-0 justify-around">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 uppercase tracking-wider text-center">Semifinales</h3>
                      <div className="space-y-32 mt-6">
                        {matches.filter(m => m.apiId >= 2026101 && m.apiId <= 2026102).map(m => (
                          <BracketMatchCard
                            key={m.apiId}
                            match={m}
                            resolveTeam={resolveTeam}
                            simulatedScores={simulatedScores}
                            knockoutDrawWinners={knockoutDrawWinners}
                            updateSimulatedScore={updateSimulatedScore}
                            handleSelectTieWinner={handleSelectTieWinner}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Finals Columns (Third Place & Final) */}
                  <div className="flex flex-col gap-6 min-w-[320px] shrink-0 justify-around">
                    <div className="space-y-12">
                      {/* Third place */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 border-b border-slate-800 pb-1.5 uppercase tracking-wider text-center">Tercer Puesto</h3>
                        <div className="mt-4">
                          {matches.filter(m => m.apiId === 2026103).map(m => (
                            <BracketMatchCard
                              key={m.apiId}
                              match={m}
                              resolveTeam={resolveTeam}
                              simulatedScores={simulatedScores}
                              knockoutDrawWinners={knockoutDrawWinners}
                              updateSimulatedScore={updateSimulatedScore}
                              handleSelectTieWinner={handleSelectTieWinner}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Final */}
                      <div>
                        <h3 className="text-sm font-black text-amber-400 border-b border-amber-500/20 pb-2 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                          <Trophy className="h-4 w-4" />
                          <span>Gran Final</span>
                        </h3>
                        <div className="mt-4 bg-gradient-to-tr from-slate-950 via-slate-900/60 to-slate-950 p-2.5 rounded-2xl border-2 border-amber-500/20 shadow-xl shadow-amber-500/5">
                          {matches.filter(m => m.apiId === 2026104).map(m => (
                            <BracketMatchCard
                              key={m.apiId}
                              match={m}
                              resolveTeam={resolveTeam}
                              simulatedScores={simulatedScores}
                              knockoutDrawWinners={knockoutDrawWinners}
                              updateSimulatedScore={updateSimulatedScore}
                              handleSelectTieWinner={handleSelectTieWinner}
                            />
                          ))}
                        </div>

                        {/* Project World Champion */}
                        {(() => {
                          const champion = resolveTeam('W104');
                          if (champion) {
                            return (
                              <div className="mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center flex flex-col items-center justify-center gap-2 animate-bounce">
                                <Trophy className="h-8 w-8 text-amber-400" />
                                <div>
                                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Campeón del Mundo Proyectado</p>
                                  <h4 className="text-md font-bold text-white mt-1">{champion.name}</h4>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </section>
        )}

      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-lg border-t border-slate-850 z-40 flex items-center justify-around py-3 px-4 shadow-black/80 shadow-2xl">
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex flex-col items-center gap-1 text-center transition-all ${
            activeTab === 'matches' ? 'text-emerald-500' : 'text-slate-400'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Partidos</span>
        </button>

        <button
          onClick={() => setActiveTab('standings')}
          className={`flex flex-col items-center gap-1 text-center transition-all ${
            activeTab === 'standings' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Trophy className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Tabla</span>
        </button>

        <button
          onClick={() => setActiveTab('draft')}
          className={`flex flex-col items-center gap-1 text-center transition-all ${
            activeTab === 'draft' ? 'text-red-400' : 'text-slate-400'
          }`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Draft</span>
        </button>

        <button
          onClick={() => setActiveTab('simulador')}
          className={`flex flex-col items-center gap-1 text-center transition-all ${
            activeTab === 'simulador' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Activity className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Simular</span>
        </button>
      </nav>

      {/* Modal para Unirse / Crear Sala */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden bg-slate-900/95 animate-fadeIn">
            {/* Background glowing gradients */}
            <div className="absolute -top-20 -right-20 h-40 w-40 bg-mexico-green/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 bg-usa-blue/10 rounded-full blur-3xl" />

            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800/60 z-10 relative">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Gestión de Salas</h3>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setModalError('');
                }}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800/60 pb-3 mb-5 z-10 relative">
              <button
                onClick={() => {
                  setGroupModalTab('join');
                  setModalError('');
                }}
                className={`flex-1 text-center pb-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  groupModalTab === 'join'
                    ? 'text-emerald-450 border-b-2 border-mexico-green'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                Unirse a Sala
              </button>
              <button
                onClick={() => {
                  setGroupModalTab('create');
                  setModalError('');
                }}
                className={`flex-1 text-center pb-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  groupModalTab === 'create'
                    ? 'text-emerald-450 border-b-2 border-mexico-green'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                Crear Sala
              </button>
            </div>

            {/* Error banner inside modal */}
            {modalError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-550/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-red-400 rounded-full shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {groupModalTab === 'join' ? (
              <form onSubmit={handleModalJoinGroup} className="space-y-4 z-10 relative">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Código de Invitación</label>
                  <input
                    type="text"
                    required
                    placeholder="MUNDIAL-XXXX"
                    value={modalInviteCode}
                    onChange={(e) => setModalInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-mexico-green rounded-xl py-2 px-3 text-slate-100 placeholder:text-slate-650 focus:outline-none text-xs transition-all duration-200 font-mono tracking-widest uppercase"
                    disabled={modalLoading}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Contraseña (si aplica)</label>
                  <input
                    type="password"
                    placeholder="Contraseña de la sala"
                    value={modalGroupPassword}
                    onChange={(e) => setModalGroupPassword(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-mexico-green rounded-xl py-2 px-3 text-slate-100 placeholder:text-slate-650 focus:outline-none text-xs transition-all duration-200"
                    disabled={modalLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full bg-gradient-to-r from-mexico-green to-emerald-600 hover:brightness-110 active:scale-[0.98] transition-all text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
                >
                  {modalLoading ? 'Uniéndose...' : 'Unirse al Grupo'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleModalCreateGroup} className="space-y-4 z-10 relative">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Nombre del Grupo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Quiniela Mundialista"
                    value={modalGroupName}
                    onChange={(e) => setModalGroupName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-mexico-green rounded-xl py-2 px-3 text-slate-100 placeholder:text-slate-650 focus:outline-none text-xs transition-all duration-200"
                    disabled={modalLoading}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Contraseña (Opcional)</label>
                  <input
                    type="password"
                    placeholder="Contraseña opcional"
                    value={modalGroupPassword}
                    onChange={(e) => setModalGroupPassword(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-mexico-green rounded-xl py-2 px-3 text-slate-100 placeholder:text-slate-650 focus:outline-none text-xs transition-all duration-200"
                    disabled={modalLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full bg-gradient-to-r from-mexico-green to-emerald-600 hover:brightness-110 active:scale-[0.98] transition-all text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
                >
                  {modalLoading ? 'Creando...' : 'Crear Grupo'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Bracket Match Card Subcomponent
interface BracketMatchCardProps {
  match: any;
  resolveTeam: (name: string) => { name: string; flagUrl: string; apiId: number } | null;
  simulatedScores: { [matchId: number]: { homeGoals: number | null; awayGoals: number | null } };
  knockoutDrawWinners: { [matchId: number]: number };
  updateSimulatedScore: (matchId: number, side: 'home' | 'away', val: string) => void;
  handleSelectTieWinner: (matchId: number, teamApiId: number) => void;
}

function BracketMatchCard({
  match,
  resolveTeam,
  simulatedScores,
  knockoutDrawWinners,
  updateSimulatedScore,
  handleSelectTieWinner
}: BracketMatchCardProps) {
  const homeTeam = resolveTeam(match.homeTeam.name);
  const awayTeam = resolveTeam(match.awayTeam.name);
  
  const isRealScore = match.status === 'FT' || match.status === 'LIVE';
  const hg = isRealScore ? match.homeGoals : (simulatedScores[match.apiId]?.homeGoals ?? null);
  const ag = isRealScore ? match.awayGoals : (simulatedScores[match.apiId]?.awayGoals ?? null);
  const chosenWinnerId = knockoutDrawWinners[match.apiId];

  return (
    <div className="glass-panel p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:border-slate-700/80 transition-all flex flex-col gap-2">
      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
        <span>Partido {match.apiId - 2026000}</span>
        <span>{match.apiId >= 2026104 ? 'Final' : match.apiId === 2026103 ? 'Tercer Puesto' : match.apiId >= 2026101 ? 'Semifinal' : match.apiId >= 2026097 ? 'Cuartos' : match.apiId >= 2026089 ? 'Octavos' : 'Ronda de 32'}</span>
      </div>

      <div className="space-y-2">
        {/* Home Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 max-w-[70%]">
            {homeTeam ? (
              <>
                <img src={homeTeam.flagUrl} alt="" className="h-3 w-4.5 rounded-sm object-cover shrink-0" />
                <span className={`font-semibold text-slate-200 truncate ${hg !== null && ag !== null && hg > ag ? 'text-emerald-400 font-bold' : ''}`}>
                  {homeTeam.name}
                </span>
              </>
            ) : (
              <span className="text-slate-500 italic truncate">{match.homeTeam.name}</span>
            )}
          </div>
          <select
            disabled={!homeTeam || !awayTeam || isRealScore}
            value={hg !== null ? String(hg) : ''}
            onChange={(e) => updateSimulatedScore(match.apiId, 'home', e.target.value)}
            className="w-8 h-8 text-center bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-100 font-extrabold text-xs focus:outline-none cursor-pointer appearance-none pl-2.5 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ textAlignLast: 'center' }}
          >
            <option value="" className="text-slate-500">-</option>
            {Array.from({ length: 21 }, (_, i) => (
              <option key={i} value={String(i)} className="bg-slate-900 text-slate-100">
                {i}
              </option>
            ))}
          </select>
        </div>

        {/* Away Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 max-w-[70%]">
            {awayTeam ? (
              <>
                <img src={awayTeam.flagUrl} alt="" className="h-3 w-4.5 rounded-sm object-cover shrink-0" />
                <span className={`font-semibold text-slate-200 truncate ${hg !== null && ag !== null && ag > hg ? 'text-emerald-400 font-bold' : ''}`}>
                  {awayTeam.name}
                </span>
              </>
            ) : (
              <span className="text-slate-500 italic truncate">{match.awayTeam.name}</span>
            )}
          </div>
          <select
            disabled={!homeTeam || !awayTeam || isRealScore}
            value={ag !== null ? String(ag) : ''}
            onChange={(e) => updateSimulatedScore(match.apiId, 'away', e.target.value)}
            className="w-8 h-8 text-center bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-100 font-extrabold text-xs focus:outline-none cursor-pointer appearance-none pl-2.5 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ textAlignLast: 'center' }}
          >
            <option value="" className="text-slate-500">-</option>
            {Array.from({ length: 21 }, (_, i) => (
              <option key={i} value={String(i)} className="bg-slate-900 text-slate-100">
                {i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tie Resolution (Only if both scores entered and equal) */}
      {homeTeam && awayTeam && hg !== null && ag !== null && hg === ag && (
        <div className="flex flex-col gap-1 border-t border-slate-800/60 pt-2 mt-1">
          <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider text-center">Empate: ¿Quién clasifica?</p>
          <div className="flex gap-1.5 justify-center">
            <button
              onClick={() => handleSelectTieWinner(match.apiId, homeTeam.apiId)}
              className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition-all truncate max-w-[110px] ${
                chosenWinnerId === homeTeam.apiId
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-905 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              {homeTeam.name}
            </button>
            <button
              onClick={() => handleSelectTieWinner(match.apiId, awayTeam.apiId)}
              className={`px-2 py-1 text-[9px] font-bold rounded-lg border transition-all truncate max-w-[110px] ${
                chosenWinnerId === awayTeam.apiId
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-905 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              {awayTeam.name}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// MatchCard subcomponent connected with individual inputs
interface MatchCardProps {
  match: any;
  locked: boolean;
  timeStatus: { text: string; style: string };
  isLive: boolean;
  onSavePrediction: (matchId: number, home: number | null, away: number | null) => void;
}

function MatchCard({ match, locked, timeStatus, isLive, onSavePrediction }: MatchCardProps) {
  const [homeInput, setHomeInput] = useState<string>(
    match.userPrediction?.homeGoals !== null && match.userPrediction?.homeGoals !== undefined
      ? String(match.userPrediction.homeGoals)
      : ''
  );
  
  const [awayInput, setAwayInput] = useState<string>(
    match.userPrediction?.awayGoals !== null && match.userPrediction?.awayGoals !== undefined
      ? String(match.userPrediction.awayGoals)
      : ''
  );

  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    const savedHome = match.userPrediction?.homeGoals;
    const savedAway = match.userPrediction?.awayGoals;
    
    const currentHome = homeInput === '' ? null : Number(homeInput);
    const currentAway = awayInput === '' ? null : Number(awayInput);

    setIsModified(currentHome !== savedHome || currentAway !== savedAway);
  }, [homeInput, awayInput, match.userPrediction]);

  const handleSave = () => {
    if (homeInput === '' || awayInput === '') return;
    onSavePrediction(match.apiId, Number(homeInput), Number(awayInput));
  };

  return (
    <div className={`glass-panel p-5 rounded-2xl transition-all duration-305 flex flex-col justify-between gap-4 border relative overflow-hidden ${
      isLive ? 'border-red-500/20 shadow-red-500/5 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-red-950/10' : 'border-slate-800/80'
    }`}>
      {/* Top Banner */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/40">
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${timeStatus.style}`}>
          {timeStatus.text}
        </span>
        <div className="text-slate-400 flex items-center gap-1 font-semibold">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <span>
            {new Intl.DateTimeFormat('es-ES', { 
              timeZone: 'Europe/Madrid', 
              dateStyle: 'short', 
              timeStyle: 'short' 
            }).format(new Date(match.kickoffTimestamp))}
          </span>
        </div>
      </div>

      {/* Versus Display */}
      <div className="grid grid-cols-7 items-center justify-center py-2">
        {/* Home */}
        <div className="col-span-3 flex flex-col items-center gap-2 text-center">
          <img 
            src={match.homeTeam.flagUrl} 
            alt={match.homeTeam.name} 
            className="h-10 w-14 object-cover rounded shadow-md border border-slate-800"
          />
          <span className="text-xs font-bold text-slate-200 truncate max-w-[100px] sm:max-w-full">
            {match.homeTeam.name}
          </span>
        </div>

        {/* Score/VS */}
        <div className="col-span-1 flex flex-col items-center justify-center">
          {match.status === 'FT' || match.status === 'LIVE' ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700/60">
                <motion.span
                  key={`home-${match.homeGoals ?? 0}`}
                  initial={{ scale: 1 }}
                  animate={{ 
                    scale: [1, 1.4, 1],
                    color: ["#ffffff", "#10b981", "#ffffff"],
                    textShadow: [
                      "0px 0px 0px rgba(16, 185, 129, 0)",
                      "0px 0px 8px rgba(16, 185, 129, 0.6)",
                      "0px 0px 0px rgba(16, 185, 129, 0)"
                    ]
                  }}
                  transition={{ duration: 0.8 }}
                  className="score-font text-2xl font-black text-white"
                >
                  {match.homeGoals ?? 0}
                </motion.span>
                <span className="score-font text-2xl font-black text-slate-500">-</span>
                <motion.span
                  key={`away-${match.awayGoals ?? 0}`}
                  initial={{ scale: 1 }}
                  animate={{ 
                    scale: [1, 1.4, 1],
                    color: ["#ffffff", "#10b981", "#ffffff"],
                    textShadow: [
                      "0px 0px 0px rgba(16, 185, 129, 0)",
                      "0px 0px 8px rgba(16, 185, 129, 0.6)",
                      "0px 0px 0px rgba(16, 185, 129, 0)"
                    ]
                  }}
                  transition={{ duration: 0.8 }}
                  className="score-font text-2xl font-black text-white"
                >
                  {match.awayGoals ?? 0}
                </motion.span>
              </div>
              {isLive && (
                <span className="text-[8px] text-red-500 font-extrabold uppercase mt-1 tracking-widest flex items-center gap-1">
                  <span className="live-dot" />
                  Live
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">VS</span>
          )}
        </div>

        {/* Away */}
        <div className="col-span-3 flex flex-col items-center gap-2 text-center">
          <img 
            src={match.awayTeam.flagUrl} 
            alt={match.awayTeam.name} 
            className="h-10 w-14 object-cover rounded shadow-md border border-slate-800"
          />
          <span className="text-xs font-bold text-slate-200 truncate max-w-[100px] sm:max-w-full">
            {match.awayTeam.name}
          </span>
        </div>
      </div>

      {/* Prediction Forms */}
      <div className="mt-2 pt-3 border-t border-slate-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-800/40">
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Tu Pronóstico</p>
          {match.userPrediction ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              {locked ? <Lock className="h-3 w-3 text-slate-500" /> : <Unlock className="h-3 w-3 text-emerald-450" />}
              <span>
                Pronóstico: <strong>{match.userPrediction.homeGoals} - {match.userPrediction.awayGoals}</strong>
              </span>
              {match.status === 'FT' && (() => {
                const home = match.homeGoals ?? 0;
                const away = match.awayGoals ?? 0;
                const predHome = match.userPrediction?.homeGoals ?? 0;
                const predAway = match.userPrediction?.awayGoals ?? 0;
                
                if (home === predHome && away === predAway) {
                  return <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold ml-1">Exacto (+3 pts)</span>;
                }
                const actualDiff = home - away;
                const predDiff = predHome - predAway;
                if ((actualDiff > 0 && predDiff > 0) || (actualDiff < 0 && predDiff < 0) || (actualDiff === 0 && predDiff === 0)) {
                  return <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold ml-1">Ganador (+1 pt)</span>;
                }
                return <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 font-bold ml-1">0 pts</span>;
              })()}
            </div>
          ) : (
            <span className="text-[11px] text-slate-550 italic flex items-center gap-1">
              <Unlock className="h-3 w-3 text-slate-600" />
              Sin predicción guardada
            </span>
          )}
        </div>

        {/* Inputs */}
        <div className="flex items-center gap-2">
          <select
            disabled={locked}
            value={homeInput}
            onChange={(e) => setHomeInput(e.target.value)}
            className="w-12 h-9 text-center bg-slate-950 border border-slate-805 focus:border-emerald-500 rounded-xl text-slate-100 font-extrabold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed appearance-none cursor-pointer flex items-center justify-center pl-3"
            style={{ textAlignLast: 'center' }}
          >
            <option value="" className="text-slate-500">-</option>
            {Array.from({ length: 21 }, (_, i) => (
              <option key={i} value={String(i)} className="bg-slate-950 text-slate-100">
                {i}
              </option>
            ))}
          </select>
          <span className="text-slate-500 text-xs font-bold">-</span>
          <select
            disabled={locked}
            value={awayInput}
            onChange={(e) => setAwayInput(e.target.value)}
            className="w-12 h-9 text-center bg-slate-950 border border-slate-805 focus:border-emerald-500 rounded-xl text-slate-100 font-extrabold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed appearance-none cursor-pointer flex items-center justify-center pl-3"
            style={{ textAlignLast: 'center' }}
          >
            <option value="" className="text-slate-500">-</option>
            {Array.from({ length: 21 }, (_, i) => (
              <option key={i} value={String(i)} className="bg-slate-950 text-slate-100">
                {i}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleSave}
            disabled={locked || !isModified || homeInput === '' || awayInput === ''}
            className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              locked 
                ? 'hidden' 
                : isModified && homeInput !== '' && awayInput !== ''
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-650 text-white shadow-md shadow-emerald-550/10 cursor-pointer hover:brightness-110 active:scale-95' 
                  : 'bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            <span>Guardar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
