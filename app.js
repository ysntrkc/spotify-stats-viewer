import config from './config.js';

document.getElementById("login-button").addEventListener("click", async () => {
    const response = await fetch(`${config.API_URL}/auth/spotify`);
    const result = await response.json();
    if (result.status === 'success' && result.data.auth_url) {
        window.location.href = result.data.auth_url;
    } else {
        console.error("Failed to get auth URL:", result.message);
    }
});

// Add default headers to all fetch requests
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    const token = localStorage.getItem('access_token');
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return originalFetch(url, options);
};

async function fetchUserProfile() {
    try {
        const response = await fetch(`${config.API_URL}/me`);
        const result = await response.json();
        if (result.status === 'success') {
            document.getElementById('user-name').textContent = result.data.display_name;
            
            // Handle profile image
            const profileImage = document.getElementById('profile-image');
            if (result.data.images?.length > 0) {
                profileImage.src = result.data.images[0];
                profileImage.style.display = 'block';
            } else {
                profileImage.style.display = 'none';
            }
            
            return result.data;
        }
        throw new Error(result.message);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

async function logout() {
    try {
        await fetch(`${config.API_URL}/auth/logout`, { method: 'POST' });
        localStorage.removeItem('access_token');
        updateAuthState(false);
        window.location.reload();
    } catch (error) {
        console.error('Error during logout:', error);
    }
}

function updateAuthState(isAuthenticated) {
    const authForm = document.getElementById('auth-form');
    const profileSection = document.getElementById('profile-section');
    const contentSections = document.getElementById('content-sections');
    
    if (isAuthenticated) {
        authForm.style.display = 'none';
        profileSection.style.display = 'flex';
        contentSections.style.display = 'block';
    } else {
        authForm.style.display = 'block';
        profileSection.style.display = 'none';
        contentSections.style.display = 'none';
    }
}

// Add tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.querySelector(`#top-${button.dataset.tab}`).classList.add('active');
    });
});

// Update the window load event listener
window.addEventListener("load", async () => {
    const token = localStorage.getItem("access_token");
    if (token) {
        const profile = await fetchUserProfile();
        if (profile) {
            updateAuthState(true);
            // Only load tracks initially since it's the first tab
            await fetchTopTracks("short_term");
        } else {
            // If profile fetch fails, token might be invalid
            localStorage.removeItem('access_token');
            updateAuthState(false);
        }
    } else {
        updateAuthState(false);
    }
});

// Add lazy loading for singers tab
document.querySelector('.tab-button[data-tab="singers"]').addEventListener('click', async () => {
    const singersList = document.getElementById("singers-list");
    if (singersList.children.length === 0) {
        await fetchTopSingers("short_term");
    }
});

// Add logout button event listener
document.getElementById('logout-button').addEventListener('click', logout);

let currentTrackTimeRange = 'short_term';
let currentSingerTimeRange = 'short_term';

function getCurrentTimeRange(type) {
    return type === 'tracks' ? currentTrackTimeRange : currentSingerTimeRange;
}

async function fetchTopTracks(timeRange) {
    try {
        currentTrackTimeRange = timeRange;
        const limit = document.getElementById('tracks-limit').value;
        const response = await fetch(`${config.API_URL}/top-tracks?time_range=${timeRange}&limit=${limit}`);
        const result = await response.json();
        if (result.status === 'success') {
            const tracksList = document.getElementById("tracks-list");
            tracksList.innerHTML = "";
            result.data.items.forEach((track, index) => {
                const listItem = document.createElement("li");
                listItem.className = 'list-item';
                const artistNames = track.artists.map(artist => artist.name).join(", ");
                listItem.innerHTML = `
                    <span class="index">${index + 1}.</span>
                    <div class="track-info">
                        <strong>${track.name}</strong>
                        <span>${artistNames}</span>
                    </div>
                    <div class="album-info">${track.album.name}</div>
                    <div class="album-image">
                        ${track.album.image ? `<img src="${track.album.image}" alt="Album cover">` : ''}
                    </div>
                `;
                tracksList.appendChild(listItem);
            });
            updateActiveButton('tracks', timeRange);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Error fetching top tracks:", error);
    }
}

async function fetchTopSingers(timeRange) {
    try {
        currentSingerTimeRange = timeRange;
        const limit = document.getElementById('singers-limit').value;
        const response = await fetch(`${config.API_URL}/top-singers?time_range=${timeRange}&limit=${limit}`);
        const result = await response.json();
        if (result.status === 'success') {
            const singersList = document.getElementById("singers-list");
            singersList.innerHTML = "";
            result.data.items.forEach((singer, index) => {
                const listItem = document.createElement("li");
                listItem.className = 'list-item singer-item';
                listItem.innerHTML = `
                    <span class="index">${index + 1}.</span>
                    <div class="track-info">
                        <strong>${singer.name}</strong>
                    </div>
                    <div class="artist-image">
                        ${singer.image ? `<img src="${singer.image}" alt="Artist">` : ''}
                    </div>
                `;
                singersList.appendChild(listItem);
            });
            updateActiveButton('singers', timeRange);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Error fetching top singers:", error);
    }
}

function updateActiveButton(type, timeRange) {
    const buttons = document.querySelector(`#top-${type} .time-range-buttons`).getElementsByTagName('button');
    for (let button of buttons) {
        button.classList.remove('active');
        if (button.getAttribute('data-range') === timeRange) {
            button.classList.add('active');
        }
    }
}

// Add styles for active button
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .time-range-buttons button.active {
            background-color: #1db954;
        }
    </style>
`);
