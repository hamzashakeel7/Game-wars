const fs = require("fs");

const content = `
export const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
  databaseURL: "${process.env.FIREBASE_DATABASE_URL}",
  projectId: "${process.env.FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.FIREBASE_APP_ID}",
  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"
};
`;

fs.writeFile("config.js", content, (err) => {
  if (err) {
    console.error("Error creating config.js:", err);
    process.exit(1);
  } else {
    console.log(
      "✅ config.js created successfully from Environment Variables!"
    );
  }
});
