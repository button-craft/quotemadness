import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, onSnapshot } from 'firebase/firestore';

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

const Bracket = () => {
  const [bracketData, setBracketData] = useState({
    round3: [],
    round4: [
      { id: 'r4m1', team1: { id: 11, name: 'Do guys have bladders' }, team2: { id: 1, name: 'Conjunctuate' }, winner: null },
      { id: 'r4m2', team1: { id: 3, name: 'Tight' }, team2: { id: 1, name: 'Objection' }, winner: null },
      { id: 'r4m3', team1: { id: 3, name: 'What the squirrel' }, team2: { id: 8, name: 'Homie Home' }, winner: null },
      { id: 'r4m4', team1: { id: 2, name: 'Wowza' }, team2: { id: 1, name: 'Jig' }, winner: null },
    ],
    round5: [
      { id: 'r5m1', team1: null, team2: null, winner: null },
      { id: 'r5m2', team1: null, team2: null, winner: null },
    ],
    round6: [
      { id: 'r6m1', team1: null, team2: null, winner: null },
    ]
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to real-time updates from Firestore
    const unsubscribe = onSnapshot(
      collection(db, 'bracket'),
      (snapshot) => {
        const updatedData = { ...bracketData };
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.round && updatedData[data.round]) {
            // Find and update the specific match in the correct round
            const matchIndex = updatedData[data.round].findIndex(match => match.id === doc.id);
            if (matchIndex !== -1) {
              updatedData[data.round][matchIndex] = { 
                id: doc.id, 
                ...data 
              };
            }
          }
        });
        
        // Update round5 and round6 based on winners from previous rounds
        updateNextRounds(updatedData);
        
        setBracketData(updatedData);
        setLoading(false);
      },
      (err) => {
        console.error("Error getting bracket data: ", err);
        setError("Failed to load bracket data. Please refresh the page.");
        setLoading(false);
      }
    );
    
    // Initial load of data
    const initialLoad = async () => {
      try {
        const docRef = doc(db, 'bracket', 'config');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBracketData(prev => ({...prev, ...data}));
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading initial data: ", err);
        setError("Failed to load initial bracket data.");
        setLoading(false);
      }
    };
    
    initialLoad();
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);
  
  // Function to update next rounds based on previous rounds' winners
  const updateNextRounds = (data) => {
    // Update round5 based on round4 winners
    if (data.round4 && data.round5) {
      if (data.round4[0].winner && data.round4[1].winner) {
        data.round5[0].team1 = data.round4[0].winner === 'team1' ? data.round4[0].team1 : data.round4[0].team2;
        data.round5[0].team2 = data.round4[1].winner === 'team1' ? data.round4[1].team1 : data.round4[1].team2;
      }
      
      if (data.round4[2].winner && data.round4[3].winner) {
        data.round5[1].team1 = data.round4[2].winner === 'team1' ? data.round4[2].team1 : data.round4[2].team2;
        data.round5[1].team2 = data.round4[3].winner === 'team1' ? data.round4[3].team1 : data.round4[3].team2;
      }
    }
    
    // Update round6 based on round5 winners
    if (data.round5 && data.round6) {
      if (data.round5[0].winner && data.round5[1].winner) {
        data.round6[0].team1 = data.round5[0].winner === 'team1' ? data.round5[0].team1 : data.round5[0].team2;
        data.round6[0].team2 = data.round5[1].winner === 'team1' ? data.round5[1].team1 : data.round5[1].team2;
      }
    }
  };
  
  // Helper to display team information
  const renderTeam = (team, isWinner) => {
    if (!team) return <div className="h-10 w-40 bg-gray-100 rounded"></div>;
    
    return (
      <div className={`flex items-center p-2 rounded ${isWinner ? 'bg-green-100 border-l-4 border-green-500' : ''}`}>
        <div className="font-bold mr-2 text-sm">{team.id}</div>
        <div className="truncate">{team.name}</div>
      </div>
    );
  };
  
  // Render a match between two teams
  const renderMatch = (match) => {
    if (!match) return null;
    
    return (
      <div className="flex flex-col mb-6 bg-white p-2 rounded shadow">
        {renderTeam(match.team1, match.winner === 'team1')}
        <div className="border-b my-1 border-gray-200"></div>
        {renderTeam(match.team2, match.winner === 'team2')}
      </div>
    );
  };

  if (loading) return <div className="text-center p-4">Loading bracket...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-8">Tournament Bracket</h1>
      
      <div className="flex justify-between overflow-x-auto">
        {/* Round 4 */}
        <div className="flex-none w-64">
          <h2 className="text-lg font-semibold mb-4 text-center">Round 4</h2>
          <div className="space-y-8">
            {bracketData.round4.map((match, index) => (
              <div key={match.id || index} className="mx-2">
                {renderMatch(match)}
              </div>
            ))}
          </div>
        </div>
        
        {/* Round 5 (Final Four) */}
        <div className="flex-none w-64">
          <h2 className="text-lg font-semibold mb-4 text-center">Final Four</h2>
          <div className="space-y-16 mt-12">
            {bracketData.round5.map((match, index) => (
              <div key={match.id || index} className="mx-2">
                {renderMatch(match)}
              </div>
            ))}
          </div>
        </div>
        
        {/* Round 6 (Championship) */}
        <div className="flex-none w-64">
          <h2 className="text-lg font-semibold mb-4 text-center">Championship</h2>
          <div className="mt-32 mx-2">
            {renderMatch(bracketData.round6[0])}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bracket;
