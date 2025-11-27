const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
require("dotenv").config();

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    process.env.FIREBASE_DATABASE_URL ||
    "https://your-project-id.firebaseio.com",
});

const db = admin.firestore();

async function initializeFirestore() {
  try {
    console.log("🚀 Initializing Firestore collections...");

    // 1. Clear existing data (optional - hati-hati di production!)
    // await clearExistingData();

    // 2. Add sample words
    const words = [
      { word: "apple", difficulty: "easy" },
      { word: "banana", difficulty: "easy" },
      { word: "cat", difficulty: "easy" },
      { word: "dog", difficulty: "easy" },
      { word: "elephant", difficulty: "easy" },
      { word: "fish", difficulty: "easy" },
      { word: "house", difficulty: "medium" },
      { word: "car", difficulty: "medium" },
      { word: "tree", difficulty: "medium" },
      { word: "sun", difficulty: "medium" },
      { word: "flower", difficulty: "medium" },
      { word: "computer", difficulty: "hard" },
      { word: "mountain", difficulty: "hard" },
      { word: "butterfly", difficulty: "hard" },
      { word: "restaurant", difficulty: "hard" },
      { word: "adventure", difficulty: "hard" },
    ];

    let wordsCount = 0;
    for (const wordData of words) {
      await db.collection("words").add(wordData);
      wordsCount++;
      console.log(`Added word: ${wordData.word}`);
    }

    console.log(`✅ Words collection initialized with ${wordsCount} words`);

    // 3. Create other collections with one dummy document
    const collections = ["rooms", "players", "messages", "drawings"];

    for (const collectionName of collections) {
      // Add one dummy document to create the collection
      await db.collection(collectionName).doc("init").set({
        note: "Initialization document - can be deleted",
        initializedAt: admin.firestore.FieldValue.serverTimestamp(),
        purpose: "To create the collection structure",
      });
      console.log(`✅ ${collectionName} collection created`);
    }

    console.log("🎉 Firestore initialization completed!");
    console.log(
      "📊 Collections created: words, rooms, players, messages, drawings"
    );
    console.log(
      "📍 You can now delete the initialization documents from rooms, players, messages, drawings"
    );

    process.exit(0); // Exit script setelah selesai
  } catch (error) {
    console.error("❌ Error initializing Firestore:", error);
    process.exit(1); // Exit dengan error code
  }
}

// Optional: Function untuk clear existing data (HATI-HATI!)
async function clearExistingData() {
  console.log("⚠️  Clearing existing data...");

  const collections = ["words", "rooms", "players", "messages", "drawings"];

  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleared ${snapshot.size} documents from ${collectionName}`);
  }
}

// Jalankan script
initializeFirestore();
