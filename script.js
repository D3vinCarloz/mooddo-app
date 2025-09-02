// Use the keys from the config.js file
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = API_KEYS;

let tasks = [];
let spotifyToken = '';
let deadlinePicker;

// --- DOM Elements ---
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const moodText = document.getElementById('mood-text');
const appContainer = document.getElementById('app-container');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    deadlinePicker = flatpickr("#task-deadline-picker", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        altInput: true,
        altFormat: "F j, Y at h:i K",
        minDate: "today"
    });

    const tokenSuccess = await getSpotifyToken();
    if (!tokenSuccess) {
        moodText.innerText = "Error: Could not connect to Spotify.";
        moodText.style.color = "var(--panic-color)";
    }

    updateUI();
    fetchQuote();
});

// --- API & CORE LOGIC ---
async function getSpotifyToken() {
    console.log("Attempting to get Spotify token...");
    try {
        const result = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-form-urlencoded',
                'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
            },
            body: 'grant_type=client_credentials'
        });
        if (!result.ok) {
            console.error('Spotify API request failed!', { status: result.status, statusText: result.statusText });
            const errorText = await result.text();
            console.error('Spotify Response:', errorText);
            return false;
        }
        const data = await result.json();
        if (!data.access_token) {
            console.error('Authentication failed! Spotify did not return an access token.', data);
            return false;
        }
        spotifyToken = data.access_token;
        console.log("Successfully retrieved Spotify token.");
        return true;
    } catch (error) {
        console.error("A critical network error occurred while getting Spotify token:", error);
        return false;
    }
}

async function fetchSpotifyPlaylist(mood, fullMoodText) {
    if (!spotifyToken) {
        console.error("Cannot fetch playlist, Spotify token is not available.");
        return;
    }
    const playlists = {
        chill: { id: "37i9dQZF1DX4sWSpwq3LiO", name: "Chill Hits" },
        paced: { id: "37i9dQZF1DXcBWIGoYBM5M", name: "Pop Rising" },
        panic: { id: "37i9dQZF1DWZBCPUIus2iR", name: "HYPE" }
    };
    
    // Use the playlist key that matches the mood, or default to 'chill'
    const playlist = playlists[mood] || playlists.chill;
    
    const embedUrl = `https://open.spotify.com/embed/playlist/${playlist.id}?utm_source=generator&theme=0`;
    
    moodText.innerText = `${fullMoodText} | Playing: ${playlist.name}`;
    
    const spotifyDiv = document.getElementById('spotify-recommendation');
    spotifyDiv.innerHTML = `<iframe style="border-radius:12px" src="${embedUrl}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
}

function getMood(deadline) {
    if (!deadline) { return { mood: 'chill', text: 'Add a task to set the mood', color: 'var(--primary-color)' }; }
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffHours = (deadlineDate - now) / (1000 * 60 * 60);
    if (diffHours > 48) {
        return { mood: 'chill', text: 'Plenty of Time 😌', color: 'var(--chill-color)' };
    } else if (diffHours > 24) {
        return { mood: 'paced', text: 'Time to Focus ⚡', color: 'var(--paced-color)' };
    } else {
        return { mood: 'panic', text: 'Deadline Panic! 🔥', color: 'var(--panic-color)' };
    }
}

function updateUI() {
    taskList.innerHTML = '';
    tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    const currentMood = (tasks.length > 0) ? getMood(tasks[0].deadline) : getMood(null);
    
    appContainer.style.borderTopColor = currentMood.color;
    moodText.style.color = currentMood.color;
    moodText.innerText = currentMood.text;

    if (tasks.length > 0 && spotifyToken) {
        // **BUG FIX:** Use trim() to remove any accidental whitespace from the mood string
        fetchSpotifyPlaylist(currentMood.mood.trim(), currentMood.text);
    } else if (!spotifyToken && tasks.length > 0) {
        moodText.innerText = "Error: Could not connect to Spotify.";
    } else {
        document.getElementById('spotify-recommendation').innerHTML = '<p>Your playlist will appear here.</p>';
    }

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'task-item';
        const taskMood = getMood(task.deadline);
        li.style.borderLeftColor = taskMood.color;
        const isOverdue = new Date(task.deadline) < new Date();
        const formattedDate = new Date(task.deadline).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        li.innerHTML = `
            <div class="task-details">
                <span class="task-name">${task.name}</span>
                <span class="task-due ${isOverdue ? 'overdue' : ''}">${isOverdue ? 'OVERDUE!' : 'Due: ' + formattedDate}</span>
            </div>
            <button class="delete-btn" data-index="${index}">✕</button>`;
        taskList.appendChild(li);
    });
}

function addTask() {
    const taskNameInput = document.getElementById('task-name');
    const name = taskNameInput.value;
    const deadline = deadlinePicker.selectedDates[0];
    if (name && deadline) {
        tasks.push({ name, deadline: deadline.toISOString() });
        taskNameInput.value = '';
        deadlinePicker.clear();
        updateUI();
        fetchQuote();
    } else {
        alert('Please enter a task name and select a deadline.');
    }
}

function deleteTask(index) {
    tasks.splice(index, 1);
    updateUI();
}

async function fetchQuote() {
    try {
        const response = await fetch("https://api.quotable.io/random");
        const data = await response.json();
        document.getElementById('quote-text').innerText = `"${data.content}" — ${data.author}`;
    } catch (error) {
        console.error("Error fetching quote:", error);
    }
}

// --- EVENT LISTENERS ---
addTaskBtn.addEventListener('click', addTask);
taskList.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const index = event.target.dataset.index;
        deleteTask(index);
    }
});