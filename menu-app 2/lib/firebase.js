import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiqtehShSdB7IS35ZVyhCscEm0NFVjPTc",
  authDomain: "romantika-menu.firebaseapp.com",
  databaseURL: "https://romantika-menu-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "romantika-menu",
  storageBucket: "romantika-menu.firebasestorage.app",
  messagingSenderId: "71514423774",
  appId: "1:71514423774:web:53906b6fa2b424589ddd4f"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
