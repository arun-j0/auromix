"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Bell, CheckCircle, Clock, User, Package, ClipboardList } from "lucide-react"
import { getUserNotifications, markNotificationAsRead, type Notification } from "@/lib/notifications"

export default function AdminNotificationsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.role !== "admin") {
            router.push("/")
            return
          }
          setUser({ ...firebaseUser, ...userData })
          await loadNotifications(firebaseUser.uid)
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadNotifications = async (userId: string) => {
    try {
      const notificationsData = await getUserNotifications(userId)
      setNotifications(notificationsData)
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId)
      await loadNotifications(user.uid)
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return ClipboardList
      case "order":
        return Package
      case "user":
        return User
      default:
        return Bell
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Stay updated with system activities</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {notifications.filter((n) => !n.isRead).length} Unread
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type)
            return (
              <Card
                key={notification.id}
                className={`bg-white hover:shadow-lg transition-shadow ${!notification.isRead ? "border-l-4 border-l-blue-600" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${!notification.isRead ? "bg-blue-100" : "bg-gray-100"}`}>
                        <Icon className={`h-4 w-4 ${!notification.isRead ? "text-blue-600" : "text-gray-600"}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}>
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            {notification.createdAt.toLocaleDateString()} at{" "}
                            {notification.createdAt.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <Button
                        onClick={() => handleMarkAsRead(notification.id)}
                        variant="outline"
                        size="sm"
                        className="bg-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {notifications.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600">You're all caught up! New notifications will appear here.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
