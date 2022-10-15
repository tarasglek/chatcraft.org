// blank typescript react component
import { useState, useEffect } from 'react';
import {createClient} from '@supabase/supabase-js'

const supabase = createClient(
    'https://nlinballxabddqvmfiqc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saW5iYWxseGFiZGRxdm1maXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjU1OTQ2MTksImV4cCI6MTk4MTE3MDYxOX0.HdIauGMRvfBSxJhp5SZnfgNDH1vM1SlIk4RuzkNbiTo'
)

async function getUsername() {
    let {data} = await supabase.auth.getSession()
    if (data.session) {
        return data.session.user.user_metadata.user_name
    }
    return null
}

const LOCAL_STORAGE_REDIRECT = "supabase.redirect"
export async function login() {
    let location = window.location.toString()
    localStorage.setItem(LOCAL_STORAGE_REDIRECT, location)
    return supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
        redirectTo: '' + location
        }
    })
}

export async function logout() {
    console.log('logout')
    return supabase.auth.signOut()
}

export interface Session {
    username?: string
    savedURL?: string
}

export function useSession(): Session {
    let [user, setUser] = useState<string | undefined>(undefined)
    let [savedURL, setSavedURL] = useState<string | undefined>(undefined)

    
    async function fetchUser() {
        setUser(await getUsername())
    }

    useEffect(() => {

        fetchUser()
        // register and unregister callback to update user when auth changes
        let {data} = supabase.auth.onAuthStateChange(async (e, session) => {
            console.log('auth state changed', e, session)

            if (e == 'SIGNED_IN') {
                let savedURL = localStorage.getItem(LOCAL_STORAGE_REDIRECT)
                if (savedURL) {
                    localStorage.removeItem(LOCAL_STORAGE_REDIRECT)
                    console.log('redirecting to "' + savedURL + '"')
                    // window.history.pushState({}, '', savedURL)
                    // setSavedURL(savedURL)
                }
            }            
            fetchUser()
        })
        return () => {
            data.subscription.unsubscribe()
        }
    }, [])
    return {
        username: user,
        savedURL: savedURL
    }
}