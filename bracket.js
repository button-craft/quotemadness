// Get reference to the bracket container
const bracketContainer = document.getElementById('bracket-container');
const lastUpdatedElement = document.getElementById('last-updated');

// Function to render a team
function renderTeam(team) {
    if (!team) return '<div class="team empty">TBD</div>';
    return `<div class="team">${team.id}. ${team.name}</div>`;
}

// Function to render a match
function renderMatch(match) {
    let winnerClass1 = match.winner === 'team1' ? 'winner' : '';
    let winnerClass2 = match.winner === 'team2' ? 'winner' : '';
    
    return `
        <div class="match" id="${match.id}">
            <div class="team-container ${winnerClass1}">
                ${renderTeam(match.team1)}
            </div>
            <div class="vs">VS</div>
            <div class="team-container ${winnerClass2}">
                ${renderTeam(match.team2)}
            </div>
        </div>
    `;
}

// Function to load and display the bracket from Firestore
function loadBracket() {
    // Set default data in case Firestore isn't set up yet
    const defaultRound4 = [
        { id: 'r4m1', team1: { id: 11, name: 'Do guys have bladders' }, team2: { id: 1, name: 'Conjunctuate' }, winner: null },
        { id: 'r4m2', team1: { id: 3, name: 'Tight' }, team2: { id: 1, name: 'Objection' }, winner: null },
        { id: 'r4m3', team1: { id: 3, name: 'What the squirrel' }, team2: { id: 8, name: 'Homie Home' }, winner: null },
        { id: 'r4m4', team1: { id: 2, name: 'Wowza' }, team2: { id: 1, name: 'Jig' }, winner: null }
    ];
    
    const defaultRound5 = [
        { id: 'r5m1', team1: null, team2: null, winner: null },
        { id: 'r5m2', team1: null, team2: null, winner: null }
    ];
    
    const defaultRound6 = [
        { id: 'r6m1', team1: null, team2: null, winner: null }
    ];

    // Try to get data from Firestore
    db.collection('bracket').get()
        .then((querySnapshot) => {
            // Check if we have any data
            if (querySnapshot.empty) {
                // Use the default data
                displayBracket(defaultRound4, defaultRound5, defaultRound6);
                lastUpdatedElement.textContent = 'Using default data (Firestore not set up)';
                return;
            }
            
            // Process data from Firestore
            const round4 = [];
            const round5 = [];
            const round6 = [];
            let lastUpdated = null;
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (doc.id === 'config' && data.lastUpdated) {
                    lastUpdated = data.lastUpdated.toDate();
                } else if (data.round === 'round4') {
                    round4.push({ id: doc.id, ...data });
                } else if (data.round === 'round5') {
                    round5.push({ id: doc.id, ...data });
                } else if (data.round === 'round6') {
                    round6.push({ id: doc.id, ...data });
                }
            });
            
            // Sort the rounds by match ID
            round4.sort((a, b) => a.id.localeCompare(b.id));
            round5.sort((a, b) => a.id.localeCompare(b.id));
            
            // Display the bracket
            displayBracket(
                round4.length > 0 ? round4 : defaultRound4,
                round5.length > 0 ? round5 : defaultRound5,
                round6.length > 0 ? round6 : defaultRound6
            );
            
            // Update the last updated timestamp
            if (lastUpdated) {
                lastUpdatedElement.textContent = lastUpdated.toLocaleString();
            } else {
                lastUpdatedElement.textContent = 'Unknown';
            }
        })
        .catch((error) => {
            console.error("Error getting bracket data: ", error);
            // Fall back to default data
            displayBracket(defaultRound4, defaultRound5, defaultRound6);
            lastUpdatedElement.textContent = 'Error loading data from Firestore';
        });
}

// Function to display the bracket with the provided data
function displayBracket(round4, round5, round6) {
    let bracketHTML = `
        <div class="bracket">
            <div class="round">
                <h2>Round 4</h2>
                <div class="matches">
    `;
    
    // Add Round 4 matches
    round4.forEach(match => {
        bracketHTML += renderMatch(match);
    });
    
    bracketHTML += `
                </div>
            </div>
            <div class="round">
                <h2>Final Four</h2>
                <div class="matches">
    `;
    
    // Add Round 5 matches
    round5.forEach(match => {
        bracketHTML += renderMatch(match);
    });
    
    bracketHTML += `
                </div>
            </div>
            <div class="round">
                <h2>Championship</h2>
                <div class="matches">
    `;
    
    // Add Round 6 match
    round6.forEach(match => {
        bracketHTML += renderMatch(match);
    });
    
    bracketHTML += `
                </div>
            </div>
        </div>
    `;
    
    // Update the bracket container
    bracketContainer.innerHTML = bracketHTML;
}

// Load the bracket when the page loads
window.addEventListener('DOMContentLoaded', loadBracket);

// Set up real-time updates
db.collection('bracket').onSnapshot((snapshot) => {
    loadBracket();
}, (error) => {
    console.error("Error setting up real-time updates: ", error);
});
