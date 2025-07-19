// Initialize default admin account and setup Firebase
import { initializeApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { getFirestore, doc, setDoc, collection, getDocs, query, where } from "firebase/firestore"

const firebaseConfig = {
  // Add your Firebase config here
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function initializeDefaultAdmin() {
  try {
    const adminEmail = "arun2310kumar2002@gmail.com"
    const adminPassword = "auromix@admin"

    // Check if admin already exists
    const adminQuery = query(collection(db, "users"), where("email", "==", adminEmail))
    const adminDocs = await getDocs(adminQuery)

    if (adminDocs.empty) {
      // Create admin user
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword)

      // Save admin data to Firestore
      const adminData = {
        uid: userCredential.user.uid,
        email: adminEmail,
        name: "Arun Kumar",
        role: "admin",
        createdAt: new Date(),
        isActive: true,
      }

      await setDoc(doc(db, "users", userCredential.user.uid), adminData)

      console.log("✅ Default admin account created successfully!")
      console.log("Email:", adminEmail)
      console.log("Password:", adminPassword)
    } else {
      console.log("ℹ️ Default admin account already exists")
    }
  } catch (error) {
    console.error("❌ Error creating default admin:", error)
  }
}

// Run initialization
initializeDefaultAdmin()
