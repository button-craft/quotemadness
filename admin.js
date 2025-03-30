// DOM references
const initButton = document.getElementById('init-button');
const resetRound4Button = document.getElementById('reset-round4');
const resetRound5Button = document.getElementById('reset-round5');
const resetRound6Button = document.getElementById('reset-round6');
const messageElement = document.getElementById('message');
const adminBracketElement = document.getElementById('admin-bracket');

// Function to show a message
function showMessage(text, type = 'success') {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageElement.className = 'message hidden';
    }, 5000);
}

// Function to initialize the bracket
function initializeBracket() {
    // Define the initial bracket data
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
        }
    ];

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
        }
    ];

    const round6Matches = [
        { 
            id: 'r6m1', 
            round: 'round6',
            team1: null, 
            team2: null, 
            winner: null 
        }
    ];

    // Create a batch
    const batch = db.batch();

    // Add Round 4 matches
    round4Matches.forEach(match => {
        const docRef = db.collection('bracket').doc(match.id);
        batch.set(docRef, match);
    });

    // Add Round 5 matches
    round5Matches.forEach(match => {
        const docRef = db.collection('bracket').doc(match.id);
        batch.set(docRef, match);
    });

    // Add Round 6 match
    round6Matches.forEach(match => {
        const docRef = db.collection('bracket').doc(match.id);
        batch.set(docRef, match);
    });

    // Add config document
    batch.set(db.collection('bracket').doc('config'), {
        currentRound: 'round4',
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Commit the batch
    batch.commit()
        .then(() => {
            showMessage('Bracket initialized successfully!');
            loadAdminBracket();
        })
        .catch(error => {
            console.error('Error initializing bracket:', error);
            showMessage('Error initializing bracket: ' + error.message, 'error');
        });
}

// Function to reset a round
function resetRound(round) {
    // Query all matches for this round
    db.collection('bracket')
        .where('round', '==', round)
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                showMessage(`No matches found for ${round}`, 'error');
                return;
            }

            const batch = db.batch();

            // Reset each match
            querySnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    team1: null,
                    team2: null,
                    winner: null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            // Also reset subsequent rounds
            const roundNumber = parseInt(round.replace('round', ''));
            
            // Commit and update
            batch.commit()
                .then(() => {
                    // Now handle subsequent rounds
                    resetSubsequentRounds(roundNumber + 1);
                })
                .catch(error => {
                    console.error(`Error resetting ${round}:`, error);
                    showMessage(`Error resetting ${round}: ${error.message}`, 'error');
                });
        })
        .catch(error => {
            console.error(`Error querying ${round}:`, error);
            showMessage(`Error querying ${round}: ${error.message}`, 'error');
        });
}

// Function to reset subsequent rounds
function resetSubsequentRounds(startRound) {
    if (startRound > 6) return; // No more rounds to reset
    
    const round = `round${startRound}`;
    
    db.collection('bracket')
        .where('round', '==', round)
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                return; // No matches in this round
            }

            const batch = db.batch();

            // Reset each match
            querySnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    team1: null,
                    team2: null,
                    winner: null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            // Commit and continue to next round
            batch.commit()
                .then(() => {
                    resetSubsequentRounds(startRound + 1);
                    showMessage(`Rounds have been reset successfully!`);
                    loadAdminBracket();
                })
                .catch(error => {
                    console.error(`Error resetting ${round}:`, error);
                });
        });
}

// Function to update a match
function updateMatchWinner(matchId, winner) {
    // Get the match document
    db.collection('bracket').doc(matchId)
        .get()
        .then(doc => {
            if (!doc.exists) {
                showMessage(`Match ${matchId} not found`, 'error');
                return;
            }

            const matchData = doc.data();
            
            // Make sure teams exist
            if (!matchData.team1 || !matchData.team2) {
                showMessage('Cannot set winner when teams are not set', 'error');
                return;
            }

            // Update the match with the winner
            db.collection('bracket').doc(matchId)
                .update({
                    winner: winner,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    // Update the next round match
                    updateNextRoundMatch(matchId, winner, matchData);
                })
                .catch(error => {
                    console.error('Error updating match:', error);
                    showMessage('Error updating match: ' + error.message, 'error');
                });
        })
        .catch(error => {
            console.error('Error getting match:', error);
            showMessage('Error getting match: ' + error.message, 'error');
        });
}

// Function to update the next round match
function updateNextRoundMatch(matchId, winner, matchData) {
    // Parse the matchId to get round and match number
    const match = /r(\d+)m(\d+)/.exec(matchId);
    if (!match) {
        console.error('Invalid match ID format');
        return;
    }

    const roundNum = parseInt(match[1]);
    const matchNum = parseInt(match[2]);
    const nextRoundNum = roundNum + 1;
    
    // Calculate the next match number (integer division)
    const nextMatchNum = Math.ceil(matchNum / 2);
    const nextMatchId = `r${nextRoundNum}m${nextMatchNum}`;
    
    // Determine if this winner goes to team1 or team2 in the next match
    const isTeam1 = matchNum % 2 !== 0;
    
    // Get the winning team data
    const winningTeam = winner === 'team1' ? matchData.team1 : matchData.team2;
    
    // Update the next round match
    const updateData = {};
    updateData[isTeam1 ? 'team1' : 'team2'] = winningTeam;
    
    db.collection('bracket').doc(nextMatchId)
        .update(updateData)
        .then(() => {
            // Update the config timestamp
            db.collection('bracket').doc('config')
                .update({
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    showMessage(`Match ${matchId} updated and winner advanced!`);
                    loadAdminBracket();
                });
        })
        .catch(error => {
            console.error('Error updating next round match:', error);
            showMessage('Error updating next round: ' + error.message, 'error');
        });
}

// Function to render a team
function renderTeam(team) {
    if (!team) return 'TBD';
    return `${team.id}. ${team.name}`;
}

// Function to load and display the admin bracket
function loadAdminBracket() {
    db.collection('bracket').get()
        .then(querySnapshot => {
            const round4 = [];
            const round5 = [];
            const round6 = [];
            
            querySnapshot.forEach(doc => {
                if (doc.id === 'config') return;
                
                const data = doc.data();
                if (data.round === 'round4') {
                    round4.push({ id: doc.id, ...data });
                } else if (data.round === 'round5') {
                    round5.push({ id: doc.id, ...data });
                } else if (data.round === 'round6') {
                    round6.push({ id: doc.id, ...data });
                }
            });
            
            // Sort by match ID
            round4.sort((a, b) => a.id.localeCompare(b.id));
            round5.sort((a, b) => a.id.localeCompare(b.id));
            
            // Render the admin bracket
            renderAdminBracket(round4, round5, round6);
        })
        .catch(error => {
            console.error('Error loading bracket data:', error);
            showMessage('Error loading bracket data: ' + error.message, 'error');
        });
}

// Function to render the admin bracket
function renderAdminBracket(round4, round5, round6) {
    let html = '';
    
    // Render Round 4
    html += `
        <div class="round-section">
            <h2>Round 4</h2>
    `;
    
    round4.forEach(match => {
        html += renderAdminMatch(match);
    });
    
    html += `
        </div>
    `;
    
    // Render Round 5
    html += `
        <div class="round-section">
            <h2>Final Four (Round 5)</h2>
    `;
    
    round5.forEach(match => {
        html += renderAdminMatch(match);
    });
    
    html += `
        </div>
    `;
    
    // Render Round 6
    html += `
        <div class="round-section">
            <h2>Championship (Round 6)</h2>
    `;
    
    round6.forEach(match => {
        html += renderAdminMatch(match);
    });
    
    html += `
        </div>
    `;
    
    // Update the admin bracket element
    adminBracketElement.innerHTML = html;
    
    // Add event listeners for win buttons
    document.querySelectorAll('.win-btn').forEach(button => {
        button.addEventListener('click', () => {
            const matchId = button.getAttribute('data-match');
            const winner = button.getAttribute('data-winner');
            updateMatchWinner(matchId, winner);
        });
    });
}

// Function to render an admin match
function renderAdminMatch(match) {
    const team1Class = match.winner === 'team1' ? 'winner' : '';
    const team2Class = match.winner === 'team2' ? 'winner' : '';
    const hasWinner = match.winner ? 'completed' : 'pending';
    const winnerText = match.winner ? 
        `Winner: ${match.winner === 'team1' ? renderTeam(match.team1) : renderTeam(match.team2)}` : 
        'No winner selected';
    
    return `
        <div class="match-card">
            <div class="match-header">
                <div class="match-id">${match.id}</div>
                <div class="match-status ${hasWinner}">${winnerText}</div>
            </div>
            <div class="match-content">
                <div class="team-box ${team1Class}">
                    ${renderTeam(match.team1)}
                </div>
                <div class="controls">
                    <button class="btn win-btn ${!match.team1 ? 'disabled' : ''}" 
                            data-match="${match.id}" 
                            data-winner="team1"
                            ${!match.team1 ? 'disabled' : ''}>
                        ← Win
                    </button>
                    <button class="btn win-btn ${!match.team2 ? 'disabled' : ''}" 
                            data-match="${match.id}" 
                            data-winner="team2"
                            ${!match.team2 ? 'disabled' : ''}>
                        Win →
                    </button>
                </div>
                <div class="team-box ${team2Class}">
                    ${renderTeam(match.team2)}
                </div>
            </div>
        </div>
    `;
}

// Event listeners
initButton.addEventListener('click', initializeBracket);
resetRound4Button.addEventListener('click', () => resetRound('round4'));
resetRound5Button.addEventListener('click', () => resetRound('round5'));
resetRound6Button.addEventListener('click', () => resetRound('round6'));

// Load the admin bracket when the page loads
window.addEventListener('DOMContentLoaded', loadAdminBracket);

// Set up real-time updates
db.collection('bracket').onSnapshot(() => {
    loadAdminBracket();
}, (error) => {
    console.error("Error setting up real-time updates: ", error);
});
