"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Loader2, Plus, X } from "lucide-react"
import { createUser } from "@/lib/users"
import { notifyUserCreated } from "@/lib/notifications"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NewEmployeePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    skills: [] as string[],
    isActive: true,
  })
  const [newSkill, setNewSkill] = useState("")
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
        }
      } else {
        router.push("/auth/login")
      }
      setPageLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      skills: [],
      isActive: true,
    })
    setNewSkill("")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const userData: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: "employee" as const,
        agentId: user.uid, // Assign to current agent
      }

      // Only add optional fields if they have values
      if (formData.phone && formData.phone.trim() !== "") {
        userData.phone = formData.phone.trim()
      }

      if (formData.skills.length > 0) {
        userData.skills = formData.skills
      }

      const newUser = await createUser(userData)

      // Send welcome notification to the new user
      await notifyUserCreated(newUser.uid, {
        role: "employee",
        name: formData.name,
      })

      toast({
        title: "Employee Added Successfully!",
        description: `${formData.name} has been added to your team.`,
      })

      resetForm()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }))
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }))
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
          <Link href="/agent/employees">
            <Button variant="outline" size="sm" className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Employees
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
            <p className="text-gray-600">Add a new employee to your team</p>
          </div>
        </div>

        <div className="max-w-2xl">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
              <CardDescription>Enter the details for the new employee</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                      required
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      required
                      minLength={6}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-4">
                  <Label>Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      className="bg-white"
                    />
                    <Button type="button" onClick={addSkill} variant="outline" className="bg-white">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active Employee</Label>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Employee
                  </Button>
                  <Link href="/agent/employees">
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
