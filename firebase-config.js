// firebase-config.js
// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDZoRMLZhhK1E7dAjekeMsvKU5F5cbvQSc",
  authDomain: "quote-madness.firebaseapp.com",
  projectId: "quote-madness",
  storageBucket: "quote-madness.firebasestorage.app",
  messagingSenderId: "247158455721",
  appId: "1:247158455721:web:f63236c09d74ea95fa98b8",
  measurementId: "G-8GM9KY3T5K"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Make db available globally
window.db = db; // Add this line
