"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, query, getDocs, orderBy, limit } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Building2, Users, Package, ClipboardList, AlertCircle, CheckCircle, Plus } from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalCompanies: number
  totalUsers: number
  totalOrders: number
  pendingAssignments: number
  completedToday: number
  overdueItems: number
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalUsers: 0,
    totalOrders: 0,
    pendingAssignments: 0,
    completedToday: 0,
    overdueItems: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
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
          await loadDashboardData()
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadDashboardData = async () => {
    try {
      // Load companies count
      const companiesSnapshot = await getDocs(collection(db, "companies"))

      // Load users count
      const usersSnapshot = await getDocs(collection(db, "users"))

      // Load orders count
      const ordersSnapshot = await getDocs(collection(db, "orders"))

      // Load assignments count
      const assignmentsSnapshot = await getDocs(collection(db, "assignments"))

      // Load recent orders
      const recentOrdersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(5))
      const recentOrdersSnapshot = await getDocs(recentOrdersQuery)
      const recentOrdersData = recentOrdersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      }))

      setStats({
        totalCompanies: companiesSnapshot.size,
        totalUsers: usersSnapshot.size,
        totalOrders: ordersSnapshot.size,
        pendingAssignments: assignmentsSnapshot.size,
        completedToday: 0, // TODO: Calculate based on today's completions
        overdueItems: 0, // TODO: Calculate based on overdue items
      })

      setRecentOrders(recentOrdersData)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  const statCards = [
    {
      title: "Total Companies",
      value: stats.totalCompanies,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: "/admin/companies",
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
      href: "/admin/users",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      href: "/admin/orders",
    },
    {
      title: "Pending Assignments",
      value: stats.pendingAssignments,
      icon: ClipboardList,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      href: "/admin/assignments",
    },
    {
      title: "Completed Today",
      value: stats.completedToday,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Overdue Items",
      value: stats.overdueItems,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={5} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/orders/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Rest of the dashboard content remains the same */}
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

        {/* Recent Orders and Quick Actions remain the same */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest orders in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{order.clientCompanyName}</p>
                        <p className="text-xs text-gray-500">{order.createdAt?.toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline">{order.status || "Pending"}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No orders yet</p>
                )}
              </div>
              <div className="mt-4">
                <Link href="/admin/orders">
                  <Button variant="outline" className="w-full bg-transparent">
                    View All Orders
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/admin/companies/new">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Building2 className="mr-2 h-4 w-4" />
                    Add New Company
                  </Button>
                </Link>
                <Link href="/admin/users/new">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Users className="mr-2 h-4 w-4" />
                    Add New User
                  </Button>
                </Link>
                <Link href="/admin/orders/new">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <Package className="mr-2 h-4 w-4" />
                    Create New Order
                  </Button>
                </Link>
                <Link href="/admin/approvals">
                  <Button variant="outline" className="w-full justify-start bg-transparent">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Review Approvals
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
