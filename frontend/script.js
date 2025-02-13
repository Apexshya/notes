const socket = io('http://localhost:3000');
let userToken = null;

document.getElementById('show-register').addEventListener('click', () => {
  toggleAuthSection('register');
});

document.getElementById('show-login').addEventListener('click', () => {
  toggleAuthSection('login');
});

function toggleAuthSection(section) {
  const authSection = document.getElementById('auth-section');
  const registerSection = document.getElementById('register-section');
  
  if (section === 'register') {
    authSection.style.display = 'none';
    registerSection.style.display = 'block';
  } else if (section === 'login') {
    registerSection.style.display = 'none';
    authSection.style.display = 'block';
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error('Login failed');

    const data = await res.json();
    if (data.token) {
      userToken = data.token;
      document.getElementById('auth-section').style.display = 'none';
      document.getElementById('notes-section').style.display = 'block';
      fetchNotes();
    }
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const res = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) throw new Error('Registration failed');

    const data = await res.json();
    if (data.id) {
      alert('Registration successful! Please login.');
      toggleAuthSection('login');
    }
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
});

// Fetch notes
async function fetchNotes() {
  try {
    const res = await fetch('http://localhost:3000/notes', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!res.ok) throw new Error('Failed to fetch notes');

    const notes = await res.json();
    displayNotes(notes);
  } catch (error) {
    alert('Error fetching notes: ' + error.message);
  }
}

// Display notes
function displayNotes(notes) {
  const notesList = document.getElementById('notes-list');
  notesList.innerHTML = '';  // Clear previous notes

  notes.forEach(note => {
    const noteCard = document.createElement('div');
    noteCard.classList.add('note-card');
    noteCard.innerHTML = `
      <h3>${note.title}</h3>
      <p>${note.content}</p>
      <button class="edit-note" data-id="${note.id}">Edit</button>
      <button class="delete-note" data-id="${note.id}">Delete</button>
    `;
    notesList.appendChild(noteCard);

    // Bind edit and delete buttons after appending to DOM
    noteCard.querySelector('.edit-note').addEventListener('click', (e) => editNote(e, note.id));
    noteCard.querySelector('.delete-note').addEventListener('click', (e) => deleteNote(e, note.id));
  });
}

// Edit note
async function editNote(e, noteId) {
  // Implement note editing functionality
  const title = prompt('Enter new title:');
  const content = prompt('Enter new content:');

  if (title && content) {
    try {
      const res = await fetch(`http://localhost:3000/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ title, content }),
      });

      if (!res.ok) throw new Error('Failed to update note');
      
      fetchNotes();  // Refresh notes after edit
    } catch (error) {
      alert('Error updating note: ' + error.message);
    }
  }
}

// Delete note
async function deleteNote(e, noteId) {
  if (confirm('Are you sure you want to delete this note?')) {
    try {
      const res = await fetch(`http://localhost:3000/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (!res.ok) throw new Error('Failed to delete note');

      fetchNotes();  
    } catch (error) {
      alert('Error deleting note: ' + error.message);
    }
  }
}

document.getElementById('create-note').addEventListener('click', () => {
  document.getElementById('notes-section').style.display = 'none';
  document.getElementById('create-note-section').style.display = 'block';
});

document.getElementById('create-note-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('note-title').value;
  const content = document.getElementById('note-content').value;

  try {
    const res = await fetch('http://localhost:3000/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ title, content }),
    });

    if (!res.ok) throw new Error('Failed to create note');

    const newNote = await res.json();
    if (newNote.id) {
      document.getElementById('create-note-section').style.display = 'none';
      document.getElementById('notes-section').style.display = 'block';
      fetchNotes();
    }
  } catch (error) {
    alert('Error creating note: ' + error.message);
  }
});
