"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { getDashboardRoute } from "@/lib/auth"

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUser({ ...firebaseUser, ...userData })

          // Redirect to appropriate dashboard
          const dashboardRoute = getDashboardRoute(userData.role)
          router.push(dashboardRoute)
        }
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome to Auromix</CardTitle>
          <CardDescription>Inventory & Order Management System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => router.push("/auth/login")} className="w-full" size="lg">
            Login to Continue
          </Button>
          <Button onClick={() => router.push("/auth/signup")} variant="outline" className="w-full" size="lg">
            Create Account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
