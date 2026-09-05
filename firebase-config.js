const firebaseConfig = {
  apiKey:            "AIzaSyDAnFIrlhxf2zkWoYO2N6i7ipf83Sum8Xw",
  authDomain:        "ik-coin.firebaseapp.com",
  projectId:         "ik-coin",
  storageBucket:     "ik-coin.firebasestorage.app",
  messagingSenderId: "176166261449",
  appId:             "1:176166261449:web:0ce818ef609f50b337b318"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.firebaseAuth    = firebase.auth();
window.db              = firebase.firestore();
window.googleProvider  = new firebase.auth.GoogleAuthProvider();

console.log('Firebase ready ✅', !!window.firebaseAuth, !!window.db);
