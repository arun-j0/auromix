"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import {
  Bell,
  CheckCircle,
  Clock,
  User,
  Package,
  ClipboardList,
  DollarSign,
  Truck,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  getUserNotifications,
  markNotificationAsRead,
  type Notification,
} from "@/lib/notifications";
import Link from "next/link";

export default function EmployeeNotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== "employee") {
            router.push("/");
            return;
          }
          setUser({ ...firebaseUser, ...userData });
          await loadNotifications(firebaseUser.uid);
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadNotifications = async (userId: string) => {
    try {
      const notificationsData = await getUserNotifications(userId);
      setNotifications(notificationsData);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      await loadNotifications(user.uid);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return ClipboardList;
      case "order":
        return Package;
      case "user":
        return User;
      case "payment":
        return DollarSign;
      case "delivery":
        return Truck;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return "text-gray-600";

    switch (type) {
      case "assignment":
        return "text-blue-600";
      case "order":
        return "text-green-600";
      case "user":
        return "text-purple-600";
      case "payment":
        return "text-yellow-600";
      case "delivery":
        return "text-indigo-600";
      default:
        return "text-gray-600";
    }
  };

  const getPriorityLevel = (notification: Notification) => {
    if (
      notification.type === "assignment" &&
      notification.message.includes("approved")
    ) {
      return "high";
    }
    if (
      notification.type === "assignment" &&
      notification.message.includes("rejected")
    ) {
      return "high";
    }
    if (
      notification.type === "assignment" &&
      notification.message.includes("assigned")
    ) {
      return "medium";
    }
    if (notification.type === "payment") {
      return "medium";
    }
    return "normal";
  };

  const getActionButton = (notification: Notification) => {
    if (
      notification.type === "assignment" &&
      notification.message.includes("approved")
    ) {
      return (
        <Link href="/employee/tasks">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Calendar className="h-4 w-4 mr-2" />
            View Tasks
          </Button>
        </Link>
      );
    }
    if (
      notification.type === "assignment" &&
      notification.message.includes("assigned")
    ) {
      return (
        <Link href="/employee/tasks">
          <Button size="sm" variant="outline" className="bg-white">
            <ClipboardList className="h-4 w-4 mr-2" />
            View Assignment
          </Button>
        </Link>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const highPriorityCount = notifications.filter(
    (n) => !n.isRead && getPriorityLevel(n) === "high"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              Stay updated with your tasks and payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {highPriorityCount > 0 && (
              <Badge variant="destructive" className="bg-red-600">
                {highPriorityCount} Urgent
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {unreadCount} Unread
            </Badge>
          </div>
        </div>

        {/* High Priority Notifications */}
        {highPriorityCount > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  You have {highPriorityCount} urgent notification
                  {highPriorityCount > 1 ? "s" : ""} requiring attention
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const iconColor = getNotificationColor(
              notification.type,
              notification.isRead
            );
            const priority = getPriorityLevel(notification);
            const actionButton = getActionButton(notification);

            return (
              <Card
                key={notification.id}
                className={`bg-white hover:shadow-lg transition-shadow ${
                  !notification.isRead ? "border-l-4 border-l-blue-600" : ""
                } ${priority === "high" ? "ring-2 ring-red-200" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`p-2 rounded-full ${
                          !notification.isRead ? "bg-blue-100" : "bg-gray-100"
                        } ${priority === "high" ? "bg-red-100" : ""}`}
                      >
                        <Icon
                          className={`h-4 w-4 ${iconColor} ${
                            priority === "high" ? "text-red-600" : ""
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={`font-medium ${
                              !notification.isRead
                                ? "text-gray-900"
                                : "text-gray-700"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {priority === "high" && (
                            <Badge variant="destructive" className="text-xs">
                              URGENT
                            </Badge>
                          )}
                          {priority === "medium" && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-yellow-50 text-yellow-700"
                            >
                              IMPORTANT
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            {notification.createdAt.toLocaleDateString()} at{" "}
                            {notification.createdAt.toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {notification.type.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {actionButton}
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
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {notifications.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-600 mb-4">
                You're all caught up! New notifications will appear here when
                you receive new tasks or updates.
              </p>
              <Link href="/employee/tasks">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  View My Tasks
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
