// Use the keys from the config.js file
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = API_KEYS;

let tasks = [];
let spotifyToken = '';

// --- API & DOM Elements ---
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

// --- CORE LOGIC: SPOTIFY AUTHENTICATION ---
async function getSpotifyToken() {
    try {
        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
            },
            body: 'grant_type=client_credentials'
        });
        const data = await result.json();
        spotifyToken = data.access_token;
    } catch (error) {
        console.error("Error getting Spotify token:", error);
    }
}

// --- CORE LOGIC: FETCH SPOTIFY PLAYLIST ---
async function fetchSpotifyPlaylist(mood) {
    if (!spotifyToken) await getSpotifyToken();

    const playlists = {
        chill: "37i9dQZF1DX4sWSpwq3LiO", // Spotify's "Chill Hits"
        paced: "37i9dQZF1DXcBWIGoYBM5M", // Spotify's "Pop Rising"
        panic: "37i9dQZF1DWZBCPUIus2iR"  // Spotify's "Hype"
    };
    const playlistId = playlists[mood] || playlists.chill;
    const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`;
    
    const spotifyDiv = document.getElementById('spotify-recommendation');
    spotifyDiv.innerHTML = `<iframe id="spotify-widget" src="${embedUrl}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
}

// --- CORE LOGIC: FETCH MOTIVATIONAL QUOTE ---
async function fetchQuote() {
    try {
        const response = await fetch("https://api.quotable.io/random");
        const data = await response.json();
        document.getElementById('quote-text').innerText = `"${data.content}" — ${data.author}`;
    } catch (error) {
        console.error("Error fetching quote:", error);
    }
}

// --- CORE LOGIC: TASK MANAGEMENT & MOOD CALCULATION ---
function getMood(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffHours = (deadlineDate - now) / (1000 * 60 * 60);

    if (diffHours > 48) { // More than 2 days
        return { mood: 'chill', emoji: '😌' };
    } else if (diffHours <= 48 && diffHours > 24) { // Between 1 and 2 days
        return { mood: 'paced', emoji: '⚡' };
    } else { // Less than 1 day
        return { mood: 'panic', emoji: '🔥' };
    }
}

function updateUI() {
    taskList.innerHTML = '';
    
    tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        const timeRemaining = new Date(task.deadline) > new Date() ? 
            `Due: ${new Date(task.deadline).toLocaleString()}` : 
            '<strong>OVERDUE</strong>';
        
        li.innerHTML = `
            <span>${task.name} - ${timeRemaining}</span>
            <button class="delete-btn" data-index="${index}">Delete</button>
        `;
        taskList.appendChild(li);
    });

    if (tasks.length > 0) {
        const urgentTask = tasks[0];
        const { mood, emoji } = getMood(urgentTask.deadline);
        document.getElementById('mood-emoji').innerText = emoji;
        fetchSpotifyPlaylist(mood);
    } else {
        document.getElementById('mood-emoji').innerText = '😌';
        fetchSpotifyPlaylist('chill');
    }
}

function addTask() {
    const taskNameInput = document.getElementById('task-name');
    const taskDeadlineInput = document.getElementById('task-deadline');
    const name = taskNameInput.value;
    const deadline = taskDeadlineInput.value;

    if (name && deadline) {
        tasks.push({ name, deadline });
        taskNameInput.value = '';
        taskDeadlineInput.value = '';
        updateUI();
        fetchQuote();
    } else {
        alert('Please enter both a task name and a deadline.');
    }
}

function deleteTask(index) {
    tasks.splice(index, 1);
    updateUI();
}

// --- EVENT LISTENERS ---
addTaskBtn.addEventListener('click', addTask);

taskList.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const index = event.target.dataset.index;
        deleteTask(index);
    }
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    getSpotifyToken().then(() => {
        updateUI();
    });
    fetchQuote();
});