const DEFAULT_STORAGE_KEY = 'chat_global';
let currentStorageKey = DEFAULT_STORAGE_KEY;

// --- N8N API CONFIGURATION ---
const N8N_URLS = {
  profiles: "https://tugsuu42.app.n8n.cloud/webhook/team-members",
  performance: "https://tugsuu42.app.n8n.cloud/webhook/analyze-team",
  planner: "https://tugsuu42.app.n8n.cloud/webhook/planner",
  contribution: "https://tugsuu42.app.n8n.cloud/webhook/platform-events",
  classify: "https://tugsuu42.app.n8n.cloud/webhook/chat-message"
};

// The Master Fetch Function (Demo mode: no backend calls)
async function callN8N(url, data) {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(400);

  if (url.includes('chat-message')) {
    return { category: 'discussion', confidence: 0.87 };
  }

  if (url.includes('planner')) {
    return [
      {
        title: 'Sync on priorities',
        description: 'Agree on the top 3 items for this sprint based on recent chat updates.',
      },
      {
        title: 'Document open questions',
        description: 'Capture any blockers mentioned in chat and assign owners to resolve them.',
      },
      {
        title: 'Validate UI/UX flows',
        description: 'Ensure design decisions align with the latest feature goals and feedback.',
      },
    ];
  }

  if (url.includes('analyze-team')) {
    const chatHistory = data.chatHistory || {};
    const totalMessages = Object.values(chatHistory).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    const memberCount = Object.keys(chatHistory).length;

    return {
      summary: `Simulated analysis based on ${totalMessages} messages from ${memberCount} channels. Team activity looks healthy.`,
      highlights: [
        'Regular updates were provided across the team.',
        'Several messages mentioned progress and next steps.',
        'No major blockers were detected in the chat stream.',
      ],
      recommendations: [
        'Keep syncing in chat and turn key updates into tasks.',
        'Revisit the task list weekly to keep momentum.',
        'Tag clear owners for action items in chat.',
      ],
    };
  }

  return { summary: 'Demo mode response (no backend).' };
}

const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('chatInput');

const formatTime = (date) => {
  const h = date.getHours();
  const m = date.getMinutes();
  const pad = (v) => String(v).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${pad(m)} ${ampm}`;
};

const createMessageElement = ({ sender, text, ts, type }) => {
  const message = document.createElement('div');
  message.className = `message message--${type}`;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = `<span>${sender}</span><span>${formatTime(new Date(ts))}</span>`;

  const content = document.createElement('div');
  content.className = 'content';
  content.textContent = text;

  message.appendChild(meta);
  message.appendChild(content);

  return message;
};

const renderMessages = (messages) => {
  messagesEl.innerHTML = '';
  messages.forEach((msg) => messagesEl.appendChild(createMessageElement(msg)));
  messagesEl.scrollTop = messagesEl.scrollHeight;
};

const loadMessages = () => {
  const raw = localStorage.getItem(currentStorageKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const saveMessages = (messages) => {
  localStorage.setItem(currentStorageKey, JSON.stringify(messages));
};

const setChatKey = (key) => {
  currentStorageKey = key || DEFAULT_STORAGE_KEY;
  renderMessages(loadMessages());
};

window.setChatKey = setChatKey;

const addMessage = (text, sender = 'You', type = 'me') => {
  const messages = loadMessages();
  const message = {
    sender,
    text,
    ts: Date.now(),
    type,
  };
  messages.push(message);
  saveMessages(messages);
  renderMessages(messages);
};

const addBotReply = (text) => {
  const messages = loadMessages();
  const message = {
    sender: 'Bot',
    text,
    ts: Date.now(),
    type: 'bot',
  };
  messages.push(message);
  saveMessages(messages);
  renderMessages(messages);
};

const handleSend = async () => {
  const text = inputEl.value.trim();
  if (!text) return;

  // 1. Add your message to the UI instantly
  addMessage(text, 'You', 'me');
  inputEl.value = '';

  // 2. Fire off the classification to n8n in the background
  callN8N(N8N_URLS.classify, { message: text }).then((classification) => {
    if (classification) {
      console.log('AI Classified message as:', classification);
      // Optional: Add a small UI update here later if you have time
    }
  });

  // 3. Keep your existing dummy bot reply for the showcase
  setTimeout(() => {
    addBotReply("Got it. I've logged that update.");
  }, 900);

  // 4. Simulate a quick AI note about the update
  setTimeout(() => {
    addBotReply("AI Note: This looks like progress. You can press 'Judge Contributions' to get a quick summary.");
  }, 1600);
};

inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSend();
  }
});

// Initialize
setChatKey(DEFAULT_STORAGE_KEY);

// If no messages exist, add a dummy bot message.
if (loadMessages().length === 0) {
  addBotReply('Welcome! Type a message and press Enter to chat.');
}

// --- Contribution judging (n8n webhook) ---

function harvestTeamData() {
  // Get the active team (e.g., 'alpha') from the sidebar
  const activeIcon = document.querySelector('.team-icon.active');
  const teamKey = activeIcon ? activeIcon.dataset.team : 'alpha';
  const team = window.teams?.[teamKey] || {};

  // Gather all chat history for this specific team
  const chatData = {
    global: JSON.parse(localStorage.getItem(`${teamKey}_global`) || '[]'),
  };

  (team.members || []).forEach((m) => {
    const key = `${teamKey}_${m.id}`;
    chatData[m.id] = JSON.parse(localStorage.getItem(key) || '[]');
  });

  return {
    projectName: team.name || teamKey,
    teamStructure: team.members || [],
    existingTasks: team.tasks || [],
    allMessages: chatData,
  };
}

// --- AI FEATURES ---

// Helper to get the currently selected team name from the UI
function getActiveTeamName() {
  const activeIcon = document.querySelector('.team-icon.active');
  return activeIcon ? activeIcon.dataset.team : 'Unknown Team';
}

// 1. AI PLANNER (Fake demo flow)
document.getElementById('btn-planner')?.addEventListener('click', async () => {
  const taskList = document.getElementById('taskList');
  const originalHTML = taskList.innerHTML;

  taskList.innerHTML = '<div class="task-card" style="text-align:center;">🤖 AI is generating tasks...</div>';

  const result = await callN8N(N8N_URLS.planner, {
    projectName: getActiveTeamName(),
  });

  if (result) {
    taskList.innerHTML = '<h3 style="padding:15px; font-size:14px; color:#555;">AI Assigned Tasks</h3>';
    const tasks = Array.isArray(result) ? result : [result];
    tasks.forEach((task) => {
      taskList.innerHTML += `
        <div class="task-card">
          <div class="task-title">${task.title || 'New Task'}</div>
          <div class="task-desc">${task.description || JSON.stringify(task)}</div>
        </div>`;
    });
  } else {
    taskList.innerHTML = originalHTML;
    alert('AI Planner failed (demo mode).');
  }
});

// --- AI JUDGE (Fake demo mode) ---
const triggerJudge = async () => {
  const taskList = document.getElementById('taskList');
  const originalHTML = taskList.innerHTML;

  taskList.innerHTML = '<div class="task-card" style="text-align:center;">📊 AI is analyzing the conversation...</div>';

  // This function gathers ALL chat history for the team, not just the current screen
  const teamData = harvestTeamData();

  const result = await callN8N(N8N_URLS.performance, {
    teamName: teamData.projectName,
    members: teamData.teamStructure,
    chatHistory: teamData.allMessages,
  });

  if (result) {
    const highlights = Array.isArray(result.highlights) ? result.highlights : [];
    const recs = Array.isArray(result.recommendations) ? result.recommendations : [];

    taskList.innerHTML = '<h3 style="padding:15px; font-size:14px; color:#555;">AI Contribution Report</h3>';

    taskList.innerHTML += `
      <div class="task-card">
        <div class="task-title">Team Verdict</div>
        <div class="task-desc">${result.summary || 'Looks good!'}<br /><br />Based on conversation activity, here are some highlights and suggestions.</div>
      </div>`;

    if (highlights.length) {
      taskList.innerHTML += `
        <div class="task-card">
          <div class="task-title">Highlights</div>
          <div class="task-desc">${highlights.map((h) => `• ${h}`).join('<br>')}</div>
        </div>`;
    }

    if (recs.length) {
      taskList.innerHTML += `
        <div class="task-card">
          <div class="task-title">Recommendations</div>
          <div class="task-desc">${recs.map((r) => `• ${r}`).join('<br>')}</div>
        </div>`;
    }
  } else {
    taskList.innerHTML = originalHTML;
    alert('AI Judge failed (demo mode).');
  }
};

document.getElementById('btn-judge')?.addEventListener('click', triggerJudge);
document.getElementById('judgeBtn')?.addEventListener('click', triggerJudge);

