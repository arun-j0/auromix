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

export interface Company {
  id: string
  name: string
  email: string
  phone: string
  contactPerson: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export const createCompany = async (companyData: Omit<Company, "id" | "createdAt" | "updatedAt">) => {
  try {
    const companyRef = doc(collection(db, "companies"))
    const company: Company = {
      ...companyData,
      id: companyRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(companyRef, {
      ...company,
      createdAt: Timestamp.fromDate(company.createdAt),
      updatedAt: Timestamp.fromDate(company.updatedAt),
    })

    return company
  } catch (error: any) {
    throw new Error(`Failed to create company: ${error.message}`)
  }
}

export const getCompany = async (companyId: string): Promise<Company | null> => {
  try {
    const companyDoc = await getDoc(doc(db, "companies", companyId))
    if (!companyDoc.exists()) {
      return null
    }

    const data = companyDoc.data()
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as Company
  } catch (error: any) {
    throw new Error(`Failed to get company: ${error.message}`)
  }
}

export const getAllCompanies = async (): Promise<Company[]> => {
  try {
    const companiesQuery = query(collection(db, "companies"), orderBy("createdAt", "desc"))
    const companiesSnapshot = await getDocs(companiesQuery)

    return companiesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Company
    })
  } catch (error: any) {
    throw new Error(`Failed to get companies: ${error.message}`)
  }
}

export const updateCompany = async (companyId: string, updates: Partial<Company>) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    await updateDoc(doc(db, "companies", companyId), updateData)
  } catch (error: any) {
    throw new Error(`Failed to update company: ${error.message}`)
  }
}

export const deleteCompany = async (companyId: string) => {
  try {
    await deleteDoc(doc(db, "companies", companyId))
  } catch (error: any) {
    throw new Error(`Failed to delete company: ${error.message}`)
  }
}

// Fixed: Remove the compound index requirement
export const getActiveCompanies = async (): Promise<Company[]> => {
  try {
    // Simple query without compound index
    const companiesQuery = query(collection(db, "companies"), where("isActive", "==", true))
    const companiesSnapshot = await getDocs(companiesQuery)

    const companies = companiesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Company
    })

    // Sort in memory instead of using Firestore orderBy
    return companies.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error: any) {
    throw new Error(`Failed to get active companies: ${error.message}`)
  }
}
