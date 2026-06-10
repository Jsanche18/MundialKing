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
  UserCheck,
  Activity,
  RotateCcw
} from 'lucide-react';
import useSWR from 'swr';
import { motion } from 'framer-motion';

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
  const [simActiveSubTab, setSimActiveSubTab] = useState<'groups' | 'bracket'>('groups');
  
  // Notification banner state
  const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  // Draft section states
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [selectedTopScorerQuery, setSelectedTopScorerQuery] = useState('');
  const [showTopScorerResults, setShowTopScorerResults] = useState(false);

  // Time-lock checking (current simulated local time: 2026-06-10T08:12:28Z)
  const simulatedNow = new Date("2026-06-10T08:12:28Z").getTime();

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
    if (savedSimScores) {
      setSimulatedScores(JSON.parse(savedSimScores));
    }
    if (savedDrawWinners) {
      setKnockoutDrawWinners(JSON.parse(savedDrawWinners));
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

  const handleResetSimulation = () => {
    setSimulatedScores({});
    setKnockoutDrawWinners({});
    localStorage.removeItem('wc_sim_scores');
    localStorage.removeItem('wc_sim_draw_winners');
    setNotification({ message: 'Simulación reiniciada con éxito.', type: 'success' });
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
        const score = simulatedScores[m.apiId];
        if (score && score.homeGoals !== null && score.awayGoals !== null) {
          const hg = score.homeGoals;
          const ag = score.awayGoals;
          
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
      
      const simScore = simulatedScores[prevMatchId];
      if (!simScore || simScore.homeGoals === null || simScore.awayGoals === null) {
        return null;
      }
      
      const hg = simScore.homeGoals;
      const ag = simScore.awayGoals;
      
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
      const groupStandings = calculatedStandings[groupLetter];
      if (!groupStandings || groupStandings.length === 0) return null;
      
      const standingRow = groupStandings[rank - 1];
      if (!standingRow) return null;
      
      return { name: standingRow.teamName, flagUrl: standingRow.flagUrl, apiId: standingRow.apiId };
    }
    
    if (name.startsWith('3')) {
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
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">Cargando base de datos real...</p>
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
          <div className="mb-6 bg-slate-900/30 p-3 rounded-2xl border border-slate-800/60">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 block mb-1.5">Grupo Activo</label>
            <select
              value={groupId}
              onChange={(e) => onGroupIdChange?.(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 focus:border-mexico-green rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none transition-all duration-200 cursor-pointer"
            >
              {userGroups.map(g => (
                <option key={g.id} value={g.id} className="bg-slate-955 text-slate-200">
                  {g.name}
                </option>
              ))}
            </select>
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
          <div className="flex items-center justify-between gap-3 bg-slate-900/30 p-2.5 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">Grupo:</span>
            <select
              value={groupId}
              onChange={(e) => onGroupIdChange?.(e.target.value)}
              className="bg-slate-955 border border-slate-800 focus:border-mexico-green rounded-lg py-1.5 px-2.5 text-xs text-slate-250 focus:outline-none cursor-pointer flex-1 text-right"
            >
              {userGroups.map(g => (
                <option key={g.id} value={g.id} className="bg-slate-955 text-slate-200">
                  {g.name}
                </option>
              ))}
            </select>
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

            {/* Matches Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
              {matches.map(match => {
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
              {matches.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500 italic">
                  No se encontraron partidos. Lanza el cron de sincronización para cargarlos.
                </div>
              )}
            </div>
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
                  <li><strong className="text-slate-200">+1 Punto</strong> por cada gol o asistencia real marcado por tu <strong>Jugador Estrella</strong> del Draft.</li>
                  <li><strong className="text-slate-200">+1 Punto Extra</strong> si tu equipo del Draft avanza de ronda.</li>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  1. Selección de Equipo Exclusivo
                </h3>
                {myMemberInfo?.selectedTeamName && (
                  <span className="text-xs bg-emerald-550/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30 font-semibold">
                    Tu Selección: {myMemberInfo.selectedTeamName}
                  </span>
                )}
              </div>

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
            </div>

            {/* SECCIÓN 2: DRAFT DE JUGADOR */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  2. Plantilla de Jugador Exclusivo
                </h3>
                {myMemberInfo?.selectedPlayerName && (
                  <span className="text-xs bg-red-950/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30 font-semibold">
                    Fichado: {myMemberInfo.selectedPlayerName}
                  </span>
                )}
              </div>

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
                        
                        // Nombre
                        if (p.name.toLowerCase().includes(query)) return true;
                        
                        // País en inglés
                        if (p.teamName.toLowerCase().includes(query)) return true;
                        
                        // País en español
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
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-650/30 text-red-300 border border-red-500/40 hover:bg-red-600/50 transition-all duration-150"
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
                                className="px-3 py-1 text-[10px] font-bold rounded-lg bg-white text-slate-950 hover:bg-slate-200 transition-all duration-150 shadow"
                              >
                                Fichar
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Right side: Your Player Card */}
                <div className="lg:col-span-5">
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center text-center h-full min-h-[250px] relative overflow-hidden bg-gradient-to-tr from-slate-950 via-slate-900/60 to-slate-950">
                    <div className="absolute top-0 right-0 h-40 w-40 bg-red-500/5 rounded-full blur-3xl" />
                    
                    {myMemberInfo?.selectedPlayerId ? (
                      (() => {
                        const myPlayer = players.find(p => p.apiId === myMemberInfo.selectedPlayerId);
                        if (!myPlayer) return null;
                        return (
                          <div className="space-y-4 animate-fade-in w-full">
                            <div className="relative inline-block">
                              <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-red-550 shadow-xl mx-auto">
                                <img src={myPlayer.photoUrl} alt={myPlayer.name} className="h-full w-full object-cover" />
                              </div>
                              <span className="absolute bottom-0 right-1 bg-red-600 text-white p-1.5 rounded-full text-xs shadow-lg">
                                <UserCheck className="h-3 w-3" />
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-red-400 tracking-wide uppercase">{myPlayer.position}</p>
                              <h4 className="text-xl font-bold font-display">{myPlayer.name}</h4>
                              <p className="text-sm text-slate-300 font-medium">{myPlayer.teamName}</p>
                            </div>
                            <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                              Cada gol o asistencia oficial que marque sumará <strong className="text-emerald-400">+1 punto</strong> directo a tu marcador.
                            </p>
                            <button
                              onClick={() => handleSelectPlayer(myPlayer.apiId)}
                              className="px-4 py-1.5 text-xs text-slate-400 hover:text-red-400 font-semibold border border-slate-800 hover:border-red-500/20 hover:bg-red-500/5 rounded-xl transition-all duration-200"
                            >
                              Cambiar Fichaje
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="space-y-3 p-4">
                        <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-600 mx-auto">
                          <User className="h-8 w-8" />
                        </div>
                        <h4 className="font-bold text-slate-300 text-sm">Sin Jugador Seleccionado</h4>
                        <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
                          Busca un jugador en el buscador de la izquierda y haz clic en "Fichar" para reclamarlo en exclusiva.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* SECCIÓN 3: PREDICCIÓN BOTA DE ORO */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  3. Predicción Máximo Goleador (Bota de Oro)
                </h3>
                {myMemberInfo?.predictedTopScorerName && (
                  <span className="text-xs bg-blue-950/20 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30 font-semibold">
                    Predicción: {myMemberInfo.predictedTopScorerName}
                  </span>
                )}
              </div>

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
                              onClick={() => handleSelectTopScorer(player)}
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

            {/* Sub-navigation */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setSimActiveSubTab('groups')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  simActiveSubTab === 'groups'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Fase de Grupos
              </button>
              <button
                onClick={() => setSimActiveSubTab('bracket')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  simActiveSubTab === 'bracket'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Cuadro Eliminatorio (Bracket)
              </button>
            </div>

            {/* SUBTAB: GROUPS */}
            {simActiveSubTab === 'groups' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((letter, groupIdx) => {
                  const groupMatches = matches.filter(m => m.apiId >= 2026001 + groupIdx * 6 && m.apiId <= 2026006 + groupIdx * 6);
                  const groupStandings = calculatedStandings[letter] || [];
                  
                  return (
                    <div key={letter} className="glass-panel p-5 rounded-2xl border border-slate-800/80 bg-slate-900/10 flex flex-col gap-4">
                      <h3 className="text-md font-bold text-slate-200 border-b border-slate-800/60 pb-2 flex items-center justify-between">
                        <span>Grupo {letter}</span>
                        <span className="text-xs text-slate-500 font-normal">6 partidos</span>
                      </h3>

                      {/* Standings Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                              <th className="py-2 w-8 text-center">Pos</th>
                              <th className="py-2">Equipo</th>
                              <th className="py-2 text-center w-10">P</th>
                              <th className="py-2 text-center w-12">DG</th>
                              <th className="py-2 text-center w-12 font-bold text-slate-200">PTS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {groupStandings.map((row, idx) => {
                              const isQualifying = idx < 2; // Top 2
                              const isThird = idx === 2; // 3rd
                              
                              return (
                                <tr key={row.teamName} className="hover:bg-slate-800/10">
                                  <td className="py-2.5 text-center font-bold">
                                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full ${
                                      isQualifying ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      isThird ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                      'text-slate-500'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="py-2.5">
                                    <div className="flex items-center gap-2">
                                      <img src={row.flagUrl} alt="" className="h-3 w-4.5 rounded-sm object-cover" />
                                      <span className="font-semibold text-slate-200 truncate max-w-[120px]">{row.teamName}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 text-center text-slate-400">{row.played}</td>
                                  <td className={`py-2.5 text-center font-medium ${row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                                  </td>
                                  <td className="py-2.5 text-center font-bold text-slate-100">{row.points}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Matches Input List */}
                      <div className="space-y-3 mt-2 border-t border-slate-800/40 pt-4">
                        {groupMatches.map(m => {
                          const score = simulatedScores[m.apiId] || { homeGoals: null, awayGoals: null };
                          return (
                            <div key={m.apiId} className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-900/30 rounded-xl border border-slate-800/60 hover:bg-slate-900/50 transition-colors">
                              {/* Home */}
                              <div className="flex items-center gap-2 w-[40%]">
                                <img src={m.homeTeam.flagUrl} className="h-3 w-4.5 rounded-sm object-cover shrink-0" />
                                <span className="font-semibold text-slate-350 truncate">{m.homeTeam.name}</span>
                              </div>
                              {/* Inputs */}
                              <div className="flex items-center gap-1.5 justify-center w-[20%]">
                                <input
                                  type="number"
                                  min="0"
                                  max="9"
                                  placeholder="-"
                                  value={score.homeGoals !== null ? score.homeGoals : ''}
                                  onChange={(e) => updateSimulatedScore(m.apiId, 'home', e.target.value.slice(0, 1))}
                                  className="w-7 h-7 text-center bg-slate-950 border border-slate-800 rounded text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-slate-600 font-bold">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="9"
                                  placeholder="-"
                                  value={score.awayGoals !== null ? score.awayGoals : ''}
                                  onChange={(e) => updateSimulatedScore(m.apiId, 'away', e.target.value.slice(0, 1))}
                                  className="w-7 h-7 text-center bg-slate-955 border border-slate-800 rounded text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              {/* Away */}
                              <div className="flex items-center gap-2 justify-end w-[40%] text-right">
                                <span className="font-semibold text-slate-350 truncate">{m.awayTeam.name}</span>
                                <img src={m.awayTeam.flagUrl} className="h-3 w-4.5 rounded-sm object-cover shrink-0" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SUBTAB: BRACKET */}
            {simActiveSubTab === 'bracket' && (
              <div className="flex flex-col gap-6 mt-4">
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

                  {/* Quarter-finals */}
                  <div className="flex flex-col gap-6 min-w-[280px] shrink-0 justify-around">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 uppercase tracking-wider text-center">Cuartos de Final</h3>
                      <div className="space-y-16 mt-12">
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

                  {/* Semi-finals */}
                  <div className="flex flex-col gap-6 min-w-[280px] shrink-0 justify-around">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 border-b border-slate-800 pb-2 uppercase tracking-wider text-center">Semifinales</h3>
                      <div className="space-y-32 mt-24">
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

                  {/* Final & 3rd Place */}
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
                        <div className="mt-4 bg-gradient-to-tr from-slate-955 via-slate-900/60 to-slate-955 p-2.5 rounded-2xl border-2 border-amber-500/20 shadow-xl shadow-amber-500/5">
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
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-955/90 backdrop-blur-lg border-t border-slate-850 z-40 flex items-center justify-around py-3 px-4 shadow-black/80 shadow-2xl">
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
  
  const score = simulatedScores[match.apiId] || { homeGoals: null, awayGoals: null };
  const hg = score.homeGoals;
  const ag = score.awayGoals;
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
          <input
            type="number"
            disabled={!homeTeam || !awayTeam}
            min="0"
            max="9"
            placeholder="-"
            value={hg !== null ? hg : ''}
            onChange={(e) => updateSimulatedScore(match.apiId, 'home', e.target.value.slice(0, 1))}
            className="w-7 h-7 text-center bg-slate-900 border border-slate-800 rounded text-slate-100 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed"
          />
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
          <input
            type="number"
            disabled={!homeTeam || !awayTeam}
            min="0"
            max="9"
            placeholder="-"
            value={ag !== null ? ag : ''}
            onChange={(e) => updateSimulatedScore(match.apiId, 'away', e.target.value.slice(0, 1))}
            className="w-7 h-7 text-center bg-slate-900 border border-slate-800 rounded text-slate-100 font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed"
          />
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
          <input
            type="number"
            disabled={locked}
            min="0"
            max="9"
            placeholder="-"
            value={homeInput}
            onChange={(e) => setHomeInput(e.target.value.slice(0, 1))}
            className="w-10 h-8 text-center bg-slate-955 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-100 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-40 disabled:bg-slate-950/60 disabled:cursor-not-allowed"
          />
          <span className="text-slate-500 text-xs font-bold">-</span>
          <input
            type="number"
            disabled={locked}
            min="0"
            max="9"
            placeholder="-"
            value={awayInput}
            onChange={(e) => setAwayInput(e.target.value.slice(0, 1))}
            className="w-10 h-8 text-center bg-slate-955 border border-slate-800 focus:border-emerald-500 rounded-lg text-slate-100 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/30 disabled:opacity-40 disabled:bg-slate-950/60 disabled:cursor-not-allowed"
          />
          
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
