import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAmO-iIpavBEBJ3dBeIrf2odvVDKym84cE",
  authDomain: "fasttv-d138b.firebaseapp.com",
  projectId: "fasttv-d138b",
  storageBucket: "fasttv-d138b.firebasestorage.app",
  messagingSenderId: "385484262330",
  appId: "1:385484262330:web:06ce8e13c64ee2723feb83",
  measurementId: "G-DV6S4VSZ19",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestForToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey:
          "BMJ70aktfawsD6yVthtgEt4DmQiuSEGd6b9s65czjeBSrhh5pM4wBp63lWNTdhQry7LPHjzNXDW1ZacmZjQdtpk",
      });
      if (token) {
        console.log("FCM Token:", token);
        // BU TOKEnni Supabase'ga saqlab qo'ying (User ID bilan birga)
        return token;
      }
    }
  } catch (error) {
    console.error("Token olishda xato:", error);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
