import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { user } = await auth.getCurrentUser()
        if (user) {
          setUser(user)
          await loadUserProfile(user.id)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await loadUserProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await db.getUserProfile(userId)
      if (error) {
        console.error('Error loading user profile:', error)
        return
      }
      setProfile(data)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const signUp = async (email, password, userData) => {
    try {
      setLoading(true)
      const { data, error } = await auth.signUp(email, password, userData)
      
      if (error) {
        toast.error(error.message)
        return { error }
      }

      if (data.user) {
        // Create user profile
        const profileData = {
          id: data.user.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role || 'staff',
          clinic_id: userData.clinic_id || null
        }

        const { error: profileError } = await db.createUserProfile(profileData)
        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }

        toast.success('Account created successfully!')
      }

      return { data, error }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await auth.signIn(email, password)
      
      if (error) {
        toast.error(error.message)
        return { error }
      }

      toast.success('Signed in successfully!')
      return { data, error }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await auth.signOut()
      
      if (error) {
        toast.error(error.message)
        return { error }
      }

      setUser(null)
      setProfile(null)
      toast.success('Signed out successfully!')
      return { error }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates) => {
    try {
      if (!user) return { error: new Error('No user logged in') }

      const { data, error } = await db.updateUserProfile(user.id, updates)
      
      if (error) {
        toast.error('Failed to update profile')
        return { error }
      }

      setProfile(data)
      toast.success('Profile updated successfully!')
      return { data, error }
    } catch (error) {
      toast.error('An unexpected error occurred')
      return { error }
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile: () => user ? loadUserProfile(user.id) : null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}