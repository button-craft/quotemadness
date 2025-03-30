import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';

// Firebase configuration - replace with your own config from Firebase console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BracketAdmin = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch all matches on component mount
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const matchesCollection = collection(db, 'bracket');
        const matchesSnapshot = await getDocs(matchesCollection);
        
        const matchesList = [];
        matchesSnapshot.forEach(doc => {
          // Skip the config document
          if (doc.id !== 'config') {
            matchesList.push({ id: doc.id, ...doc.data() });
          }
        });
        
        // Sort by round and match number
        matchesList.sort((a, b) => {
          const aRound = parseInt(a.round.replace('round', ''));
          const bRound = parseInt(b.round.replace('round', ''));
          
          if (aRound !== bRound) return aRound - bRound;
          
          const aMatch = parseInt(a.id.replace(/^r\d+m/, ''));
          const bMatch = parseInt(b.id.replace(/^r\d+m/, ''));
          return aMatch - bMatch;
        });
        
        setMatches(matchesList);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching matches:", err);
        setError("Failed to load matches. Please refresh the page.");
        setLoading(false);
      }
    };
    
    fetchMatches();
  }, []);

  // Update a match with the winner
  const updateMatchWinner = async (matchId, winner) => {
    try {
      setLoading(true);
      
      const matchRef = doc(db, 'bracket', matchId);
      const matchDoc = await getDoc(matchRef);
      
      if (!matchDoc.exists()) {
        throw new Error(`Match ${matchId} not found`);
      }
      
      const matchData = matchDoc.data();
      
      // Update the match with the winner
      await updateDoc(matchRef, { 
        winner, 
        updatedAt: serverTimestamp() 
      });
      
      // Get the round information
      const roundMatch = /^r(\d+)m\d+$/.exec(matchId);
      if (!roundMatch) {
        throw new Error(`Invalid match ID format: ${matchId}`);
      }
      
      const roundNum = parseInt(roundMatch[1]);
      const nextRoundNum = roundNum + 1;
      const nextRound = `round${nextRoundNum}`;
      
      // Determine which match in the next round should be updated
      const matchNumInRound = parseInt(matchId.slice(-1));
      const nextMatchNumInRound = Math.ceil(matchNumInRound / 2);
      const nextMatchId = `r${nextRoundNum}m${nextMatchNumInRound}`;
      
      // Determine if this team goes to team1 or team2 in the next round
      const isTeam1InNextRound = matchNumInRound % 2 !== 0;
      
      // Get the winning team data
      const winningTeam = winner === 'team1' ? matchData.team1 : matchData.team2;
      
      // Get the next match
      const nextMatchRef = doc(db, 'bracket', nextMatchId);
      const nextMatchDoc = await getDoc(nextMatchRef);
      
      if (nextMatchDoc.exists()) {
        // Update the appropriate team in the next round
        const updateData = {};
        updateData[isTeam1InNextRound ? 'team1' : 'team2'] = winningTeam;
        
        await updateDoc(nextMatchRef, updateData);
      }
      
      // Update config document
      await updateDoc(doc(db, 'bracket', 'config'), {
        lastUpdated: serverTimestamp()
      });
      
      // Refresh the matches
      const matchesCollection = collection(db, 'bracket');
      const matchesSnapshot = await getDocs(matchesCollection);
      
      const matchesList = [];
      matchesSnapshot.forEach(doc => {
        if (doc.id !== 'config') {
          matchesList.push({ id: doc.id, ...doc.data() });
        }
      });
      
      // Sort by round and match number
      matchesList.sort((a, b) => {
        const aRound = parseInt(a.round.replace('round', ''));
        const bRound = parseInt(b.round.replace('round', ''));
        
        if (aRound !== bRound) return aRound - bRound;
        
        const aMatch = parseInt(a.id.replace(/^r\d+m/, ''));
        const bMatch = parseInt(b.id.replace(/^r\d+m/, ''));
        return aMatch - bMatch;
      });
      
      setMatches(matchesList);
      setSuccessMessage(`Match ${matchId} updated successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setLoading(false);
    } catch (err) {
      console.error("Error updating match:", err);
      setError(`Failed to update match: ${err.message}`);
      setLoading(false);
    }
  };
  
  if (loading) return (
    <div className="flex items-center justify-center p-6">
      <div className="text-lg font-medium">Loading...</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Bracket Admin Panel</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      <div className="mb-6">
        <button 
          onClick={() => initializeBracket()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-4"
        >
          Initialize Bracket
        </button>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <button 
            onClick={() => resetRound('round4')}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Reset Round 4
          </button>
          <button 
            onClick={() => resetRound('round5')}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Reset Round 5
          </button>
          <button 
            onClick={() => resetRound('round6')}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Reset Championship
          </button>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Round 4</h2>
        <div className="space-y-4">
          {matches
            .filter(match => match.round === 'round4')
            .map(match => (
              <div key={match.id} className="border rounded p-4 bg-white shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-semibold">{match.id}</div>
                  <div className="text-sm text-gray-500">
                    {match.winner ? (
                      <span className="text-green-600 font-medium">
                        Winner: {match.winner === 'team1' ? match.team1?.name : match.team2?.name}
                      </span>
                    ) : (
                      <span>No winner selected</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div className={`p-2 ${match.winner === 'team1' ? 'bg-green-100' : ''}`}>
                    {renderTeam(match.team1)}
                  </div>
                  
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => updateMatchWinner(match.id, 'team1')}
                      className="bg-blue-500 text-white px-2 py-1 text-sm rounded hover:bg-blue-600"
                      disabled={!match.team1}
                    >
                      ← Win
                    </button>
                    <button 
                      onClick={() => updateMatchWinner(match.id, 'team2')}
                      className="bg-blue-500 text-white px-2 py-1 text-sm rounded hover:bg-blue-600"
                      disabled={!match.team2}
                    >
                      Win →
                    </button>
                  </div>
                  
                  <div className={`p-2 ${match.winner === 'team2' ? 'bg-green-100' : ''}`}>
                    {renderTeam(match.team2)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Final Four (Round 5)</h2>
        <div className="space-y-4">
          {matches
            .filter(match => match.round === 'round5')
            .map(match => (
              <div key={match.id} className="border rounded p-4 bg-white shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-semibold">{match.id}</div>
                  <div className="text-sm text-gray-500">
                    {match.winner ? (
                      <span className="text-green-600 font-medium">
                        Winner: {match.winner === 'team1' ? match.team1?.name : match.team2?.name}
                      </span>
                    ) : (
                      <span>No winner selected</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div className={`p-2 ${match.winner === 'team1' ? 'bg-green-100' : ''}`}>
                    {renderTeam(match.team1)}
                  </div>
                  
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => updateMatchWinner(match.id, 'team1')}
                      className="bg-blue-500 text-white px-2 py-1 text-sm rounded hover:bg-blue-600"
                      disabled={!match.team1}
                    >
                      ← Win
                    </button>
                    <button 
                      onClick={() => updateMatchWinner(match.id, 'team2')}
                      className="bg-blue-500 text-white px-2 py-1 text-sm rounded hover:bg-blue-600"
                      disabled={!match.team2}
                    >
                      Win →
                    </button>
                  </div>
                  
                  <div className={`p-2 ${match.winner === 'team2' ? 'bg-green-100' : ''}`}>
                    {renderTeam(match.team2)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Championship (Round 6)</h2>
        <div className="space-y-4">
          {matches
            .filter(match => match.round === 'round6')
            .map(match => (
              <div key={match.id} className="border rounded p-4 bg-white shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-semibold">{match.id}</div>
                  <div className="text-sm text-gray-500">
                    {match.winner ? (
                      <span className="text-green-600 font-medium">
                        Winner: {match.winner === 'team1' ? match.team1?.name : match.team2?.name}
                      </span>
                    ) : (
                      <span>No winner selected</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div className={`p-2 ${match.winner === 'team1' ? 'bg-green-100' : ''}`}>
                    {renderTeam(match.team1)}
                  </div>
                  
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={() => updateMatchWinner(match.id, 'team1')}
                      className="bg-blue-500 text-white px-2 py-1 text-sm rounded hover:bg-blue-600"
                      disabled={!match.team1}
                    >
                      ← Win
                    </button>
                    <button 
                      onClick={() => updateMatchWinner(match.id, 'team2')}
                      className="bg-blue-500 text-white px-2 py-1 text-sm rounded hover:bg-blue-600"
                      disabled={!match.team2}
                    >
                      Win →
                    </button>
                  </div>
                  
                  <div className={`p-2 ${match.winner === 'team2' ? 'bg-green-100' : ''}`}>
                    {renderTeam(match.team2)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  // Reset a specific round
  const resetRound = async (round) => {
    try {
      setLoading(true);
      
      // Get all matches for the specified round
      const roundMatches = await getDocs(
        query(collection(db, 'bracket'), where('round', '==', round))
      );
      
      if (roundMatches.empty) {
        setSuccessMessage(`No matches found for ${round}`);
        setLoading(false);
        return;
      }
      
      // Reset each match in the round
      const batch = writeBatch(db);
      
      roundMatches.forEach(docSnapshot => {
        batch.update(docSnapshot.ref, {
          team1: null,
          team2: null,
          winner: null,
          updatedAt: serverTimestamp()
        });
      });
      
      // If we're resetting a round, also reset all subsequent rounds
      const roundNumber = parseInt(round.replace('round', ''));
      
      for (let i = roundNumber + 1; i <= 6; i++) {
        const nextRound = `round${i}`;
        const nextRoundMatches = await getDocs(
          query(collection(db, 'bracket'), where('round', '==', nextRound))
        );
        
        nextRoundMatches.forEach(docSnapshot => {
          batch.update(docSnapshot.ref, {
            team1: null,
            team2: null,
            winner: null,
            updatedAt: serverTimestamp()
          });
        });
      }
      
      // Commit all the updates
      await batch.commit();
      
      // Update config
      await updateDoc(doc(db, 'bracket', 'config'), {
        currentRound: round,
        lastUpdated: serverTimestamp()
      });
      
      // Refresh the matches
      const matchesCollection = collection(db, 'bracket');
      const matchesSnapshot = await getDocs(matchesCollection);
      
      const matchesList = [];
      matchesSnapshot.forEach(doc => {
        if (doc.id !== 'config') {
          matchesList.push({ id: doc.id, ...doc.data() });
        }
      });
      
      // Sort by round and match number
      matchesList.sort((a, b) => {
        const aRound = parseInt(a.round.replace('round', ''));
        const bRound = parseInt(b.round.replace('round', ''));
        
        if (aRound !== bRound) return aRound - bRound;
        
        const aMatch = parseInt(a.id.replace(/^r\d+m/, ''));
        const bMatch = parseInt(b.id.replace(/^r\d+m/, ''));
        return aMatch - bMatch;
      });
      
      setMatches(matchesList);
      setSuccessMessage(`Round ${round} has been reset successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setLoading(false);
    } catch (err) {
      console.error(`Error resetting round ${round}:`, err);
      setError(`Failed to reset round: ${err.message}`);
      setLoading(false);
    }
  };
  
  // Helper function to render a team
  const renderTeam = (team) => {
    if (!team) return <span className="text-gray-400">TBD</span>;
    return (
      <span className="font-medium">
        {team.id}. {team.name}
      </span>
    );
  };

  // Initialize the bracket (this would typically be done once)
  const initializeBracket = async () => {
    try {
      setLoading(true);
      
      // Initial matchups for Round 4 (from your requirements)
      const round4Matches = [
        { 
          id: 'r4m1', 
          round: 'round4',
          team1: { id: 11, name: 'Do guys have bladders' }, 
          team2: { id: 1, name: 'Conjunctuate' }, 
          winner: null 
        },
        { 
          id: 'r4m2', 
          round: 'round4',
          team1: { id: 3, name: 'Tight' }, 
          team2: { id: 1, name: 'Objection' }, 
          winner: null 
        },
        { 
          id: 'r4m3', 
          round: 'round4',
          team1: { id: 3, name: 'What the squirrel' }, 
          team2: { id: 8, name: 'Homie Home' }, 
          winner: null 
        },
        { 
          id: 'r4m4', 
          round: 'round4',
          team1: { id: 2, name: 'Wowza' }, 
          team2: { id: 1, name: 'Jig' }, 
          winner: null 
        },
      ];

      // Empty placeholders for Round 5 (Final Four)
      const round5Matches = [
        { 
          id: 'r5m1', 
          round: 'round5',
          team1: null, 
          team2: null, 
          winner: null 
        },
        { 
          id: 'r5m2', 
          round: 'round5',
          team1: null, 
          team2: null, 
          winner: null 
        },
      ];

      // Empty placeholder for Round 6 (Championship)
      const round6Matches = [
        { 
          id: 'r6m1', 
          round: 'round6',
          team1: null, 
          team2: null, 
          winner: null 
        },
      ];

      // Batch write operations for better atomicity
      const batch = writeBatch(db);

      // Add Round 4 matches
      round4Matches.forEach(match => {
        const docRef = doc(db, 'bracket', match.id);
        batch.set(docRef, match);
      });

      // Add Round 5 matches
      round5Matches.forEach(match => {
        const docRef = doc(db, 'bracket', match.id);
        batch.set(docRef, match);
      });

      // Add Round 6 match
      round6Matches.forEach(match => {
        const docRef = doc(db, 'bracket', match.id);
        batch.set(docRef, match);
      });

      // Add overall config document
      batch.set(doc(db, 'bracket', 'config'), {
        currentRound: 'round4',
        lastUpdated: serverTimestamp()
      });

      // Commit the batch
      await batch.commit();
      
      // Refresh the matches
      const matchesCollection = collection(db, 'bracket');
      const matchesSnapshot = await getDocs(matchesCollection);
      
      const matchesList = [];
      matchesSnapshot.forEach(docSnapshot => {
        if (docSnapshot.id !== 'config') {
          matchesList.push({ id: docSnapshot.id, ...docSnapshot.data() });
        }
      });
      
      // Sort by round and match number
      matchesList.sort((a, b) => {
        const aRound = parseInt(a.round.replace('round', ''));
        const bRound = parseInt(b.round.replace('round', ''));
        
        if (aRound !== bRound) return aRound - bRound;
        
        const aMatch = parseInt(a.id.replace(/^r\d+m/, ''));
        const bMatch = parseInt(b.id.replace(/^r\d+m/, ''));
        return aMatch - bMatch;
      });
      
      setMatches(matchesList);
      setSuccessMessage(`Bracket initialized successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setLoading(false);
    } catch (err) {
      console.error('Error initializing bracket:', err);
      setError(`Failed to initialize bracket: ${err.message}`);
      setLoading(false);
    }
