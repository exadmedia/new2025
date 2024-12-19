import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBdTU5BGfpHiFfQ18q7DybNpNI31mX9d74",
  authDomain: "snake-game-ranking-61539.firebaseapp.com",
  projectId: "snake-game-ranking-61539",
  storageBucket: "snake-game-ranking-61539.appspot.com",
  messagingSenderId: "1038086841957",
  appId: "1:1038086841957:web:d03ed9aad56afa3d03488c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

