import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helpers
export const auth = {
  signUp: async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers
export const db = {
  // Clinics
  getClinics: async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  createClinic: async (clinicData) => {
    const { data, error } = await supabase
      .from('clinics')
      .insert([clinicData])
      .select()
      .single()
    return { data, error }
  },

  getClinic: async (id) => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // User Profiles
  getUserProfile: async (userId) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, clinic:clinics(*)')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  createUserProfile: async (profileData) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert([profileData])
      .select()
      .single()
    return { data, error }
  },

  updateUserProfile: async (userId, updates) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  // Documents
  getDocuments: async (clinicId, filters = {}) => {
    let query = supabase
      .from('documents')
      .select(`
        *,
        created_by_profile:user_profiles!documents_created_by_fkey(first_name, last_name),
        signed_by_profile:user_profiles!documents_signed_by_fkey(first_name, last_name)
      `)
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    const { data, error } = await query
    return { data, error }
  },

  getDocument: async (id) => {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        *,
        created_by_profile:user_profiles!documents_created_by_fkey(first_name, last_name),
        signed_by_profile:user_profiles!documents_signed_by_fkey(first_name, last_name),
        clinic:clinics(name, state)
      `)
      .eq('id', id)
      .single()
    return { data, error }
  },

  createDocument: async (documentData) => {
    const { data, error } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single()
    return { data, error }
  },

  updateDocument: async (id, updates) => {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Risks
  getRisks: async (clinicId) => {
    const { data, error } = await supabase
      .from('risks')
      .select('*, owner:user_profiles(first_name, last_name)')
      .eq('clinic_id', clinicId)
      .order('risk_score', { ascending: false })
    return { data, error }
  },

  createRisk: async (riskData) => {
    const { data, error } = await supabase
      .from('risks')
      .insert([riskData])
      .select()
      .single()
    return { data, error }
  },

  updateRisk: async (id, updates) => {
    const { data, error } = await supabase
      .from('risks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Audits
  createAudit: async (auditData) => {
    const { data, error } = await supabase
      .from('audits')
      .insert([auditData])
      .select()
      .single()
    return { data, error }
  },

  getDocumentAudits: async (documentId) => {
    const { data, error } = await supabase
      .from('audits')
      .select('*, audited_by_profile:user_profiles(first_name, last_name)')
      .eq('document_id', documentId)
      .order('audited_at', { ascending: false })
    return { data, error }
  }
}