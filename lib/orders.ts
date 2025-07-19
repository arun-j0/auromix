import { db } from "./firebase"
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore"

export interface Order {
  id: string
  orderNumber: string
  clientId: string
  clientName: string
  status: "pending" | "processing" | "completed" | "cancelled" | "delivered"
  products: Array<{
    productId: string
    productName: string
    productSpecs: string
    quantity: number
  }>
  assignedAgents: string[] // Array of agent UIDs
  assignedEmployees: string[] // Array of employee UIDs (for direct assignments)
  createdAt: Date
  updatedAt: Date
  dueDate: Date
  notes?: string
}

export const createOrder = async (orderData: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
  try {
    const orderRef = doc(collection(db, "orders"))
    const order: Order = {
      ...orderData,
      id: orderRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await setDoc(orderRef, {
      ...order,
      createdAt: Timestamp.fromDate(order.createdAt),
      updatedAt: Timestamp.fromDate(order.updatedAt),
      dueDate: Timestamp.fromDate(order.dueDate),
    })

    return order
  } catch (error: any) {
    throw new Error(`Failed to create order: ${error.message}`)
  }
}

export const getOrder = async (orderId: string): Promise<Order | null> => {
  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId))
    if (!orderDoc.exists()) {
      return null
    }

    const data = orderDoc.data()
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      dueDate: data.dueDate?.toDate() || new Date(),
    } as Order
  } catch (error: any) {
    throw new Error(`Failed to get order: ${error.message}`)
  }
}

export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"))
    const ordersSnapshot = await getDocs(ordersQuery)

    return ordersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        dueDate: data.dueDate?.toDate() || new Date(),
      } as Order
    })
  } catch (error: any) {
    throw new Error(`Failed to get orders: ${error.message}`)
  }
}

export const getOrdersAssignedToAgent = async (agentId: string): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("assignedAgents", "array-contains", agentId),
      orderBy("createdAt", "desc"),
    )
    const ordersSnapshot = await getDocs(ordersQuery)

    return ordersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        dueDate: data.dueDate?.toDate() || new Date(),
      } as Order
    })
  } catch (error: any) {
    throw new Error(`Failed to get orders assigned to agent: ${error.message}`)
  }
}

export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
  try {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    }

    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate)
    }

    // Remove undefined fields
    const cleanUpdates = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined))

    await updateDoc(doc(db, "orders", orderId), cleanUpdates)
  } catch (error: any) {
    throw new Error(`Failed to update order: ${error.message}`)
  }
}
