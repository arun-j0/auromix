import { auth, db } from "./firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore"

export interface User {
  uid: string
  email: string
  name: string
  role: "admin" | "agent" | "employee"
  agentId?: string
  createdAt: Date
  isActive: boolean
}

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))

    if (!userDoc.exists()) {
      throw new Error("User data not found")
    }

    const userData = userDoc.data()
    if (!userData.isActive) {
      throw new Error("Account is deactivated")
    }

    return { user: userCredential.user, userData }
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const registerUser = async (userData: {
  email: string
  password: string
  name: string
  role: "admin" | "agent" | "employee"
  agentId?: string
}) => {
  try {
    // Check if email already exists
    const existingUserQuery = query(collection(db, "users"), where("email", "==", userData.email))
    const existingUsers = await getDocs(existingUserQuery)

    if (!existingUsers.empty) {
      throw new Error("Email already exists")
    }

    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)

    const newUser: User = {
      uid: userCredential.user.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      ...(userData.agentId && { agentId: userData.agentId }),
      createdAt: new Date(),
      isActive: true,
    }

    await setDoc(doc(db, "users", userCredential.user.uid), newUser)

    return { user: userCredential.user, userData: newUser }
  } catch (error: any) {
    throw new Error(error.message)
  }
}

export const logoutUser = async () => {
  try {
    await signOut(auth)
  } catch (error: any) {
    throw new Error(error.message)
  }
}

// Get dashboard route based on user role
export const getDashboardRoute = (role: "admin" | "agent" | "employee"): string => {
  switch (role) {
    case "admin":
      return "/admin/dashboard"
    case "agent":
      return "/agent/dashboard"
    case "employee":
      return "/employee/dashboard"
    default:
      return "/"
  }
}

// Initialize default admin account
export const initializeDefaultAdmin = async () => {
  try {
    const adminEmail = "arun2310kumar2002@gmail.com"
    const adminPassword = "auromix@admin"

    // Check if admin already exists
    const adminQuery = query(collection(db, "users"), where("email", "==", adminEmail))
    const adminDocs = await getDocs(adminQuery)

    if (adminDocs.empty) {
      await registerUser({
        email: adminEmail,
        password: adminPassword,
        name: "Arun Kumar",
        role: "admin",
      })
      console.log("Default admin account created")
    }
  } catch (error) {
    console.error("Error creating default admin:", error)
  }
}
