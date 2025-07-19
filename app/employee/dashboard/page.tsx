"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { ClipboardList, CheckCircle, Clock, AlertCircle, User, Calendar } from "lucide-react"
import Link from "next/link"
import { getUser } from "@/lib/users"
import { getAssignmentsByEmployee } from "@/lib/assignments"

interface EmployeeStats {
  assignedTasks: number
  completedTasks: number
  pendingTasks: number
  overdueItems: number
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [agent, setAgent] = useState<any>(null)
  const [stats, setStats] = useState<EmployeeStats>({
    assignedTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueItems: 0,
  })
  const [myTasks, setMyTasks] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.role !== "employee") {
              router.push("/")
              return
            }

            const userWithData = {
              ...firebaseUser,
              ...userData,
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
            }
            setUser(userWithData)

            // Load agent info if assigned
            if (userData.agentId) {
              try {
                const agentData = await getUser(userData.agentId)
                setAgent(agentData)
              } catch (error) {
                console.error("Error loading agent:", error)
              }
            }

            await loadDashboardData(firebaseUser.uid)
          } else {
            router.push("/auth/login")
          }
        } catch (error) {
          console.error("Error loading user data:", error)
          router.push("/auth/login")
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadDashboardData = async (employeeId: string) => {
    try {
      // Load assignments for this employee
      const assignmentsData = await getAssignmentsByEmployee(employeeId)

      const completedTasks = assignmentsData.filter((task) => task.status === "completed")
      const pendingTasks = assignmentsData.filter(
        (task) => task.status === "pending" || task.status === "approved" || task.status === "in_progress",
      )
      const overdueTasks = assignmentsData.filter(
        (task) => task.deadline && task.deadline < new Date() && task.status !== "completed",
      )

      setStats({
        assignedTasks: assignmentsData.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        overdueItems: overdueTasks.length,
      })

      setMyTasks(assignmentsData.slice(0, 5)) // Show only recent 5 tasks
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const statCards = [
    {
      title: "Assigned Tasks",
      value: stats.assignedTasks,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: "/employee/tasks",
    },
    {
      title: "Completed Tasks",
      value: stats.completedTasks,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      href: "/employee/history",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      href: "/employee/tasks",
    },
    {
      title: "Overdue Items",
      value: stats.overdueItems,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      href: "/employee/tasks?status=overdue",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "approved":
        return "bg-blue-100 text-blue-800"
      case "in_progress":
        return "bg-purple-100 text-purple-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={2} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}</p>
            {agent && <p className="text-sm text-blue-600">Managed by: {agent.name}</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  {stat.href && (
                    <div className="mt-4">
                      <Link href={stat.href}>
                        <Button variant="outline" size="sm" className="w-full bg-transparent">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* My Tasks and Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>My Recent Tasks</CardTitle>
                <CardDescription>Your latest task assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myTasks.length > 0 ? (
                    myTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.productName || "Task Assignment"}</h4>
                          <p className="text-sm text-gray-600">{task.productSpecs || "No description"}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {task.deadline?.toLocaleDateString() || "No deadline"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Assigned: {task.createdAt?.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status?.replace("_", " ").toUpperCase() || "PENDING"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <ClipboardList className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">No tasks assigned yet</p>
                    </div>
                  )}
                </div>
                {myTasks.length > 0 && (
                  <div className="mt-4">
                    <Link href="/employee/tasks">
                      <Button variant="outline" className="w-full bg-transparent">
                        View All Tasks
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  {user.phone && (
                    <div className="text-sm text-gray-600">
                      <strong>Phone:</strong> {user.phone}
                    </div>
                  )}

                  {agent && (
                    <div className="text-sm text-gray-600">
                      <strong>Supervisor:</strong> {agent.name}
                    </div>
                  )}

                  {user.skills && user.skills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {user.skills.map((skill: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    <p>Member since: {user.createdAt?.toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
