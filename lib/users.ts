import { db } from "./firebase"
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase"

export interface User {
  uid: string
  name: string
  email: string
  phone?: string
  role: "admin" | "agent" | "employee"
  agentId?: string
  skills?: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export const createUser = async (userData: {
  email: string
  password: string
  name: string
  role: "admin" | "agent" | "employee"
  phone?: string
  agentId?: string
  skills?: string[]
}) => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
    const firebaseUser = userCredential.user

    // Create user document in Firestore
    const user: User = {
      uid: firebaseUser.uid,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role,
      agentId: userData.agentId,
      skills: userData.skills || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Remove undefined fields
    const cleanUser = Object.fromEntries(Object.entries(user).filter(([_, v]) => v !== undefined))

    await setDoc(doc(db, "users", firebaseUser.uid), {
      ...cleanUser,
      createdAt: Timestamp.fromDate(user.createdAt),
      updatedAt: Timestamp.fromDate(user.updatedAt),
    })

    return user
  } catch (error: any) {
    throw new Error(`Failed to create user: ${error.message}`)
  }
}

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId))
    if (!userDoc.exists()) {
      return null
    }

    const data = userDoc.data()
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as User
  } catch (error: any) {
    throw new Error(`Failed to get user: ${error.message}`)
  }
}

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))
    const usersSnapshot = await getDocs(usersQuery)

    return usersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as User
    })
  } catch (error: any) {
    throw new Error(`Failed to get users: ${error.message}`)
  }
}

export const updateUser = async (userId: string, updates: Partial<User>) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    // Remove undefined fields
    const cleanUpdates = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined))

    await updateDoc(doc(db, "users", userId), cleanUpdates)
  } catch (error: any) {
    throw new Error(`Failed to update user: ${error.message}`)
  }
}

export const deleteUser = async (userId: string) => {
  try {
    await deleteDoc(doc(db, "users", userId))
  } catch (error: any) {
    throw new Error(`Failed to delete user: ${error.message}`)
  }
}

export const getAgents = async (): Promise<User[]> => {
  try {
    const agentsQuery = query(collection(db, "users"), where("role", "==", "agent"), where("isActive", "==", true))
    const agentsSnapshot = await getDocs(agentsQuery)

    return agentsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as User
    })
  } catch (error: any) {
    throw new Error(`Failed to get agents: ${error.message}`)
  }
}

export const getEmployees = async (): Promise<User[]> => {
  try {
    const employeesQuery = query(
      collection(db, "users"),
      where("role", "==", "employee"),
      where("isActive", "==", true),
    )
    const employeesSnapshot = await getDocs(employeesQuery)

    return employeesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as User
    })
  } catch (error: any) {
    throw new Error(`Failed to get employees: ${error.message}`)
  }
}

export const getEmployeesByAgent = async (agentId: string): Promise<User[]> => {
  try {
    const employeesQuery = query(
      collection(db, "users"),
      where("role", "==", "employee"),
      where("agentId", "==", agentId),
      where("isActive", "==", true),
    )
    const employeesSnapshot = await getDocs(employeesQuery)

    return employeesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as User
    })
  } catch (error: any) {
    throw new Error(`Failed to get employees by agent: ${error.message}`)
  }
}
