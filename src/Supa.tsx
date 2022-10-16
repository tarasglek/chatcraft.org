// blank typescript react component
import { useState, useEffect } from 'react';
import {createClient} from '@supabase/supabase-js'

export const supabase = createClient(
    'https://nlinballxabddqvmfiqc.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5saW5iYWxseGFiZGRxdm1maXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjU1OTQ2MTksImV4cCI6MTk4MTE3MDYxOX0.HdIauGMRvfBSxJhp5SZnfgNDH1vM1SlIk4RuzkNbiTo'
)

async function getUsername() {
    let {data} = await supabase.auth.getSession()
    if (data.session) {
        return {
            userId: data.session.user.id,
            username: data.session.user.user_metadata.user_name
        }
    }
    return null
}

const LOCAL_STORAGE_REDIRECT = "supabase.redirect"

/**
 * Supabase doesn't return is to correct hash when we come back from github
 * so we have to save it in local storage and then can use it as default redirect
 */
export async function login(defaultRedirect: string) {
    let location = window.location.toString()
    localStorage.setItem(LOCAL_STORAGE_REDIRECT, defaultRedirect)
    return supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
        redirectTo: location
        }
    })
}

export async function logout() {
    return supabase.auth.signOut()
}

export interface Session {
    username?: string
    savedURL?: string
    userId?: string
}

export function getRedirectURL(defaultURL: string) {
    let savedURLinStorage = localStorage.getItem(LOCAL_STORAGE_REDIRECT)
    if (savedURLinStorage) {
        return savedURLinStorage
    }
    return defaultURL
}

/** clear redirect url from local storage once we have used it */
export function clearRedirectURL(redirectURL: string) {
    if (redirectURL === localStorage.getItem(LOCAL_STORAGE_REDIRECT)) {
        localStorage.removeItem(LOCAL_STORAGE_REDIRECT)
    }
}

export function useSession(): Session {
    let [username, setUsername] = useState<string | undefined>(undefined)
    let [userId, setUserId] = useState<string | undefined>(undefined)
    let [savedURL, setSavedURL] = useState<string | undefined>(undefined)

    
    async function fetchUser() {
        let info = await getUsername()
        if (info) {
            setUsername(info.username)
            setUserId(info.userId)
        }
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
        username: username,
        userId: userId,
        savedURL: savedURL
    }
}