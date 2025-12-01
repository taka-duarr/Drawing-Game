const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const admin = require("firebase-admin");
require("dotenv").config();

// Initialize Firebase dengan Realtime Database
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://drawing-game-app-default-rtdb.firebaseio.com/",
});

const db = admin.database();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.use(express.json());

// Store active connections in memory
const activeRooms = new Map();
const activePlayers = new Map();

// WebSocket Connection Handler
wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.playerId = null;
  ws.roomId = null;

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);
      await handleWebSocketMessage(ws, message);
    } catch (error) {
      console.error("Error handling message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Invalid message format",
        })
      );
    }
  });

  ws.on("close", async () => {
    await handlePlayerDisconnect(ws);
  });
});

async function handleWebSocketMessage(ws, message) {
  const { type, data } = message;
  console.log("📨 Received:", type);

  switch (type) {
    case "create_room":
      await createRoom(ws, data);
      break;
    case "join_room":
      await joinRoom(ws, data);
      break;
    case "start_game":
      await startGame(ws, data);
      break;
    case "chat_message":
      await handleChatMessage(ws, data);
      break;
    case "draw":
      await handleDrawing(ws, data);
      break;
    case "clear_canvas":
      await handleClearCanvas(ws, data);
      break;
    case "leave_game":
      await handleLeaveGame(ws, data);
      break;
  }
}

async function startGame(ws, data) {
  const roomId = ws.roomId;

  if (!roomId) {
    ws.send(
      JSON.stringify({
        type: "error",
        data: "Not in a room",
      })
    );
    return;
  }

  try {
    const room = activeRooms.get(roomId);
    if (!room) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Room not found",
        })
      );
      return;
    }

    // Check if user is host
    const player = room.players.get(ws.playerId);
    if (!player || !player.isHost) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Only host can start game",
        })
      );
      return;
    }

    // Update room status in Realtime Database
    const roomRef = db.ref(`rooms/${roomId}`);
    await roomRef.update({
      status: "playing",
      updatedAt: Date.now(),
    });

    // Update in memory
    room.gameState = "playing";

    // Setup real-time listeners for this room
    setupRealtimeListeners(roomId);

    // Broadcast game started
    broadcastToRoom(roomId, {
      type: "players_update",
      data: {
        players: Array.from(room.players.entries()).map(([pid, p]) => ({
          id: pid,
          username: p.username,
          score: p.score,
          isDrawing: p.isDrawing,
          isHost: p.isHost,
        })),
      },
    });

    console.log(`🎮 Game started in room ${roomId}`);

    // Start first round after short delay
    setTimeout(() => {
      startNewRound(roomId);
    }, 2000);
  } catch (error) {
    console.error("Error starting game:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        data: "Failed to start game: " + error.message,
      })
    );
  }
}

async function startNewRound(roomId) {
  try {
    const room = activeRooms.get(roomId);
    if (!room) return;

    room.roundAnswered = false;
    room.roundActive = true;

    const words = [

      { word: "apel", difficulty: "easy" },
      { word: "bola", difficulty: "easy" },
      { word: "buku", difficulty: "easy" },
      { word: "ikan", difficulty: "easy" },
      { word: "kucing", difficulty: "easy" },
      { word: "gelas", difficulty: "easy" },
      { word: "bintang", difficulty: "easy" },

      { word: "gunting", difficulty: "medium" },
      { word: "camera", difficulty: "medium" },
      { word: "pisang", difficulty: "medium" },
      { word: "roti", difficulty: "medium" },
      { word: "tas", difficulty: "medium" },
      { word: "pintu", difficulty: "medium" },
      { word: "kue", difficulty: "medium" },
      { word: "kapal", difficulty: "medium" },
      { word: "kursi", difficulty: "medium" },
      { word: "topi", difficulty: "medium" },
      { word: "boneka", difficulty: "medium" },
      { word: "sendok", difficulty: "medium" },
      { word: "garpu", difficulty: "medium" },
      { word: "obor", difficulty: "medium" },
      { word: "kuda", difficulty: "medium" },
      { word: "serigala", difficulty: "medium" },
      { word: "domba", difficulty: "medium" },
      { word: "singa", difficulty: "medium" },
      { word: "robot", difficulty: "medium" },
      { word: "televisi", difficulty: "medium" },

      { word: "menara", difficulty: "hard" },
      { word: "jembatan", difficulty: "hard" },
      { word: "helm astronot", difficulty: "hard" },
      { word: "kereta api", difficulty: "hard" },
      { word: "gorila", difficulty: "hard" },
      { word: "kamera CCTV", difficulty: "hard" },
      { word: "teropong", difficulty: "hard" },
      { word: "zombie", difficulty: "hard" },
      { word: "naga", difficulty: "hard" },
      { word: "pulau", difficulty: "hard" },
      { word: "kompor gas", difficulty: "hard" },
      { word: "studio musik", difficulty: "hard" },
      { word: "sampan", difficulty: "hard" },
      { word: "jendela kaca", difficulty: "hard" },
      { word: "papan selancar", difficulty: "hard" },
      { word: "satelit", difficulty: "hard" },
      { word: "karpet terbang", difficulty: "hard" },
      { word: "otak manusia", difficulty: "hard" },
      { word: "penyihir", difficulty: "hard" },
      { word: "kapak", difficulty: "hard" },
      { word: "rumah sakit", difficulty: "hard" },
      { word: "malam hari", difficulty: "hard" },
      { word: "tangga darurat", difficulty: "hard" },
      { word: "kotak harta karun", difficulty: "hard" },
      { word: "kepala suku", difficulty: "hard" },
      { word: "drum band", difficulty: "hard" },
      { word: "kincir angin", difficulty: "hard" },
      { word: "suku pedalaman", difficulty: "hard" },
      { word: "labirin", difficulty: "hard" },
      { word: "mesin waktu", difficulty: "hard" },
      { word: "tong sampah", difficulty: "hard" },
      { word: "pramugari", difficulty: "hard" },
      { word: "monster laut", difficulty: "hard" },
      { word: "kabut tebal", difficulty: "hard" },
      { word: "hutan gelap", difficulty: "hard" },
      { word: "ban motor", difficulty: "hard" },
      { word: "gembok", difficulty: "hard" },
      { word: "lemari es", difficulty: "hard" },
      { word: "lilin meleleh", difficulty: "hard" },
      { word: "kecanduan game", difficulty: "hard" },

      { word: "kapal selam", difficulty: "very hard" },
      { word: "feniks", difficulty: "very hard" },
      { word: "meteor jatuh", difficulty: "very hard" },
      { word: "dimensi portal", difficulty: "very hard" },
      { word: "pengendali petir", difficulty: "very hard" },
      { word: "mesin pembelah atom", difficulty: "very hard" },
      { word: "perpustakaan kuno", difficulty: "very hard" },
      { word: "pirates vs kraken", difficulty: "very hard" },
      { word: "kerajaan bawah laut", difficulty: "very hard" },
      { word: "istana es", difficulty: "very hard" },
      { word: "perang laser", difficulty: "very hard" },
      { word: "tornado api", difficulty: "very hard" },
      { word: "patung kolosal", difficulty: "very hard" },
      { word: "pionir bulan", difficulty: "very hard" },
      { word: "robot raksasa", difficulty: "very hard" },
      { word: "serangga mekanik", difficulty: "very hard" },
      { word: "monster hutan", difficulty: "very hard" },
      { word: "rumah berhantu", difficulty: "very hard" },
      { word: "kapal alien", difficulty: "very hard" },
      { word: "singgasana emas", difficulty: "very hard" },
      { word: "kuil terkutuk", difficulty: "very hard" },
      { word: "badai salju", difficulty: "very hard" },
      { word: "penjaga gerbang neraka", difficulty: "very hard" },
      { word: "kubah kaca raksasa", difficulty: "very hard" },
      { word: "markas rahasia", difficulty: "very hard" },
      { word: "pulau tenggelam", difficulty: "very hard" },
      { word: "mesin perang kuno", difficulty: "very hard" },
      { word: "sungai lava", difficulty: "very hard" },
      { word: "taman labirin raksasa", difficulty: "very hard" },
      { word: "kota cyberpunk", difficulty: "very hard" },
      { word: "menara sihir", difficulty: "very hard" },
      { word: "pohon raksasa", difficulty: "very hard" },
      { word: "prajurit bayangan", difficulty: "very hard" },
      { word: "drone pemantau", difficulty: "very hard" },
      { word: "penyihir api", difficulty: "very hard" },
      { word: "koloni mars", difficulty: "very hard" },
      { word: "kereta hantu", difficulty: "very hard" },
      { word: "temple guardian", difficulty: "very hard" },
      { word: "dimensi astral", difficulty: "very hard" },
      { word: "raja naga", difficulty: "very hard" },
    ];


    if (words.length === 0) {
      console.error("No words found");
      return;
    }

    const randomWord = words[Math.floor(Math.random() * words.length)];

    // Select random drawer
    const players = Array.from(room.players.values());

    // Inisialisasi jika belum ada
    if (room.drawerIndex === undefined) room.drawerIndex = 0;

    // Reset jika sudah sampai akhir
    if (room.drawerIndex >= players.length) room.drawerIndex = 0;

    // Tentukan drawer berdasarkan urutan pemain
    const drawer = players[room.drawerIndex];

    // Untuk ronde berikutnya
    room.drawerIndex++;


    // Reset drawing status for all players
    room.players.forEach((player) => {
      player.isDrawing = false;
    });

    // Set new drawer
    drawer.isDrawing = true;
    room.drawer = drawer;
    room.currentWord = randomWord.word;
    room.round = (room.round || 0) + 1;

    // Update room in database
    await db.ref(`rooms/${roomId}`).update({
      currentRound: room.round,
      updatedAt: Date.now(),
    });

    // Create hint (first letter only)
    const hint = randomWord.word.split('').map((char, index) => 
      index === 0 ? char : '_'
    ).join(' ');

    // Notify all players about new round
    broadcastToRoom(roomId, {
      type: "new_round",
      data: {
        round: room.round,
        drawer: {
          playerId: getPlayerIdByWS(room.players, drawer.ws),
          username: drawer.username,
        },
        wordLength: randomWord.word.length,
        hint: hint,
        difficulty: randomWord.difficulty,

        // --- FIX: Kirim daftar pemain ---
        players: Array.from(room.players.entries()).map(([pid, p]) => ({
          id: pid,
          username: p.username,
          score: p.score,
          isDrawing: p.isDrawing,
          isHost: p.isHost,
        })),
      },
    });


    // Notify drawer with the actual word
    drawer.ws.send(
      JSON.stringify({
        type: "you_are_drawing",
        data: {
          word: randomWord.word,
          round: room.round,
        },
      })
    );

    console.log(`🔄 Round ${room.round} started in room ${roomId}`);
    console.log(`🎨 Drawer: ${drawer.username}, Word: ${randomWord.word}`);

  } catch (error) {
    console.error("Error starting new round:", error);
  }
}

function getPlayerIdByWS(playersMap, ws) {
  for (let [playerId, player] of playersMap) {
    if (player.ws === ws) return playerId;
  }
  return null;
}

async function createRoom(ws, data) {
  const { username } = data;

  try {
    const roomId = generateRoomId();
    const playerId = generatePlayerId();

    // Create room in Realtime Database
    const roomRef = db.ref(`rooms/${roomId}`);
    await roomRef.set({
      name: `Room ${roomId}`,
      hostId: playerId,
      maxPlayers: 8,
      currentPlayers: 1,
      status: "waiting",
      currentRound: 0,
      maxRounds: 3,
      createdAt: Date.now(),
    });

    // Create player in Realtime Database
    const playerRef = db.ref(`players/${playerId}`);
    await playerRef.set({
      username: username.trim(),
      roomId: roomId,
      score: 0,
      isDrawing: false,
      isHost: true,
      joinedAt: Date.now(),
    });

    // Add player to room's players list
    await db.ref(`roomPlayers/${roomId}/${playerId}`).set(true);

    ws.playerId = playerId;
    ws.roomId = roomId;

    // Initialize in-memory room
    const roomData = {
      players: new Map([
        [
          playerId,
          {
            ws,
            username: username.trim(),
            score: 0,
            isDrawing: false,
            isHost: true,
          },
        ],
      ]),
      currentWord: null,
      drawer: null,
      round: 0,
      gameState: "waiting",
    };

    activeRooms.set(roomId, roomData);
    activePlayers.set(playerId, { ws, roomId });

    ws.send(
      JSON.stringify({
        type: "room_created",
        data: { roomId, playerId, username: username.trim() },
      })
    );

    console.log(`Room ${roomId} created by ${username}`);
  } catch (error) {
    console.error("Error creating room:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        data: "Failed to create room: " + error.message,
      })
    );
  }
}

async function joinRoom(ws, data) {
  const { roomId, username } = data;

  try {
    // Check if room exists in Realtime Database
    const roomRef = db.ref(`rooms/${roomId}`);
    const roomSnapshot = await roomRef.once("value");
    const roomData = roomSnapshot.val();

    if (!roomData) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Room not found",
        })
      );
      return;
    }

    if (roomData.status !== "waiting") {
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Game has already started",
        })
      );
      return;
    }

    if (roomData.currentPlayers >= roomData.maxPlayers) {
      ws.send(
        JSON.stringify({
          type: "error",
          data: "Room is full",
        })
      );
      return;
    }

    const playerId = generatePlayerId();

    // Update room player count in Realtime Database
    await roomRef.update({
      currentPlayers: roomData.currentPlayers + 1,
    });

    // Create player in Realtime Database
    const playerRef = db.ref(`players/${playerId}`);
    await playerRef.set({
      username: username.trim(),
      roomId: roomId,
      score: 0,
      isDrawing: false,
      isHost: false,
      joinedAt: Date.now(),
    });

    // Add to room's players list
    await db.ref(`roomPlayers/${roomId}/${playerId}`).set(true);

    ws.playerId = playerId;
    ws.roomId = roomId;

    // Initialize in memory if not exists
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        players: new Map(),
        currentWord: null,
        drawer: null,
        round: 0,
        gameState: "waiting",
      });
    }

    const activeRoom = activeRooms.get(roomId);
    activeRoom.players.set(playerId, {
      ws,
      username: username.trim(),
      score: 0,
      isDrawing: false,
      isHost: false,
    });

    activePlayers.set(playerId, { ws, roomId });

    // Save chat message to Realtime Database
    const messageRef = db.ref(`messages/${roomId}`).push();
    await messageRef.set({
      playerId: playerId,
      username: username.trim(),
      message: `${username.trim()} joined the game`,
      type: "system",
      timestamp: Date.now(),
    });

    ws.send(
      JSON.stringify({
        type: "room_joined",
        data: { roomId, playerId, username: username.trim() },
      })
    );

    // Broadcast to other players
    broadcastToRoom(roomId, {
      type: "player_joined",
      data: {
        playerId: playerId,
        username: username.trim(),
        players: Array.from(activeRoom.players.values()).map((p) => ({
          id: p.ws?.playerId || playerId,
          username: p.username,
          score: p.score,
          isDrawing: p.isDrawing,
          isHost: p.isHost,
        })),
      },
    });

    console.log(`Player ${username} joined room ${roomId}`);
  } catch (error) {
    console.error("Error joining room:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        data: "Failed to join room: " + error.message,
      })
    );
  }
}

async function handleDrawing(ws, data) {
  const roomId = ws.roomId;
  if (!roomId) return;

  const room = activeRooms.get(roomId);
  if (!room) return;

  const player = room.players.get(ws.playerId);
  if (!player || !player.isDrawing) return;

  // FIX: Include action in drawing data
  const drawingData = {
    type: "draw",
    data: {
      ...data,
      playerId: ws.playerId,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };

  // Save to Realtime Database
  const drawingRef = db.ref(`drawings/${roomId}`).push();
  await drawingRef.set(drawingData);

  // Broadcast via WebSocket
  broadcastToRoom(
    roomId,
    {
      type: "draw",
      data: drawingData.data,
    },
    ws
  );

  console.log(`✏️ Drawing ${data.action} from ${player.username}`);
}

async function handleChatMessage(ws, data) {
  const { message } = data;
  const roomId = ws.roomId;

  try {
    const room = activeRooms.get(roomId);
    if (!room) return;

    const player = room.players.get(ws.playerId);
    if (!player) return;

    // Save message to Realtime Database
    const messageRef = db.ref(`messages/${roomId}`).push();
    await messageRef.set({
      playerId: ws.playerId,
      username: player.username,
      message: message,
      type: "chat",
      timestamp: Date.now(),
    });

    // Check for correct guess
    if (
      room.currentWord &&
      message.toLowerCase() === room.currentWord.toLowerCase() &&
      !player.isDrawing
    ) {
      await handleCorrectGuess(ws, roomId, player.username);
    }
  } catch (error) {
    console.error("Error handling chat:", error);
  }
}

async function handleCorrectGuess(ws, roomId, username) {
  try {
    const room = activeRooms.get(roomId);
    if (!room) return;

    if (room.roundAnswered) {
      console.log(
        `⚠️ Ignored late correct guess by ${username} in room ${roomId}`
      );
      // kirim notifikasi kecil ke player yang terlambat
      ws.send(
        JSON.stringify({
          type: "chat_message",
          data: {
            username: "System",
            message: "Jawaban diterima tapi sudah terlambat.",
            type: "system",
            timestamp: Date.now(),
          },
        })
      );
      return;
    }

    room.roundAnswered = true;
    room.roundActive = false;

    const WINNING_SCORE = 1000;
    const GUESSER_POINTS = 100;
    const DRAWER_POINTS = 50;

    // 1. Identifikasi Pemain
    const guesser = room.players.get(ws.playerId);
    const drawer = room.drawer; // Drawer disimpan di object room saat startNewRound

    if (!guesser || !drawer) return;

    // 2. Update Skor Penebak (+100)
    guesser.score += GUESSER_POINTS;
    await db.ref(`players/${ws.playerId}/score`).set(guesser.score);

    // 3. Update Skor Penggambar (+50)
    // Pastikan penggambar masih ada di room
    if (drawer && room.players.has(getPlayerIdByWS(room.players, drawer.ws))) {
      drawer.score += DRAWER_POINTS;
      const drawerId = getPlayerIdByWS(room.players, drawer.ws);
      await db.ref(`players/${drawerId}/score`).set(drawer.score);
    }

    // 4. Kirim Info Skor Terbaru ke Semua Client
    // Agar UI langsung update tanpa menunggu refresh
    broadcastToRoom(roomId, {
      type: "players_update",
      data: {
        players: Array.from(room.players.values()).map((p) => ({
          id: getPlayerIdByWS(room.players, p.ws),
          username: p.username,
          score: p.score,
          isDrawing: p.isDrawing,
          isHost: p.isHost,
        })),
      },
    });

    // 5. Broadcast Jawaban Benar
    broadcastToRoom(roomId, {
      type: "correct_guess",
      data: {
        username: username,
        word: room.currentWord,
        drawerName: drawer.username,
        guesserScore: guesser.score,
        drawerScore: drawer.score,
      },
    });

    // 6. CEK KEMENANGAN (Mencapai 1000 Poin)
    let winner = null;
    if (guesser.score >= WINNING_SCORE) winner = guesser;
    else if (drawer.score >= WINNING_SCORE) winner = drawer;

    if (winner) {
      // --- GAME OVER ---
      console.log(`🏆 WINNER: ${winner.username} in room ${roomId}`);

      broadcastToRoom(roomId, {
        type: "game_over",
        data: {
          winner: winner.username,
          score: winner.score,
        },
      });

      // Reset Room untuk game baru (Opsional: Reset skor semua orang)
      await resetRoomScores(roomId);

      // Update status room di DB
      await db
        .ref(`rooms/${roomId}`)
        .update({ status: "waiting", currentRound: 0 });
      room.gameState = "waiting";
      room.round = 0;
    } else {
      // --- LANJUT KE RONDE BERIKUTNYA ---
      setTimeout(() => {
        startNewRound(roomId);
      }, 3000); // Jeda 3 detik agar orang bisa lihat notif benar
    }
  } catch (error) {
    console.error("Error handling correct guess:", error);
  }
}

// Helper untuk reset skor (tambahkan di bawah handleCorrectGuess)
async function resetRoomScores(roomId) {
  const room = activeRooms.get(roomId);
  if (room) {
    for (let [pid, p] of room.players) {
      p.score = 0;
      p.isDrawing = false;
      await db.ref(`players/${pid}`).update({ score: 0, isDrawing: false });
    }
  }
}

// Setup real-time listeners untuk room
function setupRealtimeListeners(roomId) {
  // Listen untuk new messages
  db.ref(`messages/${roomId}`)
    .limitToLast(20)
    .on("child_added", (snapshot) => {
      const message = snapshot.val();
      broadcastToRoom(roomId, {
        type: "chat_message",
        data: message,
      });
    });

  // Listen untuk drawing data
  db.ref(`drawings/${roomId}`)
    .limitToLast(1)
    .on("child_added", (snapshot) => {
      const drawing = snapshot.val();
      if (drawing && drawing.type === "draw") {
        broadcastToRoom(roomId, {
          type: "draw",
          data: drawing.data,
        });
      }
    });

  // Listen untuk clear canvas
  db.ref(`drawings/${roomId}`)
    .limitToLast(1)
    .on("child_added", (snapshot) => {
      const drawing = snapshot.val();
      if (drawing && drawing.type === "clear") {
        broadcastToRoom(roomId, {
          type: "clear_canvas",
        });
      }
    });
}

async function handleClearCanvas(ws, data) {
  const roomId = ws.roomId;
  if (!roomId) return;

  const room = activeRooms.get(roomId);
  if (!room) return;

  const player = room.players.get(ws.playerId);
  if (!player || !player.isDrawing) return;

  // Save clear event to Realtime Database
  const drawingRef = db.ref(`drawings/${roomId}`).push();
  await drawingRef.set({
    type: "clear",
    playerId: ws.playerId,
    timestamp: Date.now(),
  });

  // Broadcast clear canvas
  broadcastToRoom(roomId, {
    type: "clear_canvas",
  });
}


async function handleLeaveGame(ws, data) {
  const roomId = ws.roomId;
  const playerId = ws.playerId;

  if (!roomId || !playerId) {
    ws.send(JSON.stringify({ type: "error", data: "Not in a room" }));
    return;
  }

  try {
    const room = activeRooms.get(roomId);

    // Jika room di memori sudah tidak ada, anggap user sudah keluar
    if (!room) {
      ws.send(
        JSON.stringify({
          type: "left_game",
          data: { message: "Successfully left" },
        })
      );
      return;
    }

    const player = room.players.get(playerId);
    if (!player) {
      // Player tidak ada di memori, kirim sukses saja
      ws.send(
        JSON.stringify({
          type: "left_game",
          data: { message: "Successfully left" },
        })
      );
      return;
    }

    console.log(`🚪 Player ${player.username} leaving room ${roomId}`);

    // 1. Hapus player dari Memory
    room.players.delete(playerId);
    activePlayers.delete(playerId);

    // 2. Cek database untuk jumlah pemain tersisa
    const roomRef = db.ref(`rooms/${roomId}`);
    const roomSnapshot = await roomRef.once("value");
    const roomData = roomSnapshot.val();

    // Hapus data player individual (ini selalu dilakukan entah room bubar atau tidak)
    await db.ref(`players/${playerId}`).remove();
    await db.ref(`roomPlayers/${roomId}/${playerId}`).remove();

    if (roomData) {
      const newPlayerCount = roomData.currentPlayers - 1;

      if (newPlayerCount <= 0) {
        // KASUS A: PEMAIN TERAKHIR (ROOM KOSONG)
        // Hapus seluruh room. JANGAN tulis pesan chat lagi.
        await cleanupRoom(roomId);
        console.log(`🧹 Room ${roomId} dihapus karena kosong.`);
      } else {
        // KASUS B: MASIH ADA PEMAIN LAIN

        // 1. Update jumlah player
        const updates = {
          currentPlayers: newPlayerCount,
        };

        // 2. Pindahkan Host jika perlu
        if (player.isHost) {
          const otherPlayers = Array.from(room.players.values());
          if (otherPlayers.length > 0) {
            const newHost = otherPlayers[0];
            newHost.isHost = true;
            updates.hostId = getPlayerIdByWS(room.players, newHost.ws);

            // Beritahu host baru
            if (newHost.ws.readyState === 1) {
              newHost.ws.send(
                JSON.stringify({
                  type: "you_are_host",
                  data: { message: "You are now the host" },
                })
              );
            }
          }
        }
        await roomRef.update(updates);

        // 3. Kirim Pesan Chat (HANYA DISINI)
        // Kita hanya kirim pesan jika masih ada orang yang membacanya
        const messageRef = db.ref(`messages/${roomId}`).push();
        await messageRef.set({
          playerId: "system",
          username: "System",
          message: `${player.username} left the game`,
          type: "system",
          timestamp: Date.now(),
        });

        // 4. Broadcast ke pemain yang tersisa
        broadcastToRoom(roomId, {
          type: "player_left",
          data: {
            playerId: playerId,
            username: player.username,
            players: Array.from(room.players.values()).map((p) => ({
              id: getPlayerIdByWS(room.players, p.ws),
              username: p.username,
              score: p.score,
              isDrawing: p.isDrawing,
              isHost: p.isHost,
            })),
          },
        });
      }
    }

    // Reset WebSocket connection
    ws.playerId = null;
    ws.roomId = null;

    // Send success response to leaving player
    ws.send(
      JSON.stringify({
        type: "left_game",
        data: { message: "Successfully left the game" },
      })
    );
  } catch (error) {
    console.error("Error handling leave game:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        data: "Failed to leave game: " + error.message,
      })
    );
  }
}

// Function untuk membersihkan room dari database
async function cleanupRoom(roomId) {
  try {
    console.log(`🧹 Cleaning up room ${roomId} from database`);
    
    // Hapus semua data room dari database
    await db.ref(`rooms/${roomId}`).remove();
    await db.ref(`roomPlayers/${roomId}`).remove();
    await db.ref(`messages/${roomId}`).remove();
    await db.ref(`drawings/${roomId}`).remove();
    
    // Hapus dari memory
    activeRooms.delete(roomId);
    
    console.log(`✅ Room ${roomId} completely cleaned up`);
  } catch (error) {
    console.error(`❌ Error cleaning up room ${roomId}:`, error);
  }
}

function broadcastToRoom(roomId, message, excludeWs = null) {
  const room = activeRooms.get(roomId);
  if (room) {
    room.players.forEach((player) => {
      if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerId() {
  return Math.random().toString(36).substring(2, 15);
}


async function handlePlayerDisconnect(ws) {
  if (ws.playerId && ws.roomId) {
    try {
      const playerId = ws.playerId;
      const roomId = ws.roomId;

      // Remove from memory
      activePlayers.delete(playerId);

      const room = activeRooms.get(roomId);
      if (room) {
        const player = room.players.get(playerId);
        room.players.delete(playerId);

        // Update Realtime Database
        await db.ref(`players/${playerId}`).remove();

        const roomRef = db.ref(`rooms/${roomId}`);
        const roomSnapshot = await roomRef.once("value");
        const roomData = roomSnapshot.val();

        if (roomData) {
          await roomRef.update({
            currentPlayers: roomData.currentPlayers - 1,
          });
        }

        await db.ref(`roomPlayers/${roomId}/${playerId}`).remove();

        // Create leave message
        if (player) {
          const messageRef = db.ref(`messages/${roomId}`).push();
          await messageRef.set({
            playerId: "system",
            username: "System",
            message: `${player.username} left the game`,
            type: "system",
            timestamp: Date.now(),
          });
        }

        // Broadcast player left
        broadcastToRoom(roomId, {
          type: "player_left",
          data: { playerId: playerId },
        });

        // Clean up empty rooms
        if (room.players.size === 0) {
          activeRooms.delete(roomId);
          await db.ref(`rooms/${roomId}`).remove();
          await db.ref(`roomPlayers/${roomId}`).remove();
        }
      }

      console.log(`Player ${playerId} disconnected from room ${roomId}`);
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔥 Connected to Firebase Realtime Database`);  
});
