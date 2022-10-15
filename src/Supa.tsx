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
    localStorage.setItem(LOCAL_STORAGE_REDIRECT, currentHashRouterLocation())
    return supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
        redirectTo: '' + location
        }
    })
}

export async function logout() {
    return supabase.auth.signOut()
}

export interface Session {
    username?: string
    savedURL?: string
}

function currentHashRouterLocation() {
    return window.location.hash.substring(1)
}

export function getRedirectURL(defaultURL: string) {
    let savedURLinStorage = localStorage.getItem(LOCAL_STORAGE_REDIRECT)
    if (savedURLinStorage) {
        if (currentHashRouterLocation() == savedURLinStorage) {
            localStorage.removeItem(LOCAL_STORAGE_REDIRECT)
            return defaultURL
        }
        return savedURLinStorage
    }
    return defaultURL
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
            // console.log('auth state changed', e, session)
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