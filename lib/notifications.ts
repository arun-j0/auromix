import { db } from "./firebase"
import { collection, doc, setDoc, getDocs, updateDoc, query, where, orderBy, Timestamp } from "firebase/firestore"

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  isRead: boolean
  createdAt: Date
  data?: any
}

export const createNotification = async (notificationData: Omit<Notification, "id" | "createdAt">) => {
  try {
    const notificationRef = doc(collection(db, "notifications"))
    const notification: Notification = {
      ...notificationData,
      id: notificationRef.id,
      createdAt: new Date(),
    }

    await setDoc(notificationRef, {
      ...notification,
      createdAt: Timestamp.fromDate(notification.createdAt),
    })

    return notification
  } catch (error: any) {
    throw new Error(`Failed to create notification: ${error.message}`)
  }
}

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    )
    const notificationsSnapshot = await getDocs(notificationsQuery)

    return notificationsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Notification
    })
  } catch (error: any) {
    throw new Error(`Failed to get user notifications: ${error.message}`)
  }
}

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      isRead: true,
    })
  } catch (error: any) {
    throw new Error(`Failed to mark notification as read: ${error.message}`)
  }
}

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("isRead", "==", false),
    )
    const notificationsSnapshot = await getDocs(notificationsQuery)
    return notificationsSnapshot.size
  } catch (error: any) {
    console.error("Failed to get unread notification count:", error)
    return 0
  }
}

// Helper functions for specific notification types
export const notifyUserCreated = async (userId: string, data: { role: string; name: string }) => {
  return createNotification({
    userId,
    title: "Welcome to Auromix!",
    message: `Your ${data.role} account has been created successfully. Welcome to the team!`,
    type: "success",
    isRead: false,
    data,
  })
}

export const notifyOrderAssigned = async (
  userId: string,
  data: { id: string; orderNumber: string; productName: string },
) => {
  return createNotification({
    userId,
    title: "New Order Assigned",
    message: `Order ${data.orderNumber} (${data.productName}) has been assigned to you.`,
    type: "info",
    isRead: false,
    data,
  })
}

export const notifyAssignmentApproved = async (userId: string, data: { assignmentId: string; productName: string }) => {
  return createNotification({
    userId,
    title: "Assignment Approved",
    message: `Your assignment for ${data.productName} has been approved and is ready to start.`,
    type: "success",
    isRead: false,
    data,
  })
}

export const notifyAssignmentRejected = async (
  userId: string,
  data: { assignmentId: string; productName: string; reason: string },
) => {
  return createNotification({
    userId,
    title: "Assignment Rejected",
    message: `Your assignment for ${data.productName} has been rejected. Reason: ${data.reason}`,
    type: "error",
    isRead: false,
    data,
  })
}
