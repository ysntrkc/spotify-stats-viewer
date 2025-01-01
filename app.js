var API_URL = window.ENV.API_URL;

document.getElementById("login-button").addEventListener("click", function() {
    fetch(API_URL + '/auth/spotify')
        .then(function(response) { return response.json(); })
        .then(function(result) {
            if (result.status === 'success' && result.data.auth_url) {
                window.location.href = result.data.auth_url;
            } else {
                console.error("Failed to get auth URL:", result.message);
            }
        });
});

// Add default headers to all fetch requests
var originalFetch = window.fetch;
window.fetch = function(url, options) {
    options = options || {};
    var token = localStorage.getItem('access_token');
    if (token) {
        options.headers = Object.assign({}, options.headers, {
            'Authorization': 'Bearer ' + token
        });
    }
    return originalFetch(url, options);
};

function fetchUserProfile() {
    return fetch(API_URL + '/me')
        .then(function(response) { return response.json(); })
        .then(function(result) {
            if (result.status === 'success') {
                document.getElementById('user-name').textContent = result.data.display_name;
                
                var profileImage = document.getElementById('profile-image');
                if (result.data.images && result.data.images.length > 0) {
                    profileImage.src = result.data.images[0];
                    profileImage.style.display = 'block';
                } else {
                    profileImage.style.display = 'none';
                }
                
                return result.data;
            }
            throw new Error(result.message);
        })
        .catch(function(error) {
            console.error('Error fetching user profile:', error);
            return null;
        });
}

function logout() {
    return fetch(API_URL + '/auth/logout', { method: 'POST' })
        .then(function() {
            localStorage.removeItem('access_token');
            updateAuthState(false);
            window.location.reload();
        })
        .catch(function(error) {
            console.error('Error during logout:', error);
        });
}

function updateAuthState(isAuthenticated) {
    var authForm = document.getElementById('auth-form');
    var profileSection = document.getElementById('profile-section');
    var contentSections = document.getElementById('content-sections');
    
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
document.querySelectorAll('.tab-button').forEach(function(button) {
    button.addEventListener('click', function() {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(function(btn) { btn.classList.remove('active'); });
        button.classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(function(content) { content.classList.remove('active'); });
        document.querySelector('#top-' + button.dataset.tab).classList.add('active');
    });
});

// Update the window load event listener
window.addEventListener("load", function() {
    var token = localStorage.getItem("access_token");
    if (token) {
        fetchUserProfile().then(function(profile) {
            if (profile) {
                updateAuthState(true);
                fetchTopTracks("short_term");
            } else {
                localStorage.removeItem('access_token');
                updateAuthState(false);
            }
        });
    } else {
        updateAuthState(false);
    }
});

// Add lazy loading for singers tab
document.querySelector('.tab-button[data-tab="singers"]').addEventListener('click', function() {
    var singersList = document.getElementById("singers-list");
    if (singersList.children.length === 0) {
        fetchTopSingers("short_term");
    }
});

// Add logout button event listener
document.getElementById('logout-button').addEventListener('click', logout);

var currentTrackTimeRange = 'short_term';
var currentSingerTimeRange = 'short_term';

function getCurrentTimeRange(type) {
    return type === 'tracks' ? currentTrackTimeRange : currentSingerTimeRange;
}

function fetchTopTracks(timeRange) {
    currentTrackTimeRange = timeRange;
    var limit = document.getElementById('tracks-limit').value;
    
    fetch(API_URL + '/top-tracks?time_range=' + timeRange + '&limit=' + limit)
        .then(function(response) { return response.json(); })
        .then(function(result) {
            if (result.status === 'success') {
                var tracksList = document.getElementById("tracks-list");
                tracksList.innerHTML = "";
                result.data.items.forEach(function(track, index) {
                    var listItem = document.createElement("li");
                    listItem.className = 'list-item';
                    var artistNames = track.artists.map(function(artist) {
                        return artist.name;
                    }).join(", ");
                    
                    listItem.innerHTML = 
                        '<span class="index">' + (index + 1) + '.</span>' +
                        '<div class="track-info">' +
                            '<strong>' + track.name + '</strong>' +
                            '<span>' + artistNames + '</span>' +
                        '</div>' +
                        '<div class="album-info">' + track.album.name + '</div>' +
                        '<div class="album-image">' +
                            (track.album.image ? '<img src="' + track.album.image + '" alt="Album cover">' : '') +
                        '</div>';
                    
                    tracksList.appendChild(listItem);
                });
                updateActiveButton('tracks', timeRange);
            } else {
                throw new Error(result.message);
            }
        })
        .catch(function(error) {
            console.error("Error fetching top tracks:", error);
        });
}

function fetchTopSingers(timeRange) {
    currentSingerTimeRange = timeRange;
    var limit = document.getElementById('singers-limit').value;
    fetch(API_URL + '/top-singers?time_range=' + timeRange + '&limit=' + limit)
        .then(function(response) { return response.json(); })
        .then(function(result) {
            if (result.status === 'success') {
                var singersList = document.getElementById("singers-list");
                singersList.innerHTML = "";
                result.data.items.forEach(function(singer, index) {
                    var listItem = document.createElement("li");
                    listItem.className = 'list-item singer-item';
                    listItem.innerHTML = 
                        '<span class="index">' + (index + 1) + '.</span>' +
                        '<div class="track-info">' +
                            '<strong>' + singer.name + '</strong>' +
                        '</div>' +
                        '<div class="artist-image">' +
                            (singer.image ? '<img src="' + singer.image + '" alt="Artist">' : '') +
                        '</div>';
                    
                    singersList.appendChild(listItem);
                });
                updateActiveButton('singers', timeRange);
            } else {
                throw new Error(result.message);
            }
        })
        .catch(function(error) {
            console.error("Error fetching top singers:", error);
        });
}

function updateActiveButton(type, timeRange) {
    var buttons = document.querySelector('#top-' + type + ' .time-range-buttons').getElementsByTagName('button');
    for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        button.classList.remove('active');
        if (button.getAttribute('data-range') === timeRange) {
            button.classList.add('active');
        }
    }
}

// Add styles for active button
document.head.insertAdjacentHTML('beforeend', 
    '<style>' +
    '    .time-range-buttons button.active {' +
    '        background-color: #1db954;' +
    '    }' +
    '</style>'
);
