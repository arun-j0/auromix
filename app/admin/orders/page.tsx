"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Package, Plus, Search, Eye, Edit, Calendar, Building2, Clock } from "lucide-react"
import { getAllOrders, type Order } from "@/lib/orders"
import Link from "next/link"
import { format } from "date-fns"

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  ready_for_review: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  delivered: "bg-purple-100 text-purple-800",
}

export default function OrdersPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState("")
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
          await loadOrders()
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadOrders = async () => {
    try {
      const ordersData = await getAllOrders()
      setOrders(ordersData)
      setFilteredOrders(ordersData)
    } catch (error) {
      console.error("Error loading orders:", error)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.trim() === "") {
      setFilteredOrders(orders)
    } else {
      const filtered = orders.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(term.toLowerCase()) ||
          order.clientCompanyName.toLowerCase().includes(term.toLowerCase()) ||
          order.notes.toLowerCase().includes(term.toLowerCase()),
      )
      setFilteredOrders(filtered)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={5} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">Manage all orders and track progress</p>
          </div>
          <Link href="/admin/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders by number, company, or notes..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  All Status
                </Button>
                <Button variant="outline" size="sm">
                  This Week
                </Button>
                <Button variant="outline" size="sm">
                  Overdue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                      <Badge className={statusColors[order.status]}>
                        {order.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{order.clientCompanyName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>{order.totalQuantity} items</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {format(order.dueDate, "MMM dd, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Created: {format(order.createdAt, "MMM dd, yyyy")}</span>
                      </div>
                    </div>

                    {order.notes && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{order.notes}</p>}

                    {/* Products Summary */}
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {order.products.slice(0, 3).map((product, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {product.name} ({product.quantity})
                          </Badge>
                        ))}
                        {order.products.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{order.products.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/admin/orders/${order.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "No orders match your search criteria." : "Get started by creating your first order."}
              </p>
              {!searchTerm && (
                <Link href="/admin/orders/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Order
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
