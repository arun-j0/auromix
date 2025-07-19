"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createAssignment } from "@/lib/assignments"
import { getEmployeesByAgent } from "@/lib/users"
import { getAllOrders, type Order } from "@/lib/orders"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NewAssignmentPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState("")
  const [employees, setEmployees] = useState<any[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [formData, setFormData] = useState({
    orderId: "",
    productId: "",
    employeeId: "",
    deadline: "",
    notes: "",
  })
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.role !== "agent") {
            router.push("/")
            return
          }
          setUser({ ...firebaseUser, ...userData })
          await loadData(firebaseUser.uid)
        }
      } else {
        router.push("/auth/login")
      }
      setPageLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadData = async (agentId: string) => {
    try {
      const [employeesData, ordersData] = await Promise.all([getEmployeesByAgent(agentId), getAllOrders()])
      setEmployees(employeesData)
      setOrders(ordersData.filter((order) => order.status === "pending"))
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  const handleOrderChange = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    setSelectedOrder(order || null)
    setFormData((prev) => ({
      ...prev,
      orderId,
      productId: "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!selectedOrder) {
        throw new Error("Please select an order")
      }

      const selectedProduct = selectedOrder.products.find((p) => p.id === formData.productId)
      if (!selectedProduct) {
        throw new Error("Please select a product")
      }

      const selectedEmployee = employees.find((e) => e.uid === formData.employeeId)
      if (!selectedEmployee) {
        throw new Error("Please select an employee")
      }

      await createAssignment({
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productSpecs: selectedProduct.specifications,
        quantity: selectedProduct.quantity,
        agentId: user.uid,
        agentName: user.name,
        employeeId: selectedEmployee.uid,
        employeeName: selectedEmployee.name,
        assignedBy: user.uid,
        assignedByName: user.name,
        status: "pending", // Requires admin approval
        deadline: new Date(formData.deadline),
        notes: formData.notes,
      })

      toast({
        title: "Assignment Created",
        description: `Assignment has been sent for admin approval.`,
      })

      router.push("/agent/assignments")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/agent/assignments">
            <Button variant="outline" size="sm" className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Assignment</h1>
            <p className="text-gray-600">Assign a task to one of your employees</p>
          </div>
        </div>

        <div className="max-w-2xl">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
              <CardDescription>Select an order and assign it to an employee</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="order">Select Order *</Label>
                  <Select onValueChange={handleOrderChange}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select an order" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          {order.orderNumber} - {order.clientCompanyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedOrder && (
                  <div className="space-y-2">
                    <Label htmlFor="product">Select Product *</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, productId: value }))}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {selectedOrder.products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (Qty: {product.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="employee">Assign to Employee *</Label>
                  <Select
                    value={formData.employeeId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, employeeId: value }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {employees.map((employee) => (
                        <SelectItem key={employee.uid} value={employee.uid}>
                          {employee.name} ({employee.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline *</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                    required
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any additional instructions or notes..."
                    rows={3}
                    className="bg-white"
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Assignment
                  </Button>
                  <Link href="/agent/assignments">
                    <Button type="button" variant="outline" className="bg-white">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
